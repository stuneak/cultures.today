import { z } from "zod";

export const nationQuerySchema = z.object({
  search: z.string().optional(),
  state: z.enum(["approved", "pending"]).optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
});

export const nationSubmitSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  boundaryGeoJson: z.string().optional(), // GeoJSON string with MultiPolygon geometry
});

export const nationUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  flagUrl: z.string().optional(),
  boundaryGeoJson: z.string().optional(),
  state: z.enum(["approved", "pending"]).optional(),
});

export type NationQuery = z.infer<typeof nationQuerySchema>;
export type NationSubmit = z.infer<typeof nationSubmitSchema>;
export type NationUpdate = z.infer<typeof nationUpdateSchema>;
