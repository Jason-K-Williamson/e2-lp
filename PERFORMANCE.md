# ⚡ Performance Rules — landing.e2.agency

Speed = Conversions. Every 100ms of load time costs ~1% conversions.  
These rules are **non-negotiable** for every landing page we build.

## Core Principles

1. **Zero JS by default** — Astro ships 0KB JS unless explicitly opted in via `client:*` directives
2. **Islands only when interactive** — React components hydrate ONLY for forms, timers, interactive CTAs
3. **SSG everything** — All pages are statically generated at build time, no SSR

## Image Rules

- **All images**: Use `<Image />` from `astro:assets` — automatic WebP/AVIF, lazy loading, srcset
- **Hero images**: Preload with `<link rel="preload">` in head, use `loading="eager"`
- **Below-fold images**: Always `loading="lazy"` and `decoding="async"`
- **Max dimensions**: Serve at 2x display size max (e.g. 800px display = 1600px source)
- **No unoptimized PNGs/JPGs** in production ever

## Font Rules

- **Self-host all fonts** — no Google Fonts CDN (extra DNS lookup + render block)
- Use `font-display: swap` always
- Preload the primary font weight only: `<link rel="preload" as="font" crossorigin>`
- Max 2 font families, max 3 weights total

## CSS Rules

- Tailwind purges unused CSS automatically — keep it that way
- No `@import` chains — everything through Tailwind
- Critical CSS is inlined by Astro automatically

## JavaScript Rules

- **`client:visible`** — default directive for interactive components (loads when scrolled into view)
- **`client:idle`** — for non-critical interactive elements (loads after page idle)
- **`client:load`** — ONLY for above-fold interactive elements that must work immediately
- **Never `client:only`** unless component literally cannot SSR
- GSAP: Load via dynamic import, init on `DOMContentLoaded`
- No jQuery, no lodash, no moment.js — ever

## Third-Party Embeds

- **Formflow**: Load iframe lazily with `loading="lazy"` or trigger on CTA click
- **Analytics**: Load async, defer, after page load
- No third-party fonts, no external CSS, no tracking pixels above the fold

## Target Metrics (Lighthouse)

| Metric | Target |
|--------|--------|
| Performance | **98+** |
| LCP | **< 1.2s** |
| FID/INP | **< 50ms** |
| CLS | **< 0.05** |
| Total JS | **< 50KB** gzipped |
| Total CSS | **< 15KB** gzipped |

## Build Verification

Before every deploy, run:

```bash
npm run build && npx lighthouse http://localhost:4321 --only-categories=performance
```

If Performance < 95, **do not deploy**. Fix first.
