"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
class EmailService {
    constructor() {
        this.fromEmail = process.env.EMAIL_FROM || '"AI Canvas" <noreply@ai-canvas.com>';
        // Default to Ethereal URL (fake SMTP) or Console for dev
        if (process.env.SMTP_HOST) {
            this.transporter = nodemailer_1.default.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        }
        else {
            // Fallback for development: Log to console
            this.transporter = {
                sendMail: (mailOptions) => __awaiter(this, void 0, void 0, function* () {
                    var _a;
                    console.log('---------------------------------------------------');
                    console.log(`[EmailService] Mock Email Sent to: ${mailOptions.to}`);
                    console.log(`[EmailService] Subject: ${mailOptions.subject}`);
                    console.log(`[EmailService] Body Preview: ${mailOptions.inputStr || ((_a = mailOptions.html) === null || _a === void 0 ? void 0 : _a.substring(0, 100))}...`);
                    console.log('---------------------------------------------------');
                    return { messageId: 'mock-id' };
                })
            };
        }
    }
    sendEmail(to, subject, html) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const info = yield this.transporter.sendMail({
                    from: this.fromEmail,
                    to,
                    subject,
                    html
                });
                return info;
            }
            catch (error) {
                console.error('[EmailService] Error sending email:', error);
                return null;
            }
        });
    }
    sendWelcomeEmail(to, name) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    sendApprovalRequest(to, postTitle, dashboardUrl) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    sendWeeklyDigest(to, stats) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
    sendTeamInvitation(to, role, inviteLink) {
        return __awaiter(this, void 0, void 0, function* () {
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
        });
    }
}
exports.EmailService = EmailService;
