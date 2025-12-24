import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { supabase } from '../db';
import { linkedInService } from '../services/linkedin.service';
import { newsService } from '../services/news.service';
import { geminiService } from '../services/gemini.service';
import { Platform, PostStatus, LogLevel } from '../constants';
import { mockStore } from '../store';
import { EmailService } from '../services/email.service';

export class AutomationController {
  
  private useMockDb = process.env.USE_MOCK_DB === 'true' || process.env.SUPABASE_URL?.includes('placeholder');
  private emailService = new EmailService();

  // 1. Save Configuration
  saveConfig = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      const { niches, keywords, tone_profile, schedule_cron, require_approval } = req.body;

      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      if (this.useMockDb) {
         const existingIndex = mockStore.configs.findIndex(c => c.user_id === user_id);
         const newConfig = { user_id, niches, keywords, tone_profile, schedule_cron, require_approval, is_active: true };
         if (existingIndex >= 0) mockStore.configs[existingIndex] = newConfig;
         else mockStore.configs.push(newConfig);
         return res.json({ success: true, config: newConfig });
      }

      const { data, error } = await supabase
        .from('automation_configs')
        .upsert({
          user_id,
          platform: Platform.LINKEDIN,
          niches,
          keywords,
          tone_profile,
          schedule_cron,
          require_approval,
          is_active: true
        }, { onConflict: 'user_id, platform' })
        .select()
        .single();

      if (error) throw error;

