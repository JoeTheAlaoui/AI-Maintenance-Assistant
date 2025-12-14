import { z } from "zod"

export const assetSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    code: z.string().min(2, {
        message: "Code must be at least 2 characters.",
    }),
    location: z.string().min(2, {
        message: "Location must be at least 2 characters.",
    }),
    status: z.enum(["operational", "down", "maintenance"]),
})

export type AssetFormValues = z.infer<typeof assetSchema>
