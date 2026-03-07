import { defineConfig } from "vite";

export default defineConfig({
  base: "/jump/",
  server: {
    host: "0.0.0.0",
    port: 8080
  },
  preview: {
    host: "0.0.0.0",
    port: 8080
  }
});
