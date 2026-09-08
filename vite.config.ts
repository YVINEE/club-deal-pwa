import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico"],
      manifest: {
        name: "Suivi Club Deals",
        short_name: "Club Deals",
        description: "Suivi de club deals et de leurs échéances",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Nécessaire avec BrowserRouter : toute route (ex: /deal/abc123) doit
        // retomber sur index.html en offline plutôt qu'un 404.
        navigateFallback: "index.html",
      },
    }),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
