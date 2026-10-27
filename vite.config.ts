import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5180,
    host: true,
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/]node_modules[\\/](jspdf|html2canvas|dompurify|fflate|canvg)/.test(id)) {
            return "pdf";
          }
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)/.test(id)) {
            return "vendor";
          }
          return undefined;
        },
      },
    },
  },
});
