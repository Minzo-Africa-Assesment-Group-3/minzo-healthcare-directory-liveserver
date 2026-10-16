import "dotenv/config";
import { z } from "zod";

const logLevels = ["fatal", "error", "warn", "info", "debug", "trace", "silent"] as const;

function isPostgresUrl(value: string): boolean {
    try {
        const url = new URL(value);
        return (
            (url.protocol === "postgresql:" || url.protocol === "postgres:") &&
            url.hostname.length > 0 &&
            url.pathname.length > 1
        );
    } catch {
        return false;
    }
}

const corsAllowedOriginsSchema = z
    .string()
    .trim()
    .min(1)
    .transform((value) =>
        value
            .split(",")
            .map((origin) => origin.trim())
            .filter((origin) => origin.length > 0),
    )
    .pipe(z.array(z.string().url()).min(1))
    .transform((origins) => [
        ...new Set(origins.map((origin) => new URL(origin).origin)),
    ]);

const hexadecimalSecretSchema = (name: string) =>
    z.string().trim().regex(
        /^[a-fA-F0-9]{64}$/,
        `${name} must be a 64-character hexadecimal secret`,
    );

const environmentSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    HOST: z.string().trim().min(1).default("127.0.0.1"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    LOG_LEVEL: z.enum(logLevels).default("info"),
    DATABASE_URL: z.string().trim().refine(isPostgresUrl, {
        message: "DATABASE_URL must be a valid PostgreSQL connection URL"
    }),
    CORS_ALLOWED_ORIGINS: corsAllowedOriginsSchema.default("http://localhost:5173"),
    TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(10).default(0),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).max(3_600_000).default(60_000),
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().min(1).max(100_000).default(120),
    SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().max(300_000).default(10_000),
    JWT_ACCESS_SECRET: hexadecimalSecretSchema("JWT_ACCESS_SECRET"),
    JWT_ISSUER: z.string().trim().min(1).default("minzo-africa-api"),
    JWT_AUDIENCE: z.string().trim().min(1).default("minzo-africa-web"),
    JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(900),
    REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().min(3_600).max(7_776_000).default(2_592_000),
    ADMIN_JWT_ACCESS_SECRET: hexadecimalSecretSchema("ADMIN_JWT_ACCESS_SECRET"),
    ADMIN_JWT_AUDIENCE: z.string().trim().min(1).default("minzo-africa-admin"),
    ADMIN_JWT_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(1_800).default(600),
    ADMIN_REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().min(3_600).max(604_800).default(86_400),
    ADMIN_LOGIN_OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(600).default(300),
    ADMIN_LOGIN_OTP_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
    ADMIN_LOGIN_OTP_HMAC_SECRET: hexadecimalSecretSchema("ADMIN_LOGIN_OTP_HMAC_SECRET"),
    RESEND_API_KEY: z.string().trim().startsWith("re_"),
    EMAIL_FROM: z.string().trim().min(1),
    FRONTEND_URL: z.string().trim().url(),
    EMAIL_VERIFICATION_TOKEN_TTL_SECONDS: z.coerce.number().int().min(300).max(604_800).default(86_400),
    LOGIN_OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
    LOGIN_OTP_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
    LOGIN_OTP_HMAC_SECRET: hexadecimalSecretSchema("LOGIN_OTP_HMAC_SECRET"),
    SUPABASE_URL: z.string().trim().url(),
    SUPABASE_SECRET_KEY: z.string().trim().startsWith("sb_secret_").min(20),
    SUPABASE_BUSINESS_CLAIMS_BUCKET: z
        .string()
        .trim()
        .min(3)
        .max(63)
        .regex(
            /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
            "SUPABASE_BUSINESS_CLAIMS_BUCKET must be a valid bucket name",
        ),
    SUPABASE_BUSINESS_REGISTRATIONS_BUCKET: z
        .string()
        .trim()
        .min(3)
        .max(63)
        .regex(
            /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
            "SUPABASE_BUSINESS_REGISTRATIONS_BUCKET must be a valid bucket name",
        ),
    SUPABASE_BUSINESS_MEDIA_BUCKET: z
        .string()
        .trim()
        .min(3)
        .max(63)
        .regex(
            /^[a-z0-9][a-z0-9.-]*[a-z0-9]$/,
            "SUPABASE_BUSINESS_MEDIA_BUCKET must be a valid bucket name",
        ),
});


export type Environment = z.infer<typeof environmentSchema>;

export function loadEnvironment(
    source: NodeJS.ProcessEnv = process.env,
): Environment {
    const result = environmentSchema.safeParse(source);

    if (!result.success) {
        const details = result.error.issues
            .map((issue) => {
                const path =
                    issue.path.join(".") || "environment";

                return `${path}: ${issue.message}`;
            })
            .join("\n");

        throw new Error(
            `Invalid environment configuration:\n${details}`,
        );
    }

    return Object.freeze(result.data);
}
