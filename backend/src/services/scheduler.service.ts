import * as cron from 'node-cron';
import { supabase } from '../db';
import { linkedInService } from './linkedin.service';
import { EmailService } from './email.service';

class SchedulerService {
  private job: cron.ScheduledTask | null = null;
  private weeklyJob: cron.ScheduledTask | null = null;
  private emailService = new EmailService();

  start() {
    console.log("⏰ Scheduler Service Started");
    // Run every minute
    // Run every minute for posts
    this.job = cron.schedule('* * * * *', this.processScheduledPosts);
    
    // Run weekly on Monday at 9:00 AM for digests
    // Cron syntax: Minute Hour DayMonth Month DayWeek
    this.weeklyJob = cron.schedule('0 9 * * 1', this.processWeeklyDigest);
  }

  stop() {
    if (this.job) this.job.stop();
    if (this.weeklyJob) this.weeklyJob.stop();
  }

  private processScheduledPosts = async () => {
    try {
        const now = new Date().toISOString();
        
        // 1. Fetch Due Posts
        const { data: posts, error } = await supabase
            .from('generated_posts')
            .select('*')
            .eq('status', 'scheduled')
            .lte('scheduled_time', now);
            
        if (error) {
            console.error("❌ Scheduler Fetch Error:", error);
            return;
        }

        if (!posts || posts.length === 0) return;

        console.log(`⏰ Processing ${posts.length} due posts...`);

        // 2. Process Each Post
        for (const post of posts) {
            await this.publishPost(post);
        }

    } catch (e) {
        console.error("❌ Scheduler Error:", e);
    }
  }

  private publishPost = async (post: any) => {
      try {
          // Publish (Service handles token fetching)
          console.log(`🚀 Publishing post ${post.id} for user ${post.user_id}`);
          // Pass media_urls if they exist
          const result = await linkedInService.createPost(post.user_id, post.content, post.media_urls);
          
          // Update Success
          await this.updateStatus(post.id, 'published', null, result?.platform_post_id);
          
      } catch (e: any) {
          console.error(`❌ Failed to publish post ${post.id}:`, e.message);
          await this.updateStatus(post.id, 'failed', e.message);
      }
  }

  private updateStatus = async (postId: string, status: string, error?: string | null, platformId?: string) => {
      await supabase
          .from('generated_posts')
          .update({ 
              status, 
              published_at: status === 'published' ? new Date().toISOString() : null,
              error_message: error,
              platform_post_id: platformId
          })
          .eq('id', postId);
  }

  private processWeeklyDigest = async () => {
    console.log("📧 Processing Weekly Digest...");
    try {
        // 1. Fetch users with digest enabled
        // Note: JSON filtering in Supabase: notification_preferences->>weekly_digest equals 'true'
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('id, email, notification_preferences');

        if (error) throw error;
        if (!profiles) return;

        for (const profile of profiles) {
            const prefs = profile.notification_preferences as any;
            if (prefs && prefs.weekly_digest && profile.email) {
                
                // 2. Calculate Stats (Mock calculation for now, or real aggregation)
                // Real aggregation of last 7 days:
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                const { count: postsCount } = await supabase
                    .from('generated_posts')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', profile.id)
                    .eq('status', 'published')
                    .gte('published_at', oneWeekAgo.toISOString());

                // Fetch engagement (mocked as we don't have a dedicated analytics table populated yet)
                const stats = {
                    impressions: (postsCount || 0) * 150 + Math.floor(Math.random() * 500),
                    engagement: Math.floor(Math.random() * 10) + "%",
                    followers: "+" + Math.floor(Math.random() * 20)
                };

                // 3. Send Email
                console.log(`Sending digest to ${profile.email}`);
                await this.emailService.sendWeeklyDigest(profile.email, stats);
            }
        }
    } catch (e) {
        console.error("❌ Weekly Digest Error:", e);
    }
  }
}

export const schedulerService = new SchedulerService();
