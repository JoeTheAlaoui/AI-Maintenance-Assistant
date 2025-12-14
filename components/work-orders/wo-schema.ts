import { z } from "zod"

export const workOrderSchema = z.object({
    description: z.string().min(10, {
        message: "Description must be at least 10 characters.",
    }),
    priority: z.enum(["low", "medium", "high", "critical"]),
    status: z.enum(["open", "in_progress", "closed"]),
    asset_id: z.string().min(1, { message: "Please select an asset." }),
    assigned_to: z.string().optional(),
    solution_notes: z.string().optional(),
})

export type WorkOrderFormValues = z.infer<typeof workOrderSchema>
