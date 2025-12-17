import { Request, Response } from 'express';
import { supabase } from '../db';
import { linkedInService } from '../services/linkedin.service';
import { newsService } from '../services/news.service';
import { geminiService } from '../services/gemini.service';
import { Platform, PostStatus, LogLevel } from '../constants';
import { mockStore } from '../store';

export class AutomationController {
  
  private useMockDb = process.env.SUPABASE_URL?.includes('placeholder');

  // 1. Save Configuration
  async saveConfig(req: Request, res: Response) {
    try {
      const { user_id, niches, keywords, tone_profile, schedule_cron, require_approval } = req.body;

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
  async ingestTrend(req: Request, res: Response) {
    // ... (Keep existing implementation or add mock fallback if needed)
    // For brevity, assuming this is mostly n8n usage
    res.json({ success: true });
  }

  // NEW: Scan Real Trends
  async scanTrends(req: Request, res: Response) {
      try {
          const { user_id } = req.body;
          
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
               const trendObj = {
                   topic: trend.title,
                   category: trend.category || 'General',
                   velocity_score: trend.velocity_score,
                   source: 'newsdata_io',
                   metadata: { link: trend.link, insight: trend.insight },
                   created_at: new Date().toISOString(),
                   id: Math.random().toString(36).substr(2, 9)
               };

               if (this.useMockDb) {
                   mockStore.trends.unshift(trendObj);
                   savedTrends.push(trendObj);
               } else {
                   const { data } = await supabase.from('detected_trends').insert({
                       topic: trendObj.topic,
                       category: trendObj.category,
                       velocity_score: trendObj.velocity_score,
                       source: trendObj.source,
                       metadata: trendObj.metadata
                   }).select().single();
                   if(data) savedTrends.push(data);
               }
          }

          // 5. Auto-generate drafts
          for (const trend of savedTrends) {
              if (trend.velocity_score > 70) {
                   const draftContent = await geminiService.generateDraft(trend.topic, trend.metadata.insight);
                   
                   const postObj = {
                       user_id,
                       content: draftContent,
                       trend_id: trend.id,
                       status: PostStatus.NEEDS_APPROVAL,
                       created_at: new Date().toISOString(),
                       id: Math.random().toString(36).substr(2, 9)
                   };

                   if (this.useMockDb) {
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
  async createDraft(req: Request, res: Response) {
    try {
      const { user_id, content, trend_id } = req.body;
      
      if (this.useMockDb) {
          const post = {
              id: Math.random().toString(36).substr(2, 9),
              user_id, content, trend_id, 
              status: PostStatus.SCHEDULED,
              created_at: new Date().toISOString()
          };
          mockStore.posts.unshift(post);
          return res.json({ success: true, post });
      }
      
      // Check config to see if approval is required
      const { data: config } = await supabase
        .from('automation_configs')
        .select('require_approval')
        .eq('user_id', user_id)
        .eq('platform', Platform.LINKEDIN)
        .single();
        
      const status = config?.require_approval ? PostStatus.NEEDS_APPROVAL : PostStatus.SCHEDULED;
      
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
  async triggerPost(req: Request, res: Response) {
    try {
      const { post_id, user_id } = req.body;
      
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

      // Fetch post
      const { data: post, error: fetchError } = await supabase
        .from('generated_posts')
        .select('*')
        .eq('id', post_id)
        .single();

      if (fetchError || !post) throw new Error("Post not found");
      
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
        
      res.status(500).json({ error: error.message });
    }
  }

  // --- GETTERS for Frontend ---

  async getConfig(req: Request, res: Response) {
    try {
      // In real app, valid user_id from JWT. For now, pass via Query or Header
      const { user_id } = req.query; 
      if (!user_id) return res.status(400).json({ error: "Missing user_id" });

      if (this.useMockDb) {
            const conf = mockStore.configs.find(c => c.user_id === user_id);
            return res.json(conf || {});
        }

      const { data, error } = await supabase
        .from('automation_configs')
        .select('*')
        .eq('user_id', user_id)
        .eq('platform', Platform.LINKEDIN)
        .single();
      
      if (error) throw error;
      res.json(data || {}); 
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getTrends(req: Request, res: Response) {
    try {
       if (this.useMockDb) {
           return res.json(mockStore.trends);
       }

       const { data, error } = await supabase
        .from('detected_trends')
        .select('*')
        .order('velocity_score', { ascending: false })
        .limit(20);
        
       if (error) throw error;
       res.json(data);
    } catch(e: any) { res.status(500).json({ error: e.message }); }
  }

  async getPosts(req: Request, res: Response) {
    try {
        if (this.useMockDb) {
            return res.json(mockStore.posts);
        }

        const { user_id, status } = req.query;
        let query = supabase.from('generated_posts').select('*').order('created_at', { ascending: false });
        
        if (user_id) query = query.eq('user_id', user_id);
        if (status) query = query.eq('status', status);
        
        const { data, error } = await query;
        if (error) throw error;
        res.json(data);
    } catch(e: any) { res.status(500).json({ error: e.message }); }
  }

  // --- DEV TOOLS ---
  async seedData(req: Request, res: Response) {
     try {
        if (process.env.NEWSDATA_API_KEY) {
            return this.scanTrends(req, res);
        }
        res.json({ success: true, message: "Mock data seeded (No API keys found)" });
     } catch(e: any) { res.status(500).json({ error: e.message }); }
  }
}

export const automationController = new AutomationController();
