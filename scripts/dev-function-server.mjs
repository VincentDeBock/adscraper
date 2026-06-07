// Tiny local server that runs the Netlify function handlers for `vite dev`.
// Lets you develop the full app locally without the Netlify CLI:
//   1) node scripts/dev-function-server.mjs   (serves the functions on :9999)
//   2) npm run dev                            (vite proxies /.netlify/functions -> :9999)
import { createServer } from "node:http";
import { handler as adsHandler } from "../netlify/functions/ads.js";
import { handler as mediaHandler } from "../netlify/functions/media.js";

const PORT = 9999;

const ROUTES = {
  "/.netlify/functions/ads": adsHandler,
  "/.netlify/functions/media": mediaHandler,
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = Object.keys(ROUTES).find((p) => url.pathname.startsWith(p));
  if (!route) {
    res.writeHead(404).end("not found");
    return;
  }
  const queryStringParameters = Object.fromEntries(url.searchParams.entries());
  const result = await ROUTES[route]({ queryStringParameters });
  res.writeHead(result.statusCode, result.headers);
  if (result.isBase64Encoded) {
    res.end(Buffer.from(result.body, "base64"));
  } else {
    res.end(result.body);
  }
}).listen(PORT, () => console.log(`dev function server on http://localhost:${PORT}`));
