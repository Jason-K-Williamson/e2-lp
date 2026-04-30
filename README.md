# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).

## gstack Autopilot (Non-Developer Friendly)

This repo is configured to use gstack by default for AI-assisted work.
You do not need to remember the full workflow. Use the copy/paste blocks below.

### One-time setup per machine

```bash
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack
cd ~/.claude/skills/gstack && ./setup --team
```

### Start every new AI chat with this prompt

Copy this message into Cursor at the start of a session:

```text
Load gstack and run the default sprint workflow for this task:
1) /gstack-office-hours
2) /gstack-autoplan
3) implement the approved plan
4) /gstack-review
5) /gstack-qa (use staging URL if available)
6) /gstack-ship
If anything is unclear, ask me simple non-technical questions.
```

### If you just want one command to start

Use:

```text
/gstack-autoplan
```

Then say:

```text
Implement this plan, then run /gstack-review, /gstack-qa, and /gstack-ship.
```

### What to do if gstack is missing

If the AI says gstack is missing, run:

```bash
cd ~/.claude/skills/gstack && ./setup --team
```

Then restart Cursor and try again.
