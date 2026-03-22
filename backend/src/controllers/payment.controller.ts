import { Request, Response } from "express";
import {
  createCheckoutSession,
  handleWebhook,
} from "../services/stripe.service";
import { AuthRequest } from "../middleware/auth.middleware";

export const createSession = async (req: AuthRequest, res: Response) => {
  try {
    const { priceId } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email || "";

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const session = await createCheckoutSession(priceId, userId, userEmail);
    res.json({ url: session.url });
  } catch (error: any) {
    console.error("Create Session Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const webhook = async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;

  try {
    // Use rawBody captured in server.ts middleware
    const rawBody = (req as any).rawBody;
    if (!rawBody) throw new Error("Missing raw body");

    await handleWebhook(signature, rawBody);
    res.json({ received: true });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    res.status(400).send(`Webhook Error: ${error.message}`);
  }
};
