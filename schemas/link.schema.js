const { z } = require("zod");

const createLinkSchema = z.object({
  title: z.string().trim().min(1).max(200),
  url: z.string().trim().url("Invalid URL").max(2000),
  enabled: z.boolean().optional().default(true),
  position: z.number().int().optional().default(0),
});

const updateLinkSchema = createLinkSchema.partial();

const reorderSchema = z.object({
  order: z.array(
    z.object({
      // Mongo ObjectId as a 24-char hex string
      id: z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, "Invalid link ID"),
      position: z.number().int(),
    })
  ),
});

module.exports = { createLinkSchema, updateLinkSchema, reorderSchema };