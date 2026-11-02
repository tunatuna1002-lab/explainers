import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

// 배포 대상은 아직 정해지지 않았다. site·base는 환경 변수로 받는다.
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.BASE_PATH || "/",
  integrations: [mdx(), react()],
  vite: { plugins: [tailwindcss()] },
});
