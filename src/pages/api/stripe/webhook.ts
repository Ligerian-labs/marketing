export const prerender = false;
import type { APIRoute } from "astro";
import { stripe, STRIPE_WEBHOOK_SECRET } from "../../../lib/stripe";
import { createSubscription } from "../../../lib/subscriptions";

export const POST: APIRoute = async ({ request }) => {
  if (!stripe) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("[STRIPE WEBHOOK] Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const packId = session.metadata?.pack_id;
      const userId = session.metadata?.user_id;
      const stripeCustomerId = session.customer as string;

      if (packId && userId) {
        console.log(`[STRIPE] Checkout completed: pack=${packId}, user=${userId}`);
        createSubscription(userId, packId, stripeCustomerId);
      }
      break;
    }

    default:
      console.log(`[STRIPE] Unhandled event: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
