import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		published: z.date(),
		updated: z.date().optional(),
		draft: z.boolean().optional().default(false),
		description: z.string().optional().default(""),
		image: z.string().optional().default(""),
		tags: z.array(z.string()).optional().default([]),
		category: z.string().optional().nullable().default(""),
		lang: z.string().optional().default(""),

		/* For internal use */
		prevTitle: z.string().default(""),
		prevSlug: z.string().default(""),
		nextTitle: z.string().default(""),
		nextSlug: z.string().default(""),
	}),
});

const productsCollection = defineCollection({
	schema: z.object({
		title: z.string(),
		description: z.string(),
		image: z.string(),
		platform: z.string(),
		type: z.string(),
		techStack: z.array(z.string()),
		status: z.string().optional(),
		demo: z.string().optional(),
		category: z.string().optional(),
		tags: z.array(z.string()).optional().default([]),
		draft: z.boolean().optional().default(false),
		lang: z.string().optional().default(""),
	}),
});

export const collections = {
	posts: postsCollection,
	products: productsCollection,
};