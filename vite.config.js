import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// During `vite dev`, proxy the function call to the Netlify dev server if it's
// running; otherwise the app falls back to its built-in demo data.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/.netlify/functions": {
        target: "http://localhost:9999",
        changeOrigin: true,
      },
    },
  },
});
