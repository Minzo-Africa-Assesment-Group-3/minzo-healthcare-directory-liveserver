import { initContract } from "@ts-rest/core";
import z from "zod";

export const getMyProfileContract = initContract().query({
    method: "GET",
    path: "/api/v1/me",
    query: z.object({}).strict(),
    strictStatusCodes: true,
    summary: "Get my profile",
    description: "Returns the signed-in user's profile.",
    responses: {
        200: z.object({
            id: z.string().uuid(),
            displayName: z.string(),
            email: z.string().email(),
            phone: z.string().nullable(),
            status: z.enum(["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"]),
            emailVerifiedAt: z.string().datetime().nullable(),
            createdAt: z.string().datetime(),
        })
    },
    metadata: {
        authentication: "user-access-token",
        openApiTags: ["My Account"],
    },
})