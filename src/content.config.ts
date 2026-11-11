import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const posts = defineCollection({
  loader: glob({
    pattern: "**/index.mdx",
    base: "./src/content/posts",
    // 폴더 이름이 slug다: llm/index.mdx → llm
    generateId: ({ entry }) => entry.replace(/\/index\.mdx$/, ""),
  }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    date: z.coerce.date(),
    draft: z.boolean().default(false),
    // 홈 목차용 (모두 선택). 없으면 "그 밖의 글"에 제목 그대로 들어간다.
    category: z.enum(["basics", "vision", "language", "generative", "context"]).optional(),
    shortTitle: z.string().optional(),
    authors: z.string().optional(),
    paperYear: z.number().int().optional(),
    kind: z.enum(["lab", "qa", "concept", "research"]).default("lab"),
    order: z.number().default(0),
  }),
});

export const collections = { posts };
