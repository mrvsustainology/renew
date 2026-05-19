import { z } from "zod";
import { FEEDSTOCK_TYPES } from "../constants/feedstockTypes";

export const CreateFeedstockSchema = z.object({
  date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD"),
  type:        z.enum(FEEDSTOCK_TYPES),
  weight:      z.number().positive("Weight must be positive"),
  type2:       z.enum(FEEDSTOCK_TYPES).optional(),
  weight2:     z.number().positive("Weight must be positive").optional(),
  waterLitres: z.number().min(0).default(0),
  notes:       z.string().optional(),
}).refine(
  data => !(!!data.type2 !== !!data.weight2),
  { message: "type2 and weight2 must both be provided or both omitted" }
);

export type CreateFeedstockDto = z.infer<typeof CreateFeedstockSchema>;