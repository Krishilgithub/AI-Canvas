export const DOCS_CATEGORIES = [
  {
    id: "getting-started",
    title: "Getting Started",
    articles: [
      {
        id: "intro",
        title: "Welcome to AI Canvas",
        content: `AI Canvas is not just another chatbot; it's a personalized content engine that understands YOU. Unlike generic AI tools, we perform a deep analysis of your professional profile to generate high-velocity content that sounds authentic.

Why Data Matters?
Our system uses a 3-layer context engine:
1. Global Trends: What the world is talking about.
2. User Identity: Who you are (Role, Bio).
3. Strategic Goals: What you want to achieve (Leads, Followers, Authority).

By combining these, we ensure every post is timely, relevant, and uniquely yours.`,
      },
      {
        id: "quick-start",
        title: "Quick Start Guide",
        content: `To get the "Magic" results, you must feed the AI the right data:

1. Complete Onboarding (Critical):
   • Role: Tells the AI the "Lens" to view topics through (e.g., A "CTO" sees AI differently than a "Marketer").
   • Niche: Filters the news feed to only show relevant trends.
   • Bio: Used to mimic your writing style and professional background.

2. Connect LinkedIn: We need this to publish, but also to learn from your past engagement (Coming Soon).

3. Discover Trends: Go to the "LinkedIn Automation" tab. These aren't random; they are filtered by your Niche.

4. Generate Draft: Click "Generate". The AI now looks at the trend + YOUR Profile to write the draft.`,
      },
    ],
  },
  {
    id: "ai-engine",
    title: "The AI Engine & Your Data",
    articles: [
      {
        id: "personalization",
        title: "How Personalization Works",
        content: `When you click "Generate Draft", a complex process runs in the background. We don't just ask the AI to "Write a post about X".

We construct a 'Persona Prompt' using your data:

• Your Bio ("The Voice"): We analyze your bio to understand your experience level and tone.
  Example: If your bio says "Helping startups scale," the AI will frame news as "scaling opportunities."

• Your Role ("The Perspective"):
  Example: A "Developer" gets technical insights. A "Founder" gets business strategy angles.

• Your Goals ("The Outcome"):
  If your goal is "Engagement", the AI asks questions and uses controversial hooks.
  If your goal is "Leads", the AI focuses on value propositions and "How-to" actionable advice.

Result: Two users generating a post on the SAME trend will get completely different results.`,
      },
      {
        id: "velocity-score",
        title: "Velocity Score Explained",
        content: `We process thousands of data points to calculate a "Velocity Score" (0-100) for every news item.

The Formula:
Velocity = (Search Volume Growth) + (Social Mention Frequency) + (News Coverage Intensity)

• 70+ (Viral): These topics are exploding RIGHT NOW. Posting on them gives you a "First Mover Advantage" in the algorithm.
• 40-70 (Steady): Good evergreen content.
• <40 (Cold): Old news. Avoid unless you have a very unique counter-point.`,
      },
    ],
  },
  {
    id: "features",
    title: "Feature Guides",
    articles: [
      {
        id: "content-creation",
        title: "AI Content Studio",
        content: `Use the Studio to refine the raw AI output.

Pro Tips:
• Regenerate: Don't like the angle? Hit regenerate. The AI will try a slightly different variation of your persona.
• Manual Edits: You are the final editor. Adding a personal anecdote that the AI doesn't know about increases trust.
• Media: We recommend attaching a personal photo or distinct graphic. Text-only posts are great, but visual posts stop the scroll.`,
      },
      {
        id: "scheduling",
        title: "Smart Scheduling",
        content: `Consistency is key to algorithm growth.

• Calendar View: visualize your month.
• Time Zones: All posts are scheduled in your local browser time, but our server optimizes the send time for peak LinkedIn traffic hours (typically 8am - 10am EST).`,
      },
    ],
  },
];

export const FAQS = [
  {
    question: "Does the AI read my private DMs?",
    answer:
      "No. We never access your private messages. We only use your public profile data (Bio, Headline) and the posts you explicitly ask us to generate.",
  },
  {
    question: "Why should I fill out the 'Goals' section?",
    answer:
      "Your 'Goals' directly change the Call-to-Action (CTA) of every post. If you leave it blank, you get a generic ending. If you select 'Leads', the AI tries to drive traffic to your bio.",
  },
  {
    question: "Can I change my Persona later?",
    answer:
      "Yes! Go to Settings > Profile. Updating your Bio or Role will immediately change the style of the NEXT draft you generate.",
  },
  {
    question: "Is my data shared with other users?",
    answer:
      "Never. Your profile data is isolated and only used to generate content for your specific account.",
  },
];
