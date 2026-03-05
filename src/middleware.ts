import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async ({ cookies, locals }, next) => {
    const adminPass = import.meta.env.ADMIN_PASS;
    const cookie = cookies.get("admin_auth");
    (locals as any).isAdmin = !!(adminPass && cookie?.value === adminPass);

    const response = await next();

    // ── Non-blocking CSS: convert Astro's render-blocking stylesheet to a preload ──
    // Only applies to HTML responses; skips API routes, assets, etc.
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) return response;

    let html = await response.text();

    // Regex: match <link rel="stylesheet" href="/_astro/...css">
    // Astro sometimes puts rel before or after href — handle both.
    html = html.replace(
        /<link([^>]*)rel="stylesheet"([^>]*)href="(\/_astro\/[^"]+\.css)"([^>]*)>/g,
        (_, pre, mid, href, post) =>
            `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'">${""}<noscript><link rel="stylesheet" href="${href}"></noscript>`
    );
    // Also handle href-first ordering
    html = html.replace(
        /<link([^>]*)href="(\/_astro\/[^"]+\.css)"([^>]*)rel="stylesheet"([^>]*)>/g,
        (_, pre, href, mid, post) =>
            `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'">${""}<noscript><link rel="stylesheet" href="${href}"></noscript>`
    );

    return new Response(html, {
        status: response.status,
        headers: response.headers,
    });
});
