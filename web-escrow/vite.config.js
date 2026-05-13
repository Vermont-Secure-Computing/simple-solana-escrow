import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      buffer: "buffer",
      process: "process",
      events: "events",
      stream: "stream-browserify",
      util: "util",
    },
  },
  define: {
    global: "globalThis",
    "process.env": {},
  },
  optimizeDeps: {
    include: [
      "buffer",
      "process",
      "events",
      "stream-browserify",
      "util",
      "@coral-xyz/anchor",
      "@solana/web3.js",
    ],
  },
});

