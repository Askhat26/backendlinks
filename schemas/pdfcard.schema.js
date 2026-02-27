const { z } = require("zod");

const pdfCardSchema = z.object({
  template: z
    .enum(["classic", "minimal", "bold", "elegant"])
    .optional(),
  theme: z
    .enum(["coral", "ocean", "forest", "midnight", "rose", "violet"])
    .optional(),
  name: z.string().max(100).optional(),
  title: z.string().max(100).optional(),
  email: z
    .string()
    .email()
    .max(255)
    .optional()
    .or(z.literal("")), // allow empty string as "no email"
  phone: z.string().max(50).optional(),
  website: z.string().max(500).optional(),
  bio: z.string().max(300).optional(),
});

module.exports = { pdfCardSchema };