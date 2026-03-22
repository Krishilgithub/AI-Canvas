import Stripe from "stripe";
import { supabase } from "../db";

const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_dummy";
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn(
    "⚠️ STRIPE_SECRET_KEY is missing. Stripe functionality will fail.",
  );
}

const stripe = new Stripe(stripeKey, {
  apiVersion: "2026-01-28.clover",
});

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

export const createCheckoutSession = async (
  priceId: string,
  userId: string,
  userEmail: string,
) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${FRONTEND_URL}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/settings?canceled=true`,
      customer_email: userEmail,
      metadata: {
        userId,
      },
      allow_promotion_codes: true,
    });

    return session;
  } catch (error: any) {
    throw new Error(`Stripe session creation failed: ${error.message}`);
  }
};

export const handleWebhook = async (signature: string, rawBody: Buffer) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: any) {
    throw new Error(`Webhook signature verification failed: ${err.message}`);
  }

  // Handle specific events
  switch (event.type) {
    case "checkout.session.completed":
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;

      if (userId) {
        // Update user subscription in Supabase
        await supabase
          .from("users")
          .update({
            subscription_status: "active",
            subscription_tier: "pro", // Simplified logic
            subscription_id: session.subscription as string,
          })
          .eq("id", userId);
      }
      break;

    // Handle subscription updates/cancellations as needed
    case "customer.subscription.deleted":
      // Handle cancellation
      break;
  }

  return { received: true };
};
