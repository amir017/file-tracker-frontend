import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

import tailwind from "@tailwindcss/vite";
import fs from "fs";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();
const env = process.env;
console.log("env.VITE_API_BASE_UR", env.VITE_API_BASE_UR);
export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    // ⛔ REMOVE the https block completely
    host: "localhost",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
