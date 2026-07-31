import { z } from "zod";

function slugify(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const createCategorySchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, "Name must be at least 2 characters"),
      description: z.string().trim().optional(),
    })
    .strict(),
});

export const updateCategorySchema = z.object({
  params: z.object({ id: z.string().uuid("Invalid category id") }),
  body: z
    .object({
      name: z.string().trim().min(2).optional(),
      description: z.string().trim().optional(),
    })
    .strict(),
});

export { slugify };
