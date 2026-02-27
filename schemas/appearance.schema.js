const { z } = require("zod");

const appearanceSchema = z.object({
  accent_color: z.string().max(20).optional(),
  bg_style: z.enum(["solid", "gradient", "mesh"]).optional(),
  font_family: z.string().max(50).optional(),
  button_radius: z.enum(["sm", "md", "lg", "full"]).optional(),
  dark_mode: z.boolean().optional(),
  show_avatar: z.boolean().optional(),
});

module.exports = { appearanceSchema };