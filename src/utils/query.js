export const escapeRegex = (value) =>
    String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const sanitizeSearchTerm = (value, maxLength = 64) =>
    String(value || "")
        .trim()
        .slice(0, maxLength);

export const getPagination = (
    query,
    { defaultPage = 1, defaultLimit = 10, maxLimit = 100 } = {}
) => {
    const page = Math.max(Number(query.page) || defaultPage, 1);
    const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), maxLimit);

    return {
        page,
        limit,
        skip: (page - 1) * limit,
    };
};
