# Astro 6 + Cloudflare Workers Landing Page Playbook

A battle-tested, opinionated guide for shipping a **world-class** paid-traffic
landing page on Astro 6 + Cloudflare Workers. Distilled from migrating
`workwith.e2.agency` (Astro 5 on Cloudflare Pages → Astro 6 on Workers) with a
full performance + tracking overhaul.

> **Target outcome:** sub-second LCP, zero FOUC, A-grade PSI, pixel +
> server-side CAPI tracking, edge-cached HTML, zero-downtime deploys, ready
> for $10K+/wk paid spend.

---

## Table of contents

1. [Prerequisites](#prerequisites)
2. [Phase 1 — Baseline audit](#phase-1--baseline-audit)
3. [Phase 2 — Astro 5 → 6 upgrade](#phase-2--astro-5--6-upgrade)
4. [Phase 3 — Pages → Workers migration](#phase-3--pages--workers-migration)
5. [Phase 4 — The FOUC fix](#phase-4--the-fouc-fix)
6. [Phase 5 — LCP optimization](#phase-5--lcp-optimization)
7. [Phase 6 — Animations without the framework](#phase-6--animations-without-the-framework)
8. [Phase 7 — Image optimization](#phase-7--image-optimization)
9. [Phase 8 — Security + edge caching](#phase-8--security--edge-caching)
10. [Phase 9 — Tracking (Meta Pixel + PostHog + CAPI)](#phase-9--tracking)
11. [Phase 10 — DNS cutover](#phase-10--dns-cutover)
12. [Phase 11 — Launch-day checklist](#phase-11--launch-day-checklist)
13. [Gotchas we hit](#gotchas-we-hit)
14. [Quick reference commands](#quick-reference-commands)

---

## Prerequisites

- **Node 22.12.0+** (Workers runtime requires this). Create `.nvmrc`:
  ```
  22.12.0
  ```
- **Cloudflare account** with Workers enabled + the domain on Cloudflare DNS.
- **Wrangler CLI**: `npx wrangler@latest` (4.83+).
- **git** on a feature branch, never on `main` during migration.
- **An ads-side pixel ID** (Meta, Google, TikTok — whichever you're running).
- **PostHog project key** if you want server-side CAPI.

---

## Phase 1 — Baseline audit

> Do this **before** changing anything so you can prove improvement.

1. **Run Lighthouse / PSI on mobile 3 times**, record LCP/TBT/CLS medians.
   ```bash
   npx lighthouse https://<current-prod> --preset=perf --form-factor=mobile \
     --output=html --output-path=./baseline.html
   ```
2. **Screenshot the waterfall** in Chrome DevTools Network tab. Find:
   - Actual LCP element (hover the LCP entry in Performance Insights tab)
   - Any fonts requested after FCP
   - Any blocking scripts in `<head>`
   - Any >100 KB image
3. **Inventory tracking scripts** and cost per 100k hits:
   - Meta Pixel: ~80 KB
   - GTM: ~40 KB + tags
   - PostHog: ~50 KB
   - PixelFlow / Hotjar / FullStory: 100 KB+ each
4. **Write down the REAL LCP element** (usually an H1, NOT the logo).

---

## Phase 2 — Astro 5 → 6 upgrade

Astro 6 is mostly drop-in. The breaking changes that bit us:

### 2a. Bump versions

```bash
npm install astro@latest @astrojs/cloudflare@latest @astrojs/react@latest \
            @astrojs/node@latest @astrojs/sitemap@latest
```

Verify:
```bash
npm ls astro @astrojs/cloudflare
# astro should be 6.x, @astrojs/cloudflare 13.x+
```

### 2b. Update `astro.config.mjs`

```javascript
// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://your-prod-domain.com',    // ← canonical, OG:url
  output: 'server',
  adapter: cloudflare(),
  integrations: [react()],
  build: {
    // 🔑 KEY SETTING. Inlines every CSS chunk into <head>.
    // Single biggest FOUC killer + LCP win.
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      target: 'es2022',   // modern JS only, drops ~30% client bundle
    },
  },
});
```

### 2c. Clean build + type check

```bash
rm -rf node_modules dist .astro
npm install
npx astro check        # fix any type errors before moving on
npm run build          # expect success
```

If `astro check` hangs: kill it. Build success is enough signal.

---

## Phase 3 — Pages → Workers migration

> **Critical:** Astro 6's Cloudflare adapter v13 **no longer supports Pages.**
> You *must* migrate to Workers or stay on Astro 5.

### 3a. Create a new Worker + KV (via dashboard OR MCP)

In dashboard:
1. **Workers & Pages** → **Create** → **Create Worker** → name it
   (e.g. `myproject-landing`). Skip the starter template.
2. **Storage & Databases** → **KV** → **Create namespace** named
   `myproject-SESSION`. Copy the namespace ID.

### 3b. Create `wrangler.jsonc` in repo root

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "myproject-landing",
  // ⚠️ THIS EXACT PATH — not dist/_worker.js or dist/server/entry.mjs
  "main": "@astrojs/cloudflare/entrypoints/server",
  "compatibility_date": "2025-05-21",
  "compatibility_flags": ["nodejs_compat"],
  "account_id": "<your-account-id>",
  "assets": {
    "binding": "ASSETS",
    "directory": "./dist/client"
  },
  "kv_namespaces": [
    { "binding": "SESSION", "id": "<kv-namespace-id>" }
  ],
  "images": {
    "binding": "IMAGES"    // Astro 6's default image service
  },
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  },
  "vars": {
    // PUBLIC_* vars are also inlined by Vite at build
    "PUBLIC_SITE_URL": "https://your-prod-domain.com",
    "PUBLIC_META_PIXEL_ID": ""
  }
  // Secrets go via `npx wrangler secret put NAME` — never committed
}
```

### 3c. Update `.gitignore`

```
.dev.vars
.wrangler/
```

### 3d. Deploy to staging URL

```bash
npx wrangler login          # one-time
npm run build
npx wrangler deploy
# → Deploys to https://<name>.<subdomain>.workers.dev
```

### 3e. Set secrets (not vars)

```bash
echo "<secret-value>" | npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
echo "<secret-value>" | npx wrangler secret put ADMIN_PASS
# etc. — anything sensitive
```

---

## Phase 4 — The FOUC fix

FOUC is 99% caused by **CSS being in an external file the browser hasn't
fetched yet**. The fix is to inline it.

Already done via `inlineStylesheets: 'always'` in Phase 2. But verify:

```bash
npm run build
# look in dist/client/index.html — all CSS should be in <style> tags,
# ZERO <link rel="stylesheet">
```

If you still see FOUC on first paint after this:

- **Check middleware** — some codebases (ours did) were doing aggressive
  CSS preload rewrites that caused the issue. Remove any logic that
  touches CSS asset URLs.
- **Check for `client:load` components** — React/Svelte islands with their
  own CSS can cause micro-FOUC. Either preload them or lazy-reveal the
  section with a CSS transition.

---

## Phase 5 — LCP optimization

The #1 mistake: **preloading the wrong resource.** Find the real LCP
element first.

### 5a. Find the real LCP

Chrome DevTools → **Performance Insights** tab → record load → hover
"LCP" timeline marker. The highlighted element is your LCP.

Common mistakes:
- "The logo is at the top, it must be the LCP" — **NO.** Logos are
  usually <5 KB and render in the first RTT. The LCP is almost always
  the **headline H1** or the **hero image**.
- Preloading the logo WITH `fetchpriority="high"` actively **steals
  bandwidth from the real LCP font**, making things slower.

### 5b. Preload the right thing

If LCP is **text** (most landing pages):

```html
<!-- Preload the EXACT weight/style the H1 uses -->
<link
  rel="preload"
  href="/fonts/DMSans-700.woff2"     ← 700 weight because h1 is bold
  as="font"
  type="font/woff2"
  crossorigin
  fetchpriority="high"
/>
<!-- Body text font second, no fetchpriority -->
<link
  rel="preload"
  href="/fonts/DMSans-400.woff2"
  as="font"
  type="font/woff2"
  crossorigin
/>
```

If LCP is an **image**:

```html
<link
  rel="preload"
  as="image"
  href="/hero.webp"
  fetchpriority="high"
  imagesrcset="/hero-600.webp 600w, /hero-1200.webp 1200w"
  imagesizes="(max-width: 768px) 100vw, 50vw"
/>
```

### 5c. Preconnect / dns-prefetch for third parties

```html
<!-- PostHog / pixels / video / fonts on CDN -->
<link rel="preconnect" href="https://us-assets.i.posthog.com" crossorigin />
<link rel="dns-prefetch" href="https://connect.facebook.net" />
<link rel="dns-prefetch" href="https://myformflow.io" />
```

**Rule:** `preconnect` for resources you'll load early (gives TCP+TLS
warmup). `dns-prefetch` for resources you'll load later or conditionally.
Max ~4 preconnects total or you'll thrash connection slots.

### 5d. `font-display: swap`

In `@font-face`:

```css
@font-face {
  font-family: 'DMSans';
  src: url('/fonts/DMSans-700.woff2') format('woff2');
  font-weight: 700;
  font-display: swap;    /* render fallback immediately, swap when ready */
}
```

---

## Phase 6 — Animations without the framework

GSAP was burning **40 KB** in our codebase to animate 7 hero elements.
Worse: the animations were *scroll-triggered*, meaning the hero briefly
showed as `opacity: 0` before GSAP initialized after `DOMContentLoaded`.

### 6a. Delete GSAP

```bash
npm uninstall gsap
```

Remove all `data-animate` attributes from **above-the-fold** elements
(hero logo, badge, H1, subhead, CTA, VSL). They should render instantly.

### 6b. Replace with lightweight IntersectionObserver

Below-the-fold reveals are fine — use native IO + CSS transitions:

```html
<script is:inline>
  (function () {
    var reveal = document.querySelectorAll("[data-animate]");
    var counters = document.querySelectorAll("[data-counter]");

    if (!("IntersectionObserver" in window)) {
      reveal.forEach(el => el.classList.add("is-visible"));
      counters.forEach(el => el.textContent = el.dataset.counter);
      return;
    }

    var io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -10% 0px", threshold: 0.01 });

    reveal.forEach(el => io.observe(el));

    // Counter animation (e.g. "$225M", "2000+ brands")
    function animateCounter(el) {
      var target = el.dataset.counter || "";
      var prefix = (target.match(/^[^0-9]*/) || [""])[0];
      var suffix = (target.match(/[^0-9]*$/) || [""])[0];
      var num = parseFloat(target.replace(/[^0-9.]/g, ""));
      if (isNaN(num)) { el.textContent = target; return; }
      var start = performance.now();
      var duration = 1600;
      function tick(now) {
        var t = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3);    // easeOutCubic
        var v = num * eased;
        el.textContent = prefix + (num >= 100 ? Math.round(v) : v.toFixed(0)) + suffix;
        if (t < 1) requestAnimationFrame(tick);
        else el.textContent = target;
      }
      requestAnimationFrame(tick);
    }

    var counterIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterIO.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -15% 0px", threshold: 0.01 });
    counters.forEach(el => counterIO.observe(el));
  })();
</script>
```

### 6c. CSS to match

```css
[data-animate] {
  opacity: 0;
  transform: translate3d(0, 20px, 0);
  transition:
    opacity 0.7s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.7s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: opacity, transform;
}
[data-animate].is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}
@media (prefers-reduced-motion: reduce) {
  [data-animate] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

**Savings:** ~40 KB JS + 50-200ms of render delay on the hero.

---

## Phase 7 — Image optimization

Audit your `public/` folder for oversized assets.

### 7a. One-shot optimization script

`scripts/optimize-images.mjs`:

```javascript
import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';

// List of images that need resize/conversion.
// "from" is the source, "to" is the output, "w" is the max width
// based on actual rendered CSS size.
const jobs = [
  { from: 'public/partners/postscript.png', to: 'public/partners/postscript.webp', w: 320 },
  { from: 'public/brand/logo-large.png', to: 'public/brand/logo-large.webp', w: 400 },
  // ... add more
];

for (const job of jobs) {
  const inputSize = (await fs.stat(job.from)).size;
  await sharp(job.from)
    .resize({ width: job.w, withoutEnlargement: true })
    .webp({ quality: 82, effort: 6 })
    .toFile(job.to);
  const outputSize = (await fs.stat(job.to)).size;
  const pct = ((1 - outputSize / inputSize) * 100).toFixed(1);
  console.log(`${path.basename(job.from)}: ${(inputSize/1024).toFixed(1)}KB → ${(outputSize/1024).toFixed(1)}KB (-${pct}%)`);
}
```

Install + run:
```bash
npm install --save-dev sharp
node scripts/optimize-images.mjs
```

### 7b. Use `<picture>` for backwards-compat

```html
<picture>
  <source srcset="/partners/postscript.webp" type="image/webp" />
  <img
    src="/partners/postscript.png"
    alt="Postscript"
    width="110"
    height="28"
    loading="lazy"
    decoding="async"
  />
</picture>
```

**Always specify `width` and `height`** — prevents CLS.

---

## Phase 8 — Security + edge caching

Put both in middleware. Create `src/middleware.ts`:

```typescript
import { defineMiddleware } from "astro:middleware";

export const onRequest = defineMiddleware(async (context, next) => {
  const response = await next();

  const url = new URL(context.request.url);
  const isApi = url.pathname.startsWith("/api/");
  const isAdmin = !!context.cookies.get("admin_session")?.value;
  const contentType = response.headers.get("content-type") ?? "";
  const isHtml = contentType.includes("text/html");

  // ── Edge-cacheable HTML ──────────────────────────────────────────────────
  if (isHtml && !isApi) {
    if (isAdmin) {
      // Admins always see fresh HTML
      response.headers.set("Cache-Control", "private, no-store");
    } else {
      // Anonymous traffic: 60s fresh at edge, 24h stale-while-revalidate
      response.headers.set(
        "Cache-Control",
        "public, max-age=0, s-maxage=60, stale-while-revalidate=86400",
      );
    }
  }

  // ── Security headers ─────────────────────────────────────────────────────
  if (isHtml) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
    response.headers.set("X-Frame-Options", "DENY");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
    response.headers.set(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=()",
    );
    response.headers.set("X-Content-Type-Options", "nosniff");
  }

  return response;
});
```

### Enable the Cloudflare Cache Rule

Middleware sets the *headers* — for Cloudflare to actually cache the HTML,
add a Cache Rule in the dashboard:

```
Dashboard → [your zone] → Caching → Cache Rules → Create rule
  Name: "Cache HTML at edge"
  Expression: (http.host eq "yourdomain.com" and not starts_with(http.request.uri.path, "/api/"))
  Action: Eligible for cache = On, Respect origin cache control = On
```

---

## Phase 9 — Tracking

### 9a. Meta Pixel (browser-side, PageView only)

`src/components/MetaPixel.astro`:

```astro
---
const pixelId = import.meta.env.PUBLIC_META_PIXEL_ID;
---
{pixelId && (
  <>
    <script is:inline define:vars={{ pixelId }}>
      (function () {
        if (window.fbq) return;
        var n = (window.fbq = function () {
          n.callMethod
            ? n.callMethod.apply(n, arguments)
            : n.queue.push(arguments);
        });
        if (!window._fbq) window._fbq = n;
        n.push = n; n.loaded = true; n.version = "2.0"; n.queue = [];

        function boot() {
          var t = document.createElement("script");
          t.async = true;
          t.src = "https://connect.facebook.net/en_US/fbevents.js";
          var s = document.getElementsByTagName("script")[0];
          s.parentNode.insertBefore(t, s);
          fbq("init", pixelId);
          fbq("track", "PageView");
        }

        function schedule() {
          if ("requestIdleCallback" in window) {
            requestIdleCallback(boot, { timeout: 4000 });
          } else {
            setTimeout(boot, 2000);
          }
        }

        if (document.readyState === "complete") {
          schedule();
        } else {
          window.addEventListener("load", schedule, { once: true });
        }
      })();
    </script>
    <noscript>
      <img height="1" width="1" style="display:none" alt=""
        src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`} />
    </noscript>
  </>
)}
```

> ⚠️ Never wrap the inline script body in `{`...`${JSON.stringify(x)}`...`}`
> template literals. Astro passes the template literal through as literal
> text. Just use `define:vars` — it injects `const pixelId = "..."` at the
> top of the script automatically.

### 9b. PostHog (source of truth, defers to after load)

`src/components/PostHog.astro`:

```astro
<script is:inline>
(function(){
  window.posthog=window.posthog||[];
  var _ph=window.posthog;
  if(_ph.__SV)return;
  _ph._i=[]; _ph.__SV=1;
  _ph.init=function(i,s,a){
    function g(t,e){
      var o=e.split(".");
      if(o.length===2){t=t[o[0]]; e=o[1];}
      t[e]=function(){ t.push([e].concat(Array.prototype.slice.call(arguments,0))); };
    }
    var u=_ph;
    if(void 0!==a){u=_ph[a]=[];}else{a="posthog";}
    u.people=u.people||[];
    u.toString=function(t){
      var e="posthog";
      if(a!=="posthog")e+="."+a;
      if(!t)e+=" (stub)";
      return e;
    };
    u.people.toString=function(){return u.toString(1)+".people (stub)";};
    "init capture register register_once unregister identify setPersonProperties reset".split(" ").forEach(function(m){g(u,m);});
    _ph._i.push([i,s,a]);
  };
  window.addEventListener('load', function(){
    function inject(){
      var s=document.createElement('script');
      s.async=true;
      s.src='https://us-assets.i.posthog.com/static/array.js';
      document.head.appendChild(s);
      s.onload=function(){
        if(window.posthog&&window.posthog.init){
          window.posthog.init('phc_YOUR_KEY_HERE', {
            api_host:'https://us.i.posthog.com',
            disable_session_recording:true,
            persistence:'localStorage+cookie',
            cross_subdomain_cookie:true,
            loaded:function(ph){
              // Harvest click IDs for Meta CAPI matching
              try {
                var url = new URL(location.href);
                var sp = {};
                var fbclid = url.searchParams.get('fbclid');
                var gclid = url.searchParams.get('gclid');
                if (fbclid) { sp.fbc = 'fb.1.' + Date.now() + '.' + fbclid; sp.fbclid = fbclid; }
                if (gclid) sp.gclid = gclid;
                var fbpMatch = document.cookie.match(/(?:^|; )_fbp=([^;]+)/);
                if (fbpMatch) sp.fbp = fbpMatch[1];
                if (Object.keys(sp).length) {
                  ph.register_once(sp);
                  ph.setPersonProperties(undefined, sp);
                }
              } catch (e) {}
              ph.capture('$pageview');
            }
          });
        }
      };
    }
    if ('requestIdleCallback' in window) requestIdleCallback(inject, { timeout: 4000 });
    else setTimeout(inject, 2000);
  }, { once: true });
})();
</script>
```

### 9c. PostHog → Meta CAPI destination

**In PostHog dashboard:**
1. `app.posthog.com` → **Data pipeline** → **Destinations** → **New**
2. Pick **Meta Ads**
3. Pixel ID + CAPI token (generate in Meta Events Manager → Settings → Conversions API)
4. **Event filter: `event = "Lead"`** (don't forward `$pageview` — Meta Pixel already does)
5. Save. Test via PostHog's activity tab.

### 9d. Fire `Lead` on form submit

Add a defensive postMessage listener for your form iframe:

```javascript
window.addEventListener("message", function (e) {
  if (e.origin !== "https://your-form-provider.com") return;
  var eventName = (e.data?.event || e.data?.type || "").toLowerCase();
  if (/submit|complete|success|done/.test(eventName) && !window.__leadFired) {
    window.__leadFired = true;
    // Extract email/phone from payload if available
    // Then:
    if (window.posthog) {
      if (email) posthog.identify(email, { email, phone });
      posthog.capture('Lead', { form_id: 'qual_form', email, phone });
    }
    if (window.fbq) fbq('track', 'Lead');    // browser fallback
  }
});
```

Why both browser `fbq('track', 'Lead')` + CAPI? **Redundancy.** Meta
auto-dedupes by event ID, but since we don't pass one, there's a small
amount of harmless double-counting on Lead. CAPI wins the CPA calc because
it's preferred, and you never lose a conversion to an ad blocker.

---

## Phase 10 — DNS cutover

### 10a. Attach custom domain to Worker

1. Dashboard → **Workers & Pages** → click your Worker
2. **Settings** → **Domains & Routes** → **+ Add** → **Custom domain**
3. Enter domain (e.g. `workwith.yourdomain.com`)
4. Cloudflare auto-creates DNS + issues cert (~30 sec)

### 10b. If the domain is attached to an old Pages project

It'll block with an error. Detach first:
1. Find old Pages project → **Custom domains** → remove domain
2. Come back to the Worker and add it

### 10c. Disable Super Bot Fight Mode on the zone

> **This bit us hard.** Super Bot Fight Mode blocks Meta's ad crawler,
> Google Ads quality bot, and Facebook's OG scraper. Real browsers work
> fine, but your ad approval stalls, link previews break, and uptime
> monitors constantly alarm.

Either:

**Option A (nuclear):** Dashboard → **Security** → **Bots** → turn Super
Bot Fight Mode **OFF** for the zone.

**Option B (surgical — recommended):** Dashboard → **Security** → **WAF**
→ **Custom rules** → Create:
```
Name: "LP — allow all, skip bot challenges"
Expression: (http.host eq "workwith.yourdomain.com")
Action: Skip → Super Bot Fight Mode + All managed rules
```

### 10d. Verify cutover

```bash
# Real status from a browser UA
UA="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
curl -sI -A "$UA" https://workwith.yourdomain.com | head -5
# → expect HTTP/2 200
```

---

## Phase 11 — Launch-day checklist

### Tech verification

- [ ] `curl -sI https://prod-domain` → 200
- [ ] Pixel ID in HTML (`grep` for the numeric ID)
- [ ] PostHog key in HTML (`grep` for `phc_`)
- [ ] Security headers present (`curl -sI` output)
- [ ] LCP < 2.5s on throttled 3G (PSI mobile)
- [ ] TBT < 100ms
- [ ] CLS < 0.05
- [ ] `font-display: swap` active (no FOIT)
- [ ] No FOUC on hard refresh (Cmd+Shift+R)
- [ ] No console errors
- [ ] No console warnings from 3rd-party scripts

### Tracking verification

- [ ] Load site → [Meta Pixel Helper](https://chromewebstore.google.com/detail/meta-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc)
      shows 1 green PageView with the right ID
- [ ] Events Manager → Test Events → site URL → PageView appears in real time
- [ ] PostHog → Activity → `$pageview` event with `fbc`, `fbp` properties
      (if you loaded with `?fbclid=test`)
- [ ] Submit test form → PostHog `Lead` event appears in Activity
- [ ] Meta Events Manager → Test Events → `Lead` event appears with high
      Event Match Quality (email/phone/fbp all green)

### Operational readiness

- [ ] Deploy rollback plan (old Worker version saved, can rollback via
      `npx wrangler rollback`)
- [ ] Uptime monitor configured (exempt from WAF via UA whitelist or
      custom rule)
- [ ] Error tracking set up (PostHog error tracking is free, or Sentry)
- [ ] Ad copy + landing page URL tested with real `fbclid` by clicking
      your own ad in preview mode
- [ ] DNS TTL set low (60-300s) in case you need to revert

### Day-of monitoring

```bash
# Tail Worker logs in real time
npx wrangler tail

# Watch for 4xx/5xx spikes
# Cloudflare dashboard → Analytics → HTTP → Status codes
```

---

## Gotchas we hit

> The stuff we wasted hours on. Read this twice.

### 1. Astro 6 + Cloudflare Pages = broken
**Symptom:** Build succeeds, Pages deploy fails silently or 500s.
**Fix:** You must migrate to Workers. No workaround.

### 2. `main` in wrangler.jsonc
**Wrong:** `"main": "./dist/server/entry.mjs"` (old v12 pattern)
**Right:** `"main": "@astrojs/cloudflare/entrypoints/server"`

### 3. `define:vars` + template-literal wrapping
**Wrong:**
```astro
<script is:inline define:vars={{ pixelId }}>
  {`fbq("init", ${JSON.stringify(pixelId)});`}
</script>
```
Renders `fbq("init", ${JSON.stringify(pixelId)})` as literal text → JS SyntaxError.

**Right:**
```astro
<script is:inline define:vars={{ pixelId }}>
  fbq("init", pixelId);
</script>
```
Astro injects `const pixelId = "..."` automatically.

### 4. Edge cache serving stale HTML during testing
**Symptom:** You deploy, curl the URL, don't see your changes.
**Why:** `s-maxage=60` means Cloudflare edge serves cached HTML for 60s.
**Fix:** Append a cache-bust query string: `curl "?cb=$(date +%s)"`

### 5. Preloading the wrong LCP element
**Wrong:** Preload the logo with `fetchpriority="high"` because "it's at
the top".
**Right:** Preload the actual LCP font/image. Use Chrome DevTools
Performance Insights to find the real one.

### 6. Super Bot Fight Mode blocks ad crawlers
**Symptom:** Ads stall in review, link previews broken, `curl` gets 403
while browsers work.
**Fix:** Dashboard → Security → Bots → disable SBFM or create a WAF
custom rule to skip it for your LP hostname.

### 7. Forgetting to attach custom domain in dashboard
**Symptom:** DNS resolves to Cloudflare IPs but you get 403.
**Fix:** Custom domain attachment is a separate step from DNS. Worker +
custom domain must be explicitly linked in dashboard.

### 8. PostHog stub missing methods
If you're copying the stub from older docs, it may not include newer
methods like `setPersonProperties`, `register_for_session`,
`reloadFeatureFlags`. Pull the current stub from PostHog's official
snippet.

### 9. Node version mismatch
Local dev works, Worker deploy fails with runtime errors. Pin `.nvmrc`
to `22.12.0`+ and require it in CI.

### 10. Leaving GSAP "just in case"
40 KB for a 300ms animation that could be a 15-line IntersectionObserver.
Delete it. Your LCP will thank you.

---

## Quick reference commands

```bash
# ── Deploy ──
npm run build && npx wrangler deploy

# ── Roll back to previous version ──
npx wrangler rollback

# ── Tail live production logs ──
npx wrangler tail

# ── Set a secret ──
echo "<value>" | npx wrangler secret put <NAME>

# ── List deployments ──
npx wrangler deployments list

# ── Check which env vars are bound ──
npx wrangler deploy --dry-run --outdir=/tmp/check 2>&1 | grep -A 20 "bindings"

# ── Find build artifacts ──
npm run build && ls -lh dist/client dist/server

# ── Fresh rebuild (clear all caches) ──
rm -rf node_modules dist .astro .wrangler && npm install && npm run build

# ── Cache-busting curl on prod ──
curl -s "https://domain.com?cb=$(date +%s%N)" > /tmp/prod.html
grep -c "<your-tracking-id>" /tmp/prod.html

# ── Optimise images ──
node scripts/optimize-images.mjs
```

---

## Final word

The difference between a 95-score landing page and a 99-score one is
**ruthless discipline about what loads when**:

- Above-the-fold HTML: inlined CSS, correct font preload, no JS blocking.
- First 100ms: only critical resources hit the network.
- 100ms-1s: hero paints, user sees + starts reading.
- `load` event fires.
- After `load` + `requestIdleCallback`: THEN tracking scripts, animations,
  form iframes, analytics.

If it doesn't contribute to the LCP paint, it shouldn't run before load.
Every byte you save is a conversion you keep.

Good luck. Ship fast, measure everything, ignore the vanity metrics that
don't move CPA.
