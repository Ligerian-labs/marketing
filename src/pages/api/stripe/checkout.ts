export const prerender = false;
import type { APIRoute } from "astro";
import { getAuthenticatedUser } from "../../../lib/auth";
import { createCheckoutSession, type PackId, PACKS } from "../../../lib/stripe";

export const POST: APIRoute = async ({ request, cookies, url, redirect }) => {
  const user = getAuthenticatedUser(cookies);

  // Support both JSON and form data
  const contentType = request.headers.get("content-type") || "";
  let packId: string;
  let isForm = false;

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    packId = formData.get("pack") as string;
    isForm = true;
  } else {
    const body = await request.json();
    packId = body.pack;
  }

  if (!packId || !PACKS[packId as PackId]) {
    if (isForm) return redirect("/formations/?error=invalid_pack");
    return new Response(JSON.stringify({ error: "Pack invalide" }), { status: 400 });
  }

  if (!PACKS[packId as PackId].price_cents) {
    if (isForm) return redirect("/contact");
    return new Response(
      JSON.stringify({ error: "Ce pack nécessite un devis. Contactez-nous." }),
      { status: 400 }
    );
  }

  const checkoutUrl = await createCheckoutSession(
    packId as PackId,
    user?.email || null, // Let Stripe collect email if not logged in
    user?.id || null,     // No user ID for post-payment flow
    `${url.origin}/formations/?payment=success`,
    `${url.origin}/formations/?payment=cancelled`
  );

  if (!checkoutUrl) {
    if (isForm) return redirect("/formations/?error=stripe");
    return new Response(
      JSON.stringify({ error: "Stripe non configuré" }),
      { status: 500 }
    );
  }

  if (isForm) return redirect(checkoutUrl);
  return new Response(JSON.stringify({ url: checkoutUrl }), { status: 200 });
};
