import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Vite configuration for the UET Hostel Management System client.
export default defineConfig({
  envDir: path.resolve(import.meta.dirname, ".."),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    allowedHosts: true,
    // Proxy API calls to the Express backend during development so the browser
    // only ever talks to the Vite origin (avoids CORS friction in dev).
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
