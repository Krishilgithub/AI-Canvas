import * as cron from 'node-cron';
import { supabase } from '../db';
import { linkedInService } from './linkedin.service';

class SchedulerService {
  private job: cron.ScheduledTask | null = null;

  start() {
    console.log("⏰ Scheduler Service Started");
    // Run every minute
    this.job = cron.schedule('* * * * *', this.processScheduledPosts);
  }

  stop() {
    if (this.job) this.job.stop();
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
          const result = await linkedInService.createPost(post.user_id, post.content);
          
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
}

export const schedulerService = new SchedulerService();
