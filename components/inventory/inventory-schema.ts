import { z } from "zod"

export const inventorySchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    reference: z.string().min(2, {
        message: "Reference must be at least 2 characters.",
    }),
    stock_qty: z.number().int().min(0, {
        message: "Stock quantity must be a non-negative integer.",
    }),
    min_threshold: z.number().int().min(0, {
        message: "Minimum threshold must be a non-negative integer.",
    }),
    location: z.string().optional(),
})

export type InventoryFormValues = z.infer<typeof inventorySchema>
