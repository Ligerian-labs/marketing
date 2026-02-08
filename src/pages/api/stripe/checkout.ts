export const prerender = false;
import type { APIRoute } from "astro";
import { getAuthenticatedUser } from "../../../lib/auth";
import { createCheckoutSession, type PackId, PACKS } from "../../../lib/stripe";

export const POST: APIRoute = async ({ request, cookies, url }) => {
  const user = getAuthenticatedUser(cookies);
  if (!user) {
    return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401 });
  }

  const body = await request.json();
  const packId = body.pack as PackId;

  if (!packId || !PACKS[packId]) {
    return new Response(JSON.stringify({ error: "Pack invalide" }), { status: 400 });
  }

  if (!PACKS[packId].price_cents) {
    return new Response(
      JSON.stringify({ error: "Ce pack nécessite un devis. Contactez-nous." }),
      { status: 400 }
    );
  }

  const checkoutUrl = await createCheckoutSession(
    packId,
    user.email,
    user.id,
    `${url.origin}/dashboard?payment=success`,
    `${url.origin}/services?payment=cancelled`
  );

  if (!checkoutUrl) {
    return new Response(
      JSON.stringify({ error: "Stripe non configuré" }),
      { status: 500 }
    );
  }

  return new Response(JSON.stringify({ url: checkoutUrl }), { status: 200 });
};
