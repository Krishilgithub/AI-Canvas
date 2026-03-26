import Stripe from "stripe";
import { supabase } from "../db";

// ─── Init ─────────────────────────────────────────────────────────────────────
const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_dummy";
if (!process.env.STRIPE_SECRET_KEY) {
  console.warn("[Stripe] STRIPE_SECRET_KEY is missing. Stripe functionality will fail.");
}

const stripe = new Stripe(stripeKey, {
  apiVersion: "2026-01-28.clover",
});

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

// ─── Price ID → Tier Mapping ──────────────────────────────────────────────────
// FIX: Was hardcoded "pro" for every plan. Now reads from environment variables
// so the mapping can differ between test and production Stripe environments.
// Add these to your .env:
//   STRIPE_PRICE_PRO=price_xxx
//   STRIPE_PRICE_ENTERPRISE=price_yyy
//
// If a Price ID is not in the map, it defaults to "pro" (existing behaviour).
function tierFromPriceId(priceId: string | null | undefined): string {
  if (!priceId) return "pro";
  const priceToTier: Record<string, string> = {};
  if (process.env.STRIPE_PRICE_PRO)        priceToTier[process.env.STRIPE_PRICE_PRO]        = "pro";
  if (process.env.STRIPE_PRICE_ENTERPRISE) priceToTier[process.env.STRIPE_PRICE_ENTERPRISE]  = "enterprise";
  return priceToTier[priceId] ?? "pro"; // default to pro for unknown price ids
}

// ─── Checkout ─────────────────────────────────────────────────────────────────
export const createCheckoutSession = async (
  priceId: string,
  userId: string,
  userEmail: string,
) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `${FRONTEND_URL}/settings?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${FRONTEND_URL}/settings?canceled=true`,
      customer_email: userEmail,
      metadata: { userId },
      allow_promotion_codes: true,
    });
    return session;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(`Stripe session creation failed: ${msg}`);
  }
};

// ─── Billing Portal ───────────────────────────────────────────────────────────
// FIX: Added a createPortalSession export so users can manage their own subscriptions
// (upgrades, downgrades, cancellations) via the Stripe Customer Portal.
export const createPortalSession = async (customerId: string): Promise<string> => {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${FRONTEND_URL}/settings?tab=billing`,
  });
  return session.url;
};

// ─── Webhook ──────────────────────────────────────────────────────────────────
export const handleWebhook = async (signature: string, rawBody: Buffer) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Missing STRIPE_WEBHOOK_SECRET");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Webhook signature verification failed: ${msg}`);
  }

  switch (event.type) {

    // ── New subscription activated (checkout completed) ──────────────────────
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId  = session.metadata?.userId;
      if (!userId) break;

      // FIX: Retrieve the actual subscription to get the correct Price ID
      let tier = "pro";
      if (session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = subscription.items.data[0]?.price?.id;
        tier = tierFromPriceId(priceId);
      }

      await supabase
        .from("users")
        .update({
          subscription_status: "active",
          subscription_tier: tier, // FIX: real tier from Price ID, not hardcoded
          subscription_id: session.subscription as string | null,
          stripe_customer_id: session.customer as string | null,
        })
        .eq("id", userId);

      console.log(`[Stripe] User ${userId} activated → tier: ${tier}`);
      break;
    }

    // ── Subscription updated (upgrade / downgrade) ────────────────────────────
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;
      if (!userId) break;

      const priceId = subscription.items.data[0]?.price?.id;
      const tier    = tierFromPriceId(priceId);
      const status  = subscription.status; // active | past_due | canceled etc.

      await supabase
        .from("users")
        .update({
          subscription_tier: status === "active" ? tier : "free",
          subscription_status: status,
        })
        .eq("id", userId);

      console.log(`[Stripe] Subscription updated for user ${userId} → ${tier} (${status})`);
      break;
    }

    // ── FIX: Cancellation was a no-op empty break — now properly downgrades user ─
    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;

      // Find the user by subscription ID (metadata may not exist on deleted events)
      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("subscription_id", subscription.id)
        .single();

      if (!user?.id) {
        console.warn("[Stripe] Cancellation received but no matching user found for subscription:", subscription.id);
        break;
      }

      // Downgrade to free; preserve their stripe_customer_id for re-subscription
      await supabase
        .from("users")
        .update({
          subscription_tier:   "free",
          subscription_status: "canceled",
          subscription_id:     null,
        })
        .eq("id", user.id);

      console.log(`[Stripe] User ${user.id} subscription canceled → downgraded to free`);
      break;
    }

    // ── Payment failed (past due — warn user) ─────────────────────────────────
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;

      const { data: user } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (user?.id) {
        await supabase
          .from("users")
          .update({ subscription_status: "past_due" })
          .eq("id", user.id);
        console.warn(`[Stripe] Payment failed for user ${user.id} — status set to past_due`);
      }
      break;
    }

    default:
      // Unhandled event — ignore silently
      break;
  }

  return { received: true };
};
