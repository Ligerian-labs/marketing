import type { APIRoute } from "astro";

const CLIENT_ID = import.meta.env.LINKEDIN_CLIENT_ID || "";
const CLIENT_SECRET = import.meta.env.LINKEDIN_CLIENT_SECRET || "";
const REDIRECT_URI = "https://ligerianlabs.fr/api/auth/linkedin/callback";

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
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return new Response(`Token error: ${JSON.stringify(tokenData)}`, { status: 400 });
    }

    // Get profile info to confirm identity
    let profileInfo = "";
    try {
      const profileResp = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const profile = await profileResp.json();
      profileInfo = `<p><strong>Authenticated as:</strong> ${profile.name || profile.sub || "Unknown"}</p>`;
    } catch {}

    const html = `
      <!DOCTYPE html>
      <html>
      <head><title>LinkedIn Auth Success</title></head>
      <body style="font-family:Inter,system-ui;max-width:600px;margin:40px auto;padding:20px">
        <h1>✅ LinkedIn Authorization Successful</h1>
        ${profileInfo}
        <p>Copy these values and send them to the agent:</p>
        <pre style="background:#f5f5f5;padding:20px;border-radius:8px;overflow-x:auto">${JSON.stringify(tokenData, null, 2)}</pre>
        <p><strong>Important:</strong> Access token expires in ${tokenData.expires_in ? Math.round(tokenData.expires_in / 86400) + " days" : "unknown time"}. Save the refresh_token if present.</p>
      </body>
      </html>
    `;

    return new Response(html, { headers: { "Content-Type": "text/html" } });
  } catch (e) {
    return new Response(`Exchange failed: ${e}`, { status: 500 });
  }
};