      res.json({ success: true, config: data });
    } catch (error: any) {
      console.error('saveConfig error', error);
      res.status(500).json({ error: error.message });
    }
  }

  // 2. Ingest Trends (from n8n)
  ingestTrend = async (req: Request, res: Response) => {
    // ... (Keep existing implementation or add mock fallback if needed)
    // For brevity, assuming this is mostly n8n usage
    res.json({ success: true });
  }

  // NEW: Scan Real Trends
  scanTrends = async (req: AuthRequest, res: Response) => {
      try {
          const user_id = req.user?.id;
          if (!user_id) return res.status(401).json({ error: "Unauthorized" });
          
          let niches = ['Technology', 'Business'];

          if (!this.useMockDb) {
              const { data: config } = await supabase
                .from('automation_configs')
                .select('niches')
                .eq('user_id', user_id)
                .eq('platform', Platform.LINKEDIN)
                .single();
              if (config?.niches) niches = config.niches;
          } else {
             const conf = mockStore.configs.find(c => c.user_id === user_id);
             if (conf?.niches) niches = conf.niches;
          }
            
          const query = niches.join(' OR ');
          console.log(`[SCAN] Fetching news for: ${query}`);

          // 2. Fetch News (Real)
          const newsItems = await newsService.fetchNews(query);
          
          if (newsItems.length === 0) {
              return res.json({ success: true, message: "No new news found", trends: [] });
          }

          // 3. Analyze with Gemini (Real)
          const analyzedTrends = await geminiService.analyzeTrendPotential(newsItems.slice(0, 5)); 

          // 4. Save
          const savedTrends = [];
          for (const trend of analyzedTrends) {
               const trendObj: any = {
                   topic: trend.title,
                   category: trend.category || 'General',
                   velocity_score: trend.velocity_score,
                   source: 'newsdata_io',
                   metadata: { link: trend.link, insight: trend.insight },
                   created_at: new Date().toISOString()
               };

               if (this.useMockDb) {
                   trendObj.id = Math.random().toString(36).substr(2, 9);
                   mockStore.trends.unshift(trendObj);
                   savedTrends.push(trendObj);
               } else {
                   const { data } = await supabase.from('detected_trends').insert(trendObj).select().single();
                   if(data) savedTrends.push(data);
               }
          }

          // 5. Auto-generate drafts
          for (const trend of savedTrends) {
              if (trend.velocity_score > 70) {
                   const draftContent = await geminiService.generateDraft(trend.topic, trend.metadata.insight);
                   
                   const postObj: any = {
                       user_id,
                       content: draftContent,
                       trend_id: trend.id,
                       status: PostStatus.NEEDS_APPROVAL,
                       created_at: new Date().toISOString()
                   };

                   if (this.useMockDb) {
                       postObj.id = Math.random().toString(36).substr(2, 9);
                       mockStore.posts.unshift(postObj);
                   } else {
                       await supabase.from('generated_posts').insert(postObj);
                   }
              }
          }

          res.json({ success: true, count: savedTrends.length, trends: savedTrends });

      } catch (error: any) {
          console.error("Scan failed:", error);
          res.status(500).json({ error: error.message });
      }
  }

  // 3. Create Draft Post (from n8n AI Agent)
  createDraft = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      
      let { content, trend_id } = req.body;
      
      // Auto-generate if missing
      if (!content) {
          if (this.useMockDb) {
             content = `[AI Generated] Draft for trend ${trend_id}. Typically this would be generated by Gemini based on the trend analysis.`;
          } else {
             const { data: trend } = await supabase.from('detected_trends').select('*').eq('id', trend_id).single();
             if (trend) {
                 content = await geminiService.generateDraft(trend.topic, trend.metadata?.insight || 'No context');
             } else {
                 content = "Draft generated from unknown trend.";
             }
          }
      }

      if (this.useMockDb) {
          const post = {
              id: Math.random().toString(36).substr(2, 9),
              user_id, content, trend_id, 
              status: PostStatus.NEEDS_APPROVAL,
              created_at: new Date().toISOString()
          };
          mockStore.posts.unshift(post);

          // Mock Email Trigger
          if (req.user?.email) {
            await this.emailService.sendApprovalRequest(
                req.user.email, 
                content.substring(0, 50) + "...", 
                "http://localhost:3000"
            );
          }

          return res.json({ success: true, post });
      }
      
      // Check config to see if approval is required
      const { data: config } = await supabase
        .from('automation_configs')
        .select('require_approval')
        .eq('user_id', user_id)
        .eq('platform', Platform.LINKEDIN)
        .single();
        
      // Default to NEEDS_APPROVAL for safety if config is missing
      const status = (config?.require_approval !== false) ? PostStatus.NEEDS_APPROVAL : PostStatus.SCHEDULED;
      
      const { data, error } = await supabase
        .from('generated_posts')
        .insert({
          user_id,
          content,
          trend_id,
          status,
          platform_post_id: null // Not posted yet
        })
        .select()
        .single();

      if (error) throw error;

      // Check notification preference in Profile
      if (status === PostStatus.NEEDS_APPROVAL) {
          const { data: profile } = await supabase
             .from('profiles')
             .select('notification_preferences, email')
             .eq('id', user_id)
             .single();
          
          if (profile?.email && (profile.notification_preferences as any)?.post_approval) {
             await this.emailService.sendApprovalRequest(
                 profile.email, 
                 content.substring(0, 50) + "...", 
                 process.env.APP_URL || 'http://localhost:3000'
             );
          }
      }

      // Log it
      await supabase.from('automation_logs').insert({
        user_id,
        action: 'draft_created',
        level: LogLevel.INFO,
        message: `Created draft for user ${user_id}`,
        metadata: { draft_id: data.id }
      });

      res.json({ success: true, post: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // 4. Trigger Posting (Webhook or User Action)
  triggerPost = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      const { post_id } = req.body;
      
      if (this.useMockDb) {
          const postIndex = mockStore.posts.findIndex(p => p.id === post_id);
          if (postIndex === -1 && post_id) return res.status(404).json({error: "Post not found"});
          
          // Execute Posting via Service (MOCK)
          const result = await linkedInService.createPost(user_id, mockStore.posts[postIndex].content);
          
          mockStore.posts[postIndex].status = PostStatus.PUBLISHED;
          mockStore.posts[postIndex].platform_post_id = result.id;
          mockStore.posts[postIndex].published_at = new Date().toISOString();
          
          return res.json({ success: true, platform_response: result });
      }

      // Fetch post ensuring it belongs to user
      const { data: post, error: fetchError } = await supabase
        .from('generated_posts')
        .select('*')
        .eq('id', post_id)
        .eq('user_id', user_id) 
        .single();

      if (fetchError || !post) throw new Error("Post not found or unauthorized");
      
      if (post.status !== PostStatus.APPROVED && post.status !== PostStatus.SCHEDULED && post.status !== PostStatus.NEEDS_APPROVAL) {
         return res.status(400).json({ error: "Post is not approved for publishing" });
      }

      // Execute Posting via Service
      const result = await linkedInService.createPost(user_id, post.content);
      
      // Update DB
      const { error: updateError } = await supabase
        .from('generated_posts')
        .update({
          status: PostStatus.PUBLISHED,
          platform_post_id: result.id,
          published_at: new Date().toISOString()
        })
        .eq('id', post_id);

      if (updateError) throw updateError;
      
      await supabase.from('automation_logs').insert({
          user_id,
          action: 'post_published',
          level: LogLevel.SUCCESS,
          message: `Published post ${post_id} to LinkedIn`
      });

      res.json({ success: true, platform_response: result });
      
    } catch (error: any) {
      if (!this.useMockDb) {
            await supabase.from('generated_posts').update({ status: PostStatus.FAILED }).eq('id', req.body.post_id);
            await supabase.from('automation_logs').insert({
                user_id: req.body.user_id,
                action: 'post_failed',
                level: LogLevel.ERROR,
                message: error.message
            });
      }
        
      res.status(500).json({ error: error.message || "Unknown error occurred during posting", details: error });
    }
  }

  // 5. Update Post (Edit Draft)
  updatePost = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      const { id } = req.params;
      const { content, scheduled_time } = req.body;

      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      if (this.useMockDb) {
         // Mock update
         const post = mockStore.posts.find(p => p.id === id);
         if (post) {
            if (content) post.content = content;
            if (scheduled_time) post.scheduled_time = scheduled_time;
         }
         return res.json({ success: true, post });
      }

      // Real update
      const { data, error } = await supabase
        .from('generated_posts')
        .update({ content, scheduled_time, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user_id) // Security check
        .select()
        .single();

      if (error) throw error;
      res.json({ success: true, post: data });

    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  // 6. Create Post (Manual)
  createPost = async (req: AuthRequest, res: Response) => {
      try {
          const user_id = req.user?.id;
          if (!user_id) return res.status(401).json({ error: "Unauthorized" });

          console.log(`[CREATE_POST] Attempting to create for User ID: ${user_id}`);
          const { content, scheduled_time, status, trend_id, media_urls } = req.body;

          if (this.useMockDb) {
              console.log('[CREATE_POST] Using Mock DB');
              const post = {
                  id: Math.random().toString(36).substr(2, 9),
                  user_id, content, scheduled_time, status, trend_id, media_urls,
                  created_at: new Date().toISOString()
              };
              mockStore.posts.unshift(post);
              return res.json({ success: true, post });
          }

          console.log('[CREATE_POST] Inserting into Real DB...');
          const { data, error } = await supabase
              .from('generated_posts')
              .insert({
                  user_id,
                  content,
                  scheduled_time,
                  status,
                  trend_id,
                  media_urls // Added
              })
              .select()
              .single();

          if (error) {
             console.error('[CREATE_POST] DB Error:', error);
             throw error;
          }
          res.json({ success: true, post: data });

      } catch (e: any) {
          console.error('[CREATE_POST] Exception:', e);
          res.status(500).json({ error: e.message });
      }
  }

  // 7. Delete Post
  deletePost = async (req: AuthRequest, res: Response) => {
      try {
          const user_id = req.user?.id;
          const { id } = req.params;

          if (!user_id) return res.status(401).json({ error: "Unauthorized" });

          if (this.useMockDb) {
              const index = mockStore.posts.findIndex(p => p.id === id);
              if (index >= 0) mockStore.posts.splice(index, 1);
              return res.json({ success: true });
          }

          const { error } = await supabase
              .from('generated_posts')
              .delete()
              .eq('id', id)
              .eq('user_id', user_id); // Security check

          if (error) throw error;
          res.json({ success: true });

      } catch (e: any) {
          res.status(500).json({ error: e.message });
      }
  }

    // --- TEAM MANAGEMENT ---
    getTeamMembers = async (req: AuthRequest, res: Response) => {
        try {
            const user_id = req.user?.id;
            if (!user_id) return res.status(401).json({ error: "Unauthorized" });

            if (this.useMockDb) {
                // Return dummy team
                return res.json([
                    { id: '1', email: 'you@example.com', role: 'owner', status: 'active', user_id },
                    { id: '2', email: 'editor@example.com', role: 'editor', status: 'active' },
                    { id: '3', email: 'new@example.com', role: 'viewer', status: 'pending' }
                ]);
            }

            // Real DB
            const { data, error } = await supabase
                .from('team_members')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                // If table doesn't exist yet, return empty or self
                if (error.code === '42P01') {
                    return res.json([{ id: 'self', email: req.user?.email || 'user', role: 'owner', status: 'active' }]);
                }
                throw error;
            }

            res.json(data);
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }

    inviteTeamMember = async (req: AuthRequest, res: Response) => {
        try {
            const user_id = req.user?.id;
            if (!user_id) return res.status(401).json({ error: "Unauthorized" });
            const { email, role } = req.body;

            // Generate a join link
            const inviteLink = process.env.FRONTEND_URL ? `${process.env.FRONTEND_URL}/login` : 'http://localhost:3000/login';

            // Send Email
            await this.emailService.sendTeamInvitation(email, role, inviteLink);

            if (this.useMockDb) {
                return res.json({ success: true, message: "Invitation sent via email" });
            }

            // Real DB - Insert pending member Record
            // Note: In production this should be a robust invite system.
            // For MVP, we insert a record linked to the owner so it appears in the list.
            try {
                 await supabase.from('team_members').insert({
                    email, 
                    role, 
                    status: 'pending',
                    invited_by: user_id,
                    user_id: user_id // Linking to self/owner for visibility (MVP hack)
                });
            } catch (dbError) {
                console.warn("Could not save team_member record, but email was sent.", dbError);
            }
            
            res.json({ success: true, message: `Invitation sent to ${email}` });

        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }

    removeTeamMember = async (req: AuthRequest, res: Response) => {
        try {
            const user_id = req.user?.id;
            if (!user_id) return res.status(401).json({ error: "Unauthorized" });
            const { id } = req.params;

            if (this.useMockDb) {
                return res.json({ success: true });
            }

            const { error } = await supabase
                .from('team_members')
                .delete()
                .eq('id', id);

            if (error) throw error;
            res.json({ success: true });
        } catch (e: any) {
            res.status(500).json({ error: e.message });
        }
    }

  // 8. Get Analytics
  getAnalytics = async (req: AuthRequest, res: Response) => {
      try {
          const user_id = req.user?.id;
          if (!user_id) return res.status(401).json({ error: "Unauthorized" });

          const { days = 30 } = req.query;
          const limit = parseInt(days as string) || 30;

          if (this.useMockDb) {
              return res.json({
                  data: Array.from({ length: limit }, (_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() - (limit - i - 1));
                      return {
                          date: d.toISOString().split('T')[0],
                          impressions: Math.floor(Math.random() * 1000) + 100,
                          clicks: Math.floor(Math.random() * 100) + 10,
                          engagement: Math.floor(Math.random() * 50) + 5
                      };
                  })
              });
          }

          const startDate = new Date();
          startDate.setDate(startDate.getDate() - limit);
          
          // Aggregate by date (in case multiple accounts)
          // Since Supabase doesn't do 'group by' easily via JS client without RPC sometimes, 
          // we fetch all rows and aggregate in JS for MVP.
          const { data, error } = await supabase
             .from('analytics_daily')
             .select('date, impressions, clicks, likes, comments, shares')
             .eq('user_id', user_id)
             .gte('date', startDate.toISOString().split('T')[0])
             .order('date', { ascending: true });

          if (error) {
              console.error("Analytics fetch error:", error);
              // Handle "relation does not exist" gracefully if migration missing
              if (error.code === '42P01') {
                  const d = new Date().toISOString().split('T')[0];
                  return res.json({ data: [] }); 
              }
              throw error;
          }

          // Aggregate by date
          const aggregated: Record<string, any> = {};
          data?.forEach((row: any) => {
              if (!aggregated[row.date]) {
                  aggregated[row.date] = { date: row.date, impressions: 0, clicks: 0, engagement: 0 };
              }
              aggregated[row.date].impressions += (row.impressions || 0);
              aggregated[row.date].clicks += (row.clicks || 0);
              aggregated[row.date].engagement += (row.likes + row.comments + row.shares || 0);
          });

          const result = Object.values(aggregated).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          res.json({ data: result });

      } catch (e: any) {
          console.error("getAnalytics Error:", e);
          res.status(500).json({ error: e.message });
      }
  }

  exportAnalytics = async (req: AuthRequest, res: Response) => {
      try {
          const user_id = req.user?.id;
          if (!user_id) return res.status(401).json({ error: "Unauthorized" });

          const limit = 30; // Last 30 days
          const startDate = new Date();
          startDate.setDate(startDate.getDate() - limit);

          let data: any[] = [];

          if (this.useMockDb) {
             // Mock Data Gen
             for(let i=0; i<limit; i++){
                 const d = new Date();
                 d.setDate(d.getDate() - i);
                 data.push({
                     date: d.toISOString().split('T')[0],
                     impressions: Math.floor(Math.random() * 1000),
                     clicks: Math.floor(Math.random() * 50),
                     likes: Math.floor(Math.random() * 20),
                     comments: Math.floor(Math.random() * 5),
                     shares: Math.floor(Math.random() * 3)
                 });
             }
          } else {
             const { data: realData } = await supabase
                 .from('analytics_daily')
                 .select('date, impressions, clicks, likes, comments, shares')
                 .eq('user_id', user_id)
                 .gte('date', startDate.toISOString().split('T')[0])
                 .order('date', { ascending: true });
             data = realData || [];
          }

          // Convert to CSV
          const headers = ['Date', 'Impressions', 'Clicks', 'Likes', 'Comments', 'Shares'];
          const csvRows = [headers.join(',')];

          data.forEach(row => {
              const values = [
                  row.date,
                  row.impressions,
                  row.clicks,
                  row.likes,
                  row.comments,
                  row.shares
              ];
              csvRows.push(values.join(','));
          });

          const csvString = csvRows.join('\n');

          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename="analytics_export_${new Date().toISOString().split('T')[0]}.csv"`);
          res.send(csvString);

      } catch (e: any) {
          res.status(500).json({ error: e.message });
      }
  }

  // --- GETTERS for Frontend ---

  getConfig = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      if (this.useMockDb) {
            const conf = mockStore.configs.find(c => c.user_id === user_id);
            return res.json(conf || {});
        }

      const { data } = await supabase
        .from('automation_configs')
        .select('*')
        .eq('user_id', user_id)
        .eq('platform', Platform.LINKEDIN)
        .single();
      
      res.json(data || {}); 
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

   getTrends = async (req: Request, res: Response) => {
    try {
       const page = parseInt(req.query.page as string) || 1;
       const limit = parseInt(req.query.limit as string) || 20;
       const offset = (page - 1) * limit;

       if (this.useMockDb) {
           return res.json({
               data: mockStore.trends.slice(offset, offset + limit),
               meta: { page, limit, total: mockStore.trends.length } 
           });
       }

       const { category } = req.query;
       
        let query = supabase.from('detected_trends').select('*', { count: 'exact' });
       
        if (category && category !== 'All') {
           // @ts-ignore
           query = query.eq('category', category as string);
        }
       
        const { data, count, error } = await query
         .order('velocity_score', { ascending: false })
         .range(offset, offset + limit - 1);
        
       if (error) {
           console.error("❌ getTrends Supabase Error:", error);
           throw error;
       }
       res.json({ data, meta: { page, limit, total: count } });
    } catch(e: any) { 
         console.error("❌ getTrends Exception:", e);
         res.status(500).json({ error: e.message, details: e }); 
    }
  }

  getPosts = async (req: AuthRequest, res: Response) => {
    try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ error: "Unauthorized" });

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const offset = (page - 1) * limit;
        const { status } = req.query;

        if (this.useMockDb) {
            let posts = mockStore.posts;
            if (status) posts = posts.filter(p => p.status === status);
            return res.json({
                data: posts.slice(offset, offset + limit),
                meta: { page, limit, total: posts.length }
            });
        }

        let query = supabase.from('generated_posts').select('*', { count: 'exact' });
        
        // Filters
        query = query.eq('user_id', user_id);
        if (status) query = query.eq('status', status);
        
        // Sorting & Pagination
        query = query.order('created_at', { ascending: false })
                     .range(offset, offset + limit - 1);
        
        const { data, count, error } = await query;

        if (error) throw error;
        res.json({ data, meta: { page, limit, total: count } });
    } catch(e: any) { res.status(500).json({ error: e.message }); }
  }

  // --- ANALYTICS ---
  getDashboardStats = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });

      if (this.useMockDb) {
         return res.json({
            total_reach: "12.5k",
            engagement_rate: "4.2%",
            pending_approvals: 5,
            published_this_week: 12
         });
      }

      // 1. Pending Approvals
      const { count: pendingCount } = await supabase
        .from('generated_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .eq('status', 'needs_approval');

      // 2. Published This Week
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      
      const { count: publishedCount } = await supabase
        .from('generated_posts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user_id)
        .eq('status', 'published')
        .gte('published_at', startOfWeek.toISOString());

      // 3. Activity Feed (Recent Posts)
      const { data: recentActivity } = await supabase
        .from('generated_posts')
        .select('id, content, status, platform_post_id, created_at, trend_id')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(5);

      res.json({
        metrics: {
           total_reach: "0", // Placeholder until real LinkedIn analytics
           engagement_rate: "0%", // Placeholder
           pending_approvals: pendingCount || 0,
           published_this_week: publishedCount || 0
        },
        activity: recentActivity || []
      });

    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  }

  // --- LOGS ---
  getLogs = async (req: AuthRequest, res: Response) => {
    try {
      const user_id = req.user?.id;
      if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      
      if (this.useMockDb) {
          // Return mock logs
          return res.json([
             { id: '1', action: 'Scan Trends', level: 'info', message: 'Scanned 15 news articles', created_at: new Date().toISOString() },
             { id: '2', action: 'Generate Draft', level: 'success', message: 'Created draft for "AI Ethics"', created_at: new Date(Date.now() - 3600000).toISOString() }
          ]);
      }

      const { data, error } = await supabase
        .from('automation_logs')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      res.json(data);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
  }

  // --- PROFILE ---
  getProfile = async (req: AuthRequest, res: Response) => {
      try {
          const user_id = req.user?.id;
          if (!user_id) return res.status(401).json({ error: "Unauthorized" });

          const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user_id)
              .single();
          
          if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows", which is fine for new users
          
          res.json(data || {});
      } catch(e: any) { res.status(500).json({ error: e.message }); }
  }

  updateProfile = async (req: AuthRequest, res: Response) => {
      try {
          const user_id = req.user?.id;
          if (!user_id) return res.status(401).json({ error: "Unauthorized" });

          const { full_name, avatar_url, bio, role, niche, goals, onboarding_completed } = req.body;

          const { data, error } = await supabase
              .from('profiles')
              .upsert({
                  id: user_id,
                  email: req.user.email, // Ensure email is synced from auth
                  full_name,
                  avatar_url,
                  bio,
                  role,
                  niche,
                  goals,
                  onboarding_completed,
                  updated_at: new Date().toISOString()
              })
              .select()
              .single();

          if (error) throw error;
          res.json({ success: true, profile: data });
      } catch(e: any) { res.status(500).json({ error: e.message }); }
  }

  // --- CONNECTIONS ---
  getConnections = async (req: AuthRequest, res: Response) => {
      try {
          const user_id = req.user?.id;
          if (!user_id) return res.status(401).json({ error: "Unauthorized" });

          if (this.useMockDb) {
              return res.json([
                  { platform: 'linkedin', connected: true, username: 'Mock User' },
                  { platform: 'slack', connected: false }
              ]);
          }

          const { data } = await supabase
              .from('linked_accounts')
              .select('platform, platform_username, status')
              .eq('user_id', user_id);

          res.json(data || []);
      } catch(e: any) { res.status(500).json({ error: e.message }); }
  }

  // --- DEV TOOLS ---
  seedData = async (req: Request, res: Response) => {
     try {
        if (process.env.NEWSDATA_API_KEY) {
            return this.scanTrends(req, res);
        }
        res.json({ success: true, message: "Mock data seeded (No API keys found)" });
     } catch(e: any) { res.status(500).json({ error: e.message }); }
  }
}

export const automationController = new AutomationController();
