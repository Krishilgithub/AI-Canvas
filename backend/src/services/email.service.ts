import nodemailer from 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private fromEmail: string;

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || '"AI Canvas" <noreply@ai-canvas.com>';
    
    // Default to Ethereal URL (fake SMTP) or Console for dev
    if (process.env.SMTP_HOST) {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });
    } else {
        // Fallback for development: Log to console
        this.transporter = {
            sendMail: async (mailOptions: any) => {
                console.log('---------------------------------------------------');
                console.log(`[EmailService] Mock Email Sent to: ${mailOptions.to}`);
                console.log(`[EmailService] Subject: ${mailOptions.subject}`);
                console.log(`[EmailService] Body Preview: ${mailOptions.inputStr || mailOptions.html?.substring(0, 100)}...`);
                console.log('---------------------------------------------------');
                return { messageId: 'mock-id' };
            }
        } as any;
    }
  }

  async sendEmail(to: string, subject: string, html: string) {
    try {
        const info = await this.transporter.sendMail({
            from: this.fromEmail,
            to,
            subject,
            html
        });
        return info;
    } catch (error) {
        console.error('[EmailService] Error sending email:', error);
        return null;
    }
  }

  async sendWelcomeEmail(to: string, name: string) {
      const subject = "Welcome to AI Canvas! 🚀";
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4F46E5;">Welcome aboard, ${name}!</h1>
            <p>We're thrilled to have you. AI Canvas is designed to supercharge your content workflow.</p>
            <p>Here are a few things you can do right now:</p>
            <ul>
                <li>Connect your LinkedIn account</li>
                <li>Set up your brand voice</li>
                <li>Generate your first post</li>
            </ul>
            <p>Best,<br/>The AI Canvas Team</p>
        </div>
      `;
      return this.sendEmail(to, subject, html);
  }

  async sendApprovalRequest(to: string, postTitle: string, dashboardUrl: string) {
      const subject = "Action Required: New Post Needs Approval 📝";
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>New Draft Ready</h2>
            <p>Your AI agent has generated a new post snippet: "<strong>${postTitle}</strong>"...</p>
            <p>Please review and approve it before it's scheduled.</p>
            <div style="margin: 20px 0;">
                <a href="${dashboardUrl}/linkedin" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Post</a>
            </div>
        </div>
      `;
      return this.sendEmail(to, subject, html);
  }

  async sendWeeklyDigest(to: string, stats: any) {
      const subject = "Your AI Content Performance This Week 📈";
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Weekly Digest</h2>
            <p>Here's how your content performed:</p>
            <ul>
                <li><strong>Impressions:</strong> ${stats.impressions}</li>
                <li><strong>Engagement:</strong> ${stats.engagement}</li>
                <li><strong>New Followers:</strong> ${stats.followers}</li>
            </ul>
            <a href="http://localhost:3000/analytics">View Full Dashboard</a>
        </div>
      `;
      return this.sendEmail(to, subject, html);
  }

  async sendTeamInvitation(to: string, role: string, inviteLink: string) {
      const subject = "You've been invited to join an AI Canvas Workspace 🤝";
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Join the Team</h2>
            <p>You have been invited to collaborate on AI Canvas as a <strong>${role}</strong>.</p>
            <p>Click the link below to accept the invitation and get started:</p>
            <div style="margin: 20px 0;">
                <a href="${inviteLink}" style="background-color: #4F46E5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Join Workspace</a>
            </div>
            <p>If you didn't expect this invitation, you can ignore this email.</p>
        </div>
      `;
      return this.sendEmail(to, subject, html);
  }
}
