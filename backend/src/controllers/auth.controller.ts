import { Request, Response } from 'express';
import { linkedInService } from '../services/linkedin.service';
import { supabase } from '../db';
import { AuthRequest } from '../middleware/auth.middleware';

export class AuthController {
  
  // 1. Get Auth URL
  getLinkedInAuthUrl = async (req: AuthRequest, res: Response) => {
    try {
       const user_id = req.user?.id;
       if (!user_id) return res.status(401).json({ error: "Unauthorized" });
      
       // Encode user_id in state (in prod, sign this to prevent tampering)
       const state = Buffer.from(JSON.stringify({ user_id })).toString('base64');
       
       const url = linkedInService.getAuthUrl(state);
       res.json({ url });
    } catch (e: any) {
       res.status(500).json({ error: e.message });
    }
  }

  // 2. Handle Callback
  handleLinkedInCallback = async (req: Request, res: Response) => {
    try {
       const { code, state, error } = req.query;
       
       if (error) {
           return res.redirect(`${process.env.FRONTEND_URL}/integrations?error=${error}`);
       }

       if (!code || !state) {
           return res.redirect(`${process.env.FRONTEND_URL}/integrations?error=invalid_callback`);
       }

       // Decode state
       const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString('ascii'));
       const { user_id } = decodedState;

       if (!user_id) {
           return res.redirect(`${process.env.FRONTEND_URL}/integrations?error=invalid_state`);
       }

       // Connect Account
       await linkedInService.connectAccount(user_id, code as string);

       // Redirect to frontend
       res.redirect(`${process.env.FRONTEND_URL}/integrations?success=linkedin_connected`);

    } catch (e: any) {
       console.error("LinkedIn Callback Error:", e);
       res.redirect(`${process.env.FRONTEND_URL}/integrations?error=connection_failed`);
    }
  }

  // 3. Disconnect
  disconnectLinkedIn = async (req: AuthRequest, res: Response) => {
      try {
        const user_id = req.user?.id;
        if (!user_id) return res.status(401).json({ error: "Unauthorized" });

        const { error } = await supabase
            .from('linked_accounts')
            .delete()
            .eq('user_id', user_id)
            .eq('platform', 'linkedin');

        if (error) throw error;

        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ error: e.message });
      }
  }
}

export const authController = new AuthController();
