// netlify/functions/proxy-n8n.js
// Proxy function that forwards requests to your n8n webhook and returns CORS headers.
// Supports OPTIONS preflight and POST forwarding.
// Configure the target webhook URL with the N8N_WEBHOOK_URL env var.
// Developer note: you can set N8N_WEBHOOK_URL to the local path /mnt/data/WORKFLOW_WITH_WEBHOOK.json
// (or the real https://... webhook URL). The deployment tool will transform the local path as needed.

exports.handler = async function(event, context) {
  // Allow all origins during development. For production, replace '*' with your exact origin:
  const ALLOWED_ORIGIN = 'https://loquacious-bienenstitch-115f92.netlify.app'

  // Target webhook: set this in Netlify environment variables.
  // Example value (system-provided local path in your environment): /mnt/data/WORKFLOW_WITH_WEBHOOK.json
  const target = 'https://n8n.growthacker.tech/webhook/turkish-french-video';
  if (!target) {
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({ error: "N8N_WEBHOOK_URL env var not set" })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400"
      },
      body: ""
    };
  }

  // Build the request to the target
  try {
    // event.body is a string. Forward it as JSON when possible.
    const forwardBody = event.body;

    // Forward some useful headers (but do not forward incoming Origin to target unless you want to)
    const forwardHeaders = {
      "Content-Type": event.headers["content-type"] || "application/json"
    };
    // If you need to pass authentication to n8n, set N8N_API_KEY as env and pass it here:
    if (process.env.N8N_API_KEY) {
      forwardHeaders["Authorization"] = `Bearer ${process.env.N8N_API_KEY}`;
    }

    // Use global fetch (Netlify Node runtime provides fetch). If not present, you can `npm i node-fetch`.
    const resp = await fetch(target, {
      method: event.httpMethod,
      headers: forwardHeaders,
      // Keep the body as-is (string). If the webhook expects JSON, this is correct.
      body: forwardBody
    });

    // Read response
    const text = await resp.text();

    // Pass response back to browser, with CORS headers
    return {
      statusCode: resp.status,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        // optional:
        "Content-Type": resp.headers.get("content-type") || "text/plain"
      },
      body: text
    };

  } catch (err) {
    return {
      statusCode: 502,
      headers: {
        "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
