import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async ({ cookies, locals }, next) => {
    const adminPass = import.meta.env.ADMIN_PASS;
    const cookie = cookies.get("admin_auth");
    (locals as any).isAdmin = !!(adminPass && cookie?.value === adminPass);
    return next();
});
