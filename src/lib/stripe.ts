import Stripe from "stripe";

const STRIPE_SECRET_KEY = import.meta.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.warn("[STRIPE] No STRIPE_SECRET_KEY set — Stripe features disabled");
}

export const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-01-27.acacia" as any })
  : null;

export const STRIPE_WEBHOOK_SECRET = import.meta.env.STRIPE_WEBHOOK_SECRET || "";

export const PACKS = {
  "agent-starter": {
    name: "Agent Starter",
    description: "Infrastructure complète pour démarrer avec un agent IA",
    price_cents: 9900, // 99€
    mode: "payment" as const, // one-time
  },
  "openclaw-setup": {
    name: "Agent sur mesure",
    description: "Configuration personnalisée de votre agent IA",
    price_cents: null, // custom quote
    mode: "payment" as const,
  },
  "moderation-support": {
    name: "Modération IA",
    description: "Agent modérateur pour votre communauté",
    price_cents: null, // custom quote
    mode: "payment" as const,
  },
} as const;

export type PackId = keyof typeof PACKS;

export async function createCheckoutSession(
  packId: PackId,
  customerEmail: string,
  userId: string,
  successUrl: string,
  cancelUrl: string
): Promise<string | null> {
  if (!stripe) return null;

  const pack = PACKS[packId];
  if (!pack.price_cents) return null; // Custom quote packs

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    customer_email: customerEmail,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: pack.name,
            description: pack.description,
          },
          unit_amount: pack.price_cents,
        },
        quantity: 1,
      },
    ],
    mode: pack.mode,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      pack_id: packId,
      user_id: userId,
    },
  });

  return session.url;
}
