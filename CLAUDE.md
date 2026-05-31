## gstack (REQUIRED — global install)

**Before doing ANY work, verify gstack is installed:**

```bash
test -d ~/.claude/skills/gstack/bin && echo "GSTACK_OK" || echo "GSTACK_MISSING"
```

If GSTACK_MISSING: STOP. Do not proceed. Tell the user:

> gstack is required for all AI-assisted work in this repo.
> Install it:
> ```bash
> git clone --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
> cd ~/.claude/skills/gstack && ./setup --team
> ```
> Then restart your AI coding tool.

Do not skip skills, ignore gstack errors, or work around missing gstack.

Using gstack skills: After install, skills like /gstack-qa, /gstack-ship,
/gstack-review, /gstack-investigate, and /gstack-browse are available.
Use /gstack-browse for all web browsing.
Use ~/.claude/skills/gstack/... for gstack file paths (the global path).

## Deploy (Cloudflare Workers)

Production: https://workwith.e2.agency

- **Local / Cursor:** `npm run deploy` (requires `CLOUDFLARE_API_TOKEN` in `.env`)
- **Auto on push:** GitHub Actions `.github/workflows/deploy.yml` (requires `CLOUDFLARE_API_TOKEN` repo secret)
- **Full setup:** `docs/DEPLOY.md`

Push to `main` alone does **not** deploy until the GitHub secret exists. Worker secrets (`ADMIN_PASS`, etc.) stay on Cloudflare via `wrangler secret put` — not in git.
