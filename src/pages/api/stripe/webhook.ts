export const prerender = false;
import type { APIRoute } from "astro";
import { getStripe } from "../../../lib/stripe";
import { createSubscription } from "../../../lib/subscriptions";
import { createPurchase } from "../../../lib/formations";
import { getUserByEmail, getUserById, createUserWithoutPassword, createPasswordToken } from "../../../lib/auth";
import { sendPurchaseConfirmationEmail } from "../../../lib/email";

export const POST: APIRoute = async ({ request }) => {
  const stripe = getStripe();
  if (!stripe) {
    return new Response("Stripe not configured", { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
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
      
      // For post-payment flow: get customer details from session
      const customerEmail = session.customer_email || session.customer_details?.email;
      const customerName = session.customer_details?.name;

      if (packId) {
        console.log(`[STRIPE] Checkout completed: pack=${packId}, user=${userId || 'new'}, email=${customerEmail}`);
        
        if (packId.startsWith('formation-')) {
          // Handle formation purchase
          let finalUserId = userId;
          let emailTo = customerEmail;
          let userName = customerName || 'Client Ligerian Labs';
          let passwordSetupToken: string | undefined;
          let isNewUser = false;
          
          if (userId) {
            // Logged-in user: resolve their email for confirmation
            const existingUser = getUserById(userId);
            if (existingUser) {
              emailTo = existingUser.email;
              userName = existingUser.name;
            }
          } else if (customerEmail) {
            // Post-payment flow: check if user exists by email
            const user = getUserByEmail(customerEmail);
            
            if (!user) {
              // Create new user without password
              const newUser = createUserWithoutPassword(customerEmail, userName);
              finalUserId = newUser.id;
              isNewUser = true;
              console.log(`[STRIPE] Created new user: ${newUser.id} (${customerEmail})`);
              
              // Generate password setup token
              passwordSetupToken = createPasswordToken(newUser.id);
            } else {
              finalUserId = user.id;
              userName = user.name;
              console.log(`[STRIPE] Found existing user: ${user.id} (${customerEmail})`);
            }
          }
          
          if (finalUserId) {
            createPurchase(finalUserId, packId, session.id);
          }
          
          // Always send confirmation email after purchase
          if (emailTo) {
            try {
              await sendPurchaseConfirmationEmail(emailTo, userName, packId, {
                passwordSetupToken,
              });
              console.log(`[STRIPE] Sent purchase confirmation to ${emailTo} (new=${isNewUser})`);
            } catch (emailErr) {
              console.error(`[STRIPE] Failed to send confirmation to ${emailTo}:`, emailErr);
            }
          } else {
            console.error(`[STRIPE] No email available for purchase confirmation! pack=${packId}, user=${finalUserId}`);
          }
        } else {
          // Handle subscription (existing flow)
          if (userId) {
            createSubscription(userId, packId, stripeCustomerId);
          }
        }
      }
      break;
    }

    default:
      console.log(`[STRIPE] Unhandled event: ${event.type}`);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
};
