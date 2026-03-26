import { Request, Response } from "express";
import {
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
} from "../services/stripe.service";
import { AuthRequest } from "../middleware/auth.middleware";
import { supabase } from "../db";

export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const { priceId } = req.body;
    const userId    = req.user?.id;
    const userEmail = req.user?.email || "";

    if (!userId)  return res.status(401).json({ error: "Unauthorized" });
    if (!priceId) return res.status(400).json({ error: "priceId is required" });

    const session = await createCheckoutSession(priceId, userId, userEmail);
    res.json({ url: session.url });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Payment] Create Session Error:", msg);
    res.status(500).json({ error: msg });
  }
};

// FIX: New portal handler — redirects user to Stripe Customer Portal
// where they can manage their own subscription (upgrade, downgrade, cancel)
export const createPortal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    // Look up the user's stripe_customer_id
    const { data: user, error } = await supabase
      .from("users")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();

    if (error || !user?.stripe_customer_id) {
      return res.status(400).json({
        error: "No Stripe customer found. Please complete a checkout first.",
      });
    }

    const portalUrl = await createPortalSession(user.stripe_customer_id);
    res.json({ url: portalUrl });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Payment] Create Portal Error:", msg);
    res.status(500).json({ error: msg });
  }
};

export const webhook = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawBody = (req as any).rawBody;
    if (!rawBody) throw new Error("Missing raw body");

    await handleWebhook(signature, rawBody);
    res.json({ received: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Payment] Webhook Error:", msg);
    res.status(400).send(`Webhook Error: ${msg}`);
  }
};
