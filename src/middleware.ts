import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async ({ cookies, locals, url }, next) => {
    const adminPass = import.meta.env.ADMIN_PASS;
    const cookie = cookies.get("admin_auth");
    const isAdmin = !!(adminPass && cookie?.value === adminPass);
    (locals as any).isAdmin = isAdmin;

    const response = await next();

    const contentType = response.headers.get("content-type") ?? "";
    const isHtml = contentType.includes("text/html");
    const isApi = url.pathname.startsWith("/api/");

    // ── Edge-cacheable HTML for paid traffic ─────────────────────────────────
    // Admin sessions bypass the edge cache entirely (live edits must never be
    // served to real visitors). Anonymous visitors get a short s-maxage with
    // long stale-while-revalidate so Cloudflare can serve HTML from the nearest
    // POP in ~20ms globally while we revalidate in the background.
    //
    // NOTE: For this to actually cache at Cloudflare's edge you must add a
    // Cache Rule in the CF dashboard:
    //   - Match: hostname = lp.e2.agency AND NOT starts_with(/api/)
    //   - Action: Eligible for cache = On, Respect origin cache control = On
    // Without that rule CF only caches static assets by default.
    if (isHtml && !isApi) {
        if (isAdmin) {
            response.headers.set("Cache-Control", "private, no-store");
        } else {
            response.headers.set(
                "Cache-Control",
                "public, max-age=0, s-maxage=60, stale-while-revalidate=86400"
            );
        }
    }

    // ── Security headers (applied to HTML responses only) ─────────────────────
    // Closes the Lighthouse "Best Practices" gaps: HSTS, clickjacking, COOP,
    // Referrer-Policy, Permissions-Policy. CSP is intentionally NOT set here —
    // we embed third-party iframes (Formflow, Bunny Stream) + inline scripts
    // (PostHog stub, Meta pixel) + analytics with dynamic hashes, so a strict
    // CSP would need per-request nonces. Left for a dedicated follow-up if a
    // security audit ever demands it; for a paid landing page the XFO + HSTS
    // combo covers 95% of the real threat model.
    if (isHtml) {
        // Force HTTPS for 2y on all subdomains, opt into HSTS preload lists.
        response.headers.set(
            "Strict-Transport-Security",
            "max-age=63072000; includeSubDomains; preload"
        );
        // Prevent clickjacking: refuse to render this page inside any frame.
        response.headers.set("X-Frame-Options", "DENY");
        // Don't leak the full URL to Formflow / Meta / PostHog referers.
        response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
        // Lock down cross-origin iframe attack surface.
        response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
        // Disable browser features we never use — tightens Permissions-Policy.
        response.headers.set(
            "Permissions-Policy",
            "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()"
        );
        // Block MIME sniffing on everything we serve.
        response.headers.set("X-Content-Type-Options", "nosniff");
    }

    return response;
});
