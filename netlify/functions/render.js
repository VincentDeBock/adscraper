// Redirects a screenshot service to an ad's Meta snapshot page, adding the
// access token server-side. The token therefore never appears in the browser
// or in the client-visible image URL — only the screenshot service (which must
// load the page to render it) and Meta ever see it.
//
// Flow:
//   <img src="https://image.thum.io/get/.../<site>/.netlify/functions/render?id=X">
//   -> this function 302-redirects to render_ad?id=X&access_token=TOKEN
//   -> the screenshot service follows the redirect, executes Meta's JS, and
//      returns a PNG of the real ad creative.

export async function handler(event) {
  const id = (event.queryStringParameters?.id || "").trim();
  const token = process.env.META_ACCESS_TOKEN;

  // Only allow numeric ad archive IDs (prevents open-redirect abuse).
  if (!/^\d+$/.test(id) || !token) {
    return { statusCode: 404, body: "Not found" };
  }

  const target = `https://www.facebook.com/ads/archive/render_ad/?id=${id}&access_token=${token}`;

  return {
    statusCode: 302,
    headers: {
      Location: target,
      // Don't let the redirect (which contains the token) get cached anywhere.
      "Cache-Control": "private, no-store",
    },
    body: "",
  };
}
