import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const category = z.enum(['hunting', 'fishing', 'outdoor', 'patriotic']);

const productType = z.enum([
  'tee',
  'hoodie',
  'tank-top',
  'mug-11oz',
  'mug-15oz',
  'tumbler-22oz',
  'tumbler-40oz',
  'can-cooler',
  'whiskey-glass',
  'shot-glass',
  'pint-glass',
  'mixing-glass',
  'vinyl-decal',
  'vinyl-sticker',
  'car-magnet',
  'phone-case',
]);

const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    title: z.string(),
    category,
    product_type: productType,
    list_price: z.number(),
    sale_price: z.number().optional(),
    free_shipping: z.boolean().default(true),
    etsy_listing_url: z.string().url().optional(),
    etsy_listing_id: z.string().optional(),
    short_description: z.string(),
    product_features: z.array(z.string()).default([]),
    care_instructions: z.array(z.string()).default([]),
    images: z
      .array(
        z.object({
          src: z.string(),
          alt: z.string(),
        }),
      )
      .default([]),
    tags: z.array(z.string()).default([]),
    featured: z.boolean().default(false),
    publish_date: z.coerce.date().optional(),
  }),
});

const giftGuides = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/gift-guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    hero_intro: z.string(),
    featured_products: z.array(z.string()).default([]),
    publish_date: z.coerce.date(),
    updated_date: z.coerce.date().optional(),
  }),
});

export const collections = { products, 'gift-guides': giftGuides };
