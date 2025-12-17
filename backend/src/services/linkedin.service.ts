import { Platform } from '../constants';
import { supabase } from '../db';

// Interface abstracts the posting logic so we can swap Mock vs Real easily
export interface ILinkedInService {
  connectAccount(userId: string, authCode: string): Promise<any>;
  getProfile(userId: string): Promise<any>;
  createPost(userId: string, content: string, mediaUrls?: string[]): Promise<any>;
}

export class MockLinkedInService implements ILinkedInService {
  
  async connectAccount(userId: string, authCode: string): Promise<any> {
    console.log(`[MOCK] Connecting LinkedIn account for user ${userId} with code ${authCode}`);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Return mock token data
    const mockData = {
      user_id: userId,
      platform: Platform.LINKEDIN,
      platform_user_id: `urn:li:person:MOCK_${Math.random().toString(36).substring(7)}`,
      platform_username: "Mock User",
      access_token: "mock_access_token_" + Date.now(),
      refresh_token: "mock_refresh_token_" + Date.now(),
      status: "connected",
      token_expires_at: new Date(Date.now() + 3600 * 1000 * 60).toISOString() // 60 days
    };

    // Store in DB
    const { data, error } = await supabase
      .from('linked_accounts')
      .upsert(mockData, { onConflict: 'user_id, platform' })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async getProfile(userId: string): Promise<any> {
    // Return connection status from DB
    const { data } = await supabase
      .from('linked_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', Platform.LINKEDIN)
      .single();
      
    return data || null;
  }

  async createPost(userId: string, content: string, mediaUrls: string[] = []): Promise<any> {
    console.log(`[MOCK] Posting to LinkedIn for user ${userId}:`, content);
    
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simulate success
    return {
      success: true,
      platform_post_id: `urn:li:share:MOCK_${Date.now()}`,
      url: `https://linkedin.com/feed/update/urn:li:share:MOCK_${Date.now()}`
    };
  }
}

// In production, this would implement real LinkedIn Oauth + Voyager/API calls
export class RealLinkedInService implements ILinkedInService {
  async connectAccount(userId: string, authCode: string) {
    throw new Error("Real LinkedIn API not configured. Use MOCK service.");
  }
  async getProfile(userId: string) {
    throw new Error("Real LinkedIn API not configured. Use MOCK service.");
  }
  async createPost(userId: string, content: string) {
    throw new Error("Real LinkedIn API not configured. Use MOCK service.");
  }
}

// Factory to switch
export const linkedInService = process.env.USE_REAL_LINKEDIN === 'true' 
  ? new RealLinkedInService() 
  : new MockLinkedInService();
