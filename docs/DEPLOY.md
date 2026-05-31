# Deploy guide (plain English)

**Production URL:** https://workwith.e2.agency  
**How it runs:** Cloudflare Workers (not Pages dashboard uploads)

Pushing to GitHub **does not** go live by itself until you add one secret (below). After that, every push to `main` deploys automatically.

---

## One-time setup (5 minutes)

### 1. Create a Cloudflare API token

1. Open [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. **Create Token** → use template **Edit Cloudflare Workers**
3. Continue → **Create Token** → copy the token (shown once)

### 2. Add token locally (for Cursor / `npm run deploy`)

In the project folder, add to your `.env` file:

```bash
CLOUDFLARE_API_TOKEN=paste_your_token_here
```

### 3. Add the same token to GitHub (auto-deploy on push)

1. Open your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Value: same token as above

Optional (only if GitHub build fails — mirror your local `.env`):

| Secret name | Used for |
|---|---|
| `ADMIN_PASS` | Admin pages |
| `ANTHROPIC_API_KEY` | AI generate API |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin Supabase |
| `APIFY_API_TOKEN` | Lead import |

---

## Deploy commands

| What you want | Command |
|---|---|
| Deploy from Cursor/terminal | `npm run deploy` |
| Push + auto-deploy (after GitHub secret) | `git push origin main` |
| Check who’s logged in | `npx wrangler whoami` |

---

## Why you had to use the Cloudflare dashboard

Git push only updates GitHub. This project has **no** Cloudflare Pages “Connect to Git” — it uses **Wrangler** to deploy a Worker. Without `CLOUDFLARE_API_TOKEN`, neither Cursor nor GitHub can deploy for you.

After the token is in `.env` and GitHub Secrets, you should never need the dashboard for routine deploys.

---

## Rollback

```bash
npx wrangler rollback
```

Or pick a version in Cloudflare → Workers → **e2-landing** → Deployments.
