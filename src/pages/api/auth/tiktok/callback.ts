import type { APIRoute } from "astro";

const TIKTOK_CLIENT_KEY = "sbawrm6b2knr3pouj2";
const TIKTOK_CLIENT_SECRET = "FHM2tvV5Av1XWIxpHntP0iQAhj5V4JSt";
const REDIRECT_URI = "https://ligerianlabs.fr/api/auth/tiktok/callback";

export const GET: APIRoute = async ({ url }) => {
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error) {
    return new Response(`Auth error: ${error} - ${url.searchParams.get("error_description")}`, { status: 400 });
  }

  if (!code) {
    return new Response("Missing auth code", { status: 400 });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_key: TIKTOK_CLIENT_KEY,
        client_secret: TIKTOK_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return new Response(`Token error: ${JSON.stringify(tokenData)}`, { status: 400 });
    }

    // Display tokens for manual storage (don't do this in production)
    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>TikTok Auth Success</title></head>
      <body style="font-family:Inter,system-ui;max-width:600px;margin:40px auto;padding:20px">
        <h1>✅ TikTok Authorization Successful</h1>
        <p>Copy these values and send them to the agent:</p>
        <pre style="background:#f5f5f5;padding:20px;border-radius:8px;overflow-x:auto">${JSON.stringify(tokenData, null, 2)}</pre>
        <p><strong>Important:</strong> Save the refresh_token — it's needed to renew access.</p>
      </body>
      </html>
    `;

    return new Response(html, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (e) {
    return new Response(`Exchange failed: ${e}`, { status: 500 });
  }
};
