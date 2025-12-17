export class MockStore {
    trends: any[] = [];
    posts: any[] = [];
    configs: any[] = [];
  
    constructor() {
      // Seed some initial mock data incase scan hasn't run
      this.trends = [
        { id: 1, topic: "AI Agents (Mock)", category: "AI", velocity_score: 85, created_at: new Date().toISOString() },
        { id: 2, topic: "Sustainable Tech (Mock)", category: "Tech", velocity_score: 70, created_at: new Date().toISOString() }
      ];
    }
  }
  
  export const mockStore = new MockStore();
