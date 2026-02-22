import Stripe from "stripe";

// Use process.env for runtime secrets (not baked at build time)
const getStripeKey = () => process.env.STRIPE_SECRET_KEY || "";
const getWebhookSecret = () => process.env.STRIPE_WEBHOOK_SECRET || "";

let _stripe: Stripe | null = null;
export function getStripe(): Stripe | null {
  const key = getStripeKey();
  if (!key) return null;
  if (!_stripe) {
    _stripe = new Stripe(key, { apiVersion: "2025-01-27.acacia" as any });
  }
  return _stripe;
}

// Keep backward compat
export const stripe = null as Stripe | null; // lazy, use getStripe()
export const STRIPE_WEBHOOK_SECRET = ""; // use getWebhookSecret()

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
  "formation-starter": {
    name: "IA pour les PME",
    description: "Guide pratique pour intégrer l'IA dans votre PME",
    price_cents: 4900, // 49€
    mode: "payment" as const, // one-time
  },
  "formation-intermediate": {
    name: "Automatiser son Business",
    description: "Workflows et automatisations IA pour votre entreprise",
    price_cents: 9900, // 99€
    mode: "payment" as const, // one-time
  },
  "formation-premium": {
    name: "Déployer l'IA en Entreprise",
    description: "Stratégie et architecture IA pour grandes organisations",
    price_cents: 14900, // 149€
    mode: "payment" as const, // one-time
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
  const stripe = getStripe();
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
