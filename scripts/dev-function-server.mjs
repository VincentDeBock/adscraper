// Tiny local server that runs the Netlify function handler for `vite dev`.
// Lets you develop the full app locally without the Netlify CLI:
//   1) node scripts/dev-function-server.mjs   (serves the function on :9999)
//   2) npm run dev                            (vite proxies /.netlify/functions -> :9999)
import { createServer } from "node:http";
import { handler } from "../netlify/functions/ads.js";

const PORT = 9999;

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (!url.pathname.startsWith("/.netlify/functions/ads")) {
    res.writeHead(404).end("not found");
    return;
  }
  const queryStringParameters = Object.fromEntries(url.searchParams.entries());
  const result = await handler({ queryStringParameters });
  res.writeHead(result.statusCode, result.headers);
  res.end(result.body);
}).listen(PORT, () => console.log(`dev function server on http://localhost:${PORT}`));
