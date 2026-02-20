import { env } from "./env.js";

const baseCookieOptions = {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    path: "/",
};

if (env.COOKIE_DOMAIN) {
    baseCookieOptions.domain = env.COOKIE_DOMAIN;
}

export const accessTokenCookieOptions = Object.freeze({
    ...baseCookieOptions,
    maxAge: env.ACCESS_COOKIE_MAX_AGE_MS,
});

export const refreshTokenCookieOptions = Object.freeze({
    ...baseCookieOptions,
    maxAge: env.REFRESH_COOKIE_MAX_AGE_MS,
});

export const clearCookieOptions = Object.freeze({
    ...baseCookieOptions,
});
