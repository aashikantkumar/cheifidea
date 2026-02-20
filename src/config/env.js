import dotenv from "dotenv";

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || ".env" });

const ALLOWED_NODE_ENVS = new Set(["development", "test", "production"]);
const ALLOWED_SAME_SITE_VALUES = new Set(["lax", "strict", "none"]);

const parseBoolean = (value, defaultValue = false) => {
    if (value === undefined || value === null || value === "") {
        return defaultValue;
    }

    const normalized = String(value).trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "off"].includes(normalized)) return false;

    throw new Error(`[env] Invalid boolean value: ${value}`);
};

const parseNumber = (value, defaultValue) => {
    const source = value ?? defaultValue;
    const parsed = Number(source);

    if (!Number.isFinite(parsed)) {
        throw new Error(`[env] Invalid numeric value: ${source}`);
    }

    return parsed;
};

const requireEnv = (name) => {
    const value = process.env[name];
    if (!value || value.trim() === "") {
        throw new Error(`[env] Missing required environment variable: ${name}`);
    }
    return value.trim();
};

const normalizeOrigins = (...originCandidates) => {
    const origins = [];

    for (const candidate of originCandidates) {
        if (!candidate) continue;

        for (const origin of String(candidate)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)) {
            origins.push(origin);
        }
    }

    return [...new Set(origins)];
};

const NODE_ENV = (process.env.NODE_ENV || "development").trim().toLowerCase();
if (!ALLOWED_NODE_ENVS.has(NODE_ENV)) {
    throw new Error(
        `[env] NODE_ENV must be one of: ${[...ALLOWED_NODE_ENVS].join(", ")}`
    );
}

const IS_PRODUCTION = NODE_ENV === "production";
const COOKIE_SECURE = parseBoolean(process.env.COOKIE_SECURE, IS_PRODUCTION);
const COOKIE_SAME_SITE = (
    process.env.COOKIE_SAME_SITE || (IS_PRODUCTION ? "none" : "lax")
)
    .trim()
    .toLowerCase();

if (!ALLOWED_SAME_SITE_VALUES.has(COOKIE_SAME_SITE)) {
    throw new Error(
        `[env] COOKIE_SAME_SITE must be one of: ${[...ALLOWED_SAME_SITE_VALUES].join(
            ", "
        )}`
    );
}

if (COOKIE_SAME_SITE === "none" && !COOKIE_SECURE) {
    throw new Error(
        "[env] COOKIE_SECURE must be true when COOKIE_SAME_SITE is set to none"
    );
}

const CORS_ALLOWLIST = normalizeOrigins(
    process.env.CORS_ALLOWLIST,
    process.env.CORS_ORIGIN,
    process.env.USER_WEBSITE_URL,
    process.env.CHEF_WEBSITE_URL
);

if (IS_PRODUCTION && CORS_ALLOWLIST.length === 0) {
    throw new Error(
        "[env] At least one CORS origin must be configured in production"
    );
}

export const env = Object.freeze({
    NODE_ENV,
    IS_PRODUCTION,
    PORT: parseNumber(process.env.PORT, 8000),
    DB_NAME: process.env.DB_NAME?.trim() || "cheifidea_db",
    MONGODB_URI: requireEnv("MONGODB_URI"),

    ACCESS_TOKEN_SECRET: requireEnv("ACCESS_TOKEN_SECRET"),
    ACCESS_TOKEN_EXPIRY: process.env.ACCESS_TOKEN_EXPIRY?.trim() || "15m",
    REFRESH_TOKEN_SECRET: requireEnv("REFRESH_TOKEN_SECRET"),
    REFRESH_TOKEN_EXPIRY: process.env.REFRESH_TOKEN_EXPIRY?.trim() || "7d",

    CLOUDINARY_CLOUD_NAME: requireEnv("CLOUDINARY_CLOUD_NAME"),
    CLOUDINARY_API_KEY: requireEnv("CLOUDINARY_API_KEY"),
    CLOUDINARY_API_SECRET: requireEnv("CLOUDINARY_API_SECRET"),

    CORS_ALLOWLIST,
    TRUST_PROXY: parseBoolean(process.env.TRUST_PROXY, false),

    RATE_LIMIT_WINDOW_MS: parseNumber(
        process.env.RATE_LIMIT_WINDOW_MS,
        15 * 60 * 1000
    ),
    RATE_LIMIT_MAX: parseNumber(process.env.RATE_LIMIT_MAX, 300),

    UPLOAD_DIR: process.env.UPLOAD_DIR?.trim() || "/tmp/cheifidea/uploads",

    COOKIE_SECURE,
    COOKIE_SAME_SITE,
    COOKIE_DOMAIN: process.env.COOKIE_DOMAIN?.trim() || undefined,
    ACCESS_COOKIE_MAX_AGE_MS: parseNumber(
        process.env.ACCESS_COOKIE_MAX_AGE_MS,
        15 * 60 * 1000
    ),
    REFRESH_COOKIE_MAX_AGE_MS: parseNumber(
        process.env.REFRESH_COOKIE_MAX_AGE_MS,
        7 * 24 * 60 * 60 * 1000
    ),

    LOG_LEVEL: process.env.LOG_LEVEL?.trim() || "info",
});
