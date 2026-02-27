const { z } = require("zod");

const updateProfileSchema = z.object({
  full_name: z.string().trim().min(1).max(100).optional(),
  username: z
    .string()
    .trim()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9_-]+$/, "Lowercase letters, numbers, underscores, hyphens only")
    .optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
});

const changePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(128),
});

module.exports = { updateProfileSchema, changePasswordSchema };