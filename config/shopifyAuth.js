const fetch = require("node-fetch");
const CONFIG = require("./config");

let cachedToken = null;
let expiresAt = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < expiresAt - 60_000) {
    return cachedToken;
  }

  const response = await fetch(
    `https://${CONFIG.SHOPIFY_SHOP}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: CONFIG.SHOPIFY_CLIENT_ID,
        client_secret: CONFIG.SHOPIFY_CLIENT_SECRET,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Error obteniendo token Shopify: ${response.status} ${text}`,
    );
  }

  const data = await response.json();

  cachedToken = data.access_token;
  expiresAt = Date.now() + (data.expires_in || 86400) * 1000;

  return cachedToken;
}

module.exports = { getAccessToken };
