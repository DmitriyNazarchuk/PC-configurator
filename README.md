# BuildLab PC Builder

BuildLab is an English-language PC configurator built with React, Redux Toolkit, Vite, Three.js, and a small Node.js REST API. The product catalog is maintained locally in JSON files; there is no external parts API dependency.

## Run locally

Install dependencies with `pnpm install`, then start the API and Vite development server with `pnpm dev`. Open `http://127.0.0.1:5173`. For a production build, run `pnpm build` and then `pnpm start`.

## Local catalog

Each category lives in its own JSON file under `data/`: `case.json`, `cpu.json`, `motherboard.json`, `gpu.json`, `ram.json`, `storage.json`, `psu.json`, and `cooler.json`. Each currently contains five sample products. `categories.json` controls the order shown in the configurator; the case is first and required before other components unlock.

The Node API reads and combines those category files at startup. It provides `/api/categories`, `/api/components`, `/api/builds/check`, and persistent share links through `/api/builds`. The check endpoint evaluates socket, memory, motherboard form factor, GPU clearance, cooler fit, and estimated PSU headroom. Prices and specs are editable demo values, not live retailer data. Build totals and compatibility summaries are calculated from catalog records on the server; the browser sends only selected product IDs.

Saved share links are stored in `storage/builds.json`, which is intentionally ignored by Git. Keep that directory on a persistent volume when deploying to a host with an ephemeral filesystem, or replace the JSON store with a database before running multiple server instances.

The client is composed of React components and focused hooks for catalog state, slot options, compatibility checks, persistence, background rendering, and the Three.js case preview. Catalog and share-link input is validated, API errors are surfaced in the UI, and request cancellation prevents stale results from replacing current state.

## Case models

The five supplied models are stored in `models/cases/` and streamed by the local API at `/models/cases/<filename>`. Keeping them outside `public/` prevents Vite from copying hundreds of megabytes into every frontend build. All five case models can be previewed. The `gaming_pc_free_download.glb` model replaces the previous 766 MB file and is about 0.62 MB.

For a new model, place the GLB in `models/cases/`, add a corresponding product in `data/case.json`, and set `modelUrl`, `modelSizeMB`, and `previewable`. Before publishing, check the model's Sketchfab license and attribution requirements.

## UI details

JetBrains Mono is bundled locally under `public/fonts/` and used throughout the interface. A subtle Three.js background scene is loaded after the initial UI becomes idle; it respects the operating system reduced-motion preference.

## Format the code

Run `pnpm format` to format the project or `pnpm format:check` to check formatting. Prettier rules are stored in `.prettierrc.json`.

## Publish to GitHub

1. Create an empty repository on GitHub. Do not pre-create a README, license, or `.gitignore` there.
2. In PowerShell, open this project directory and run:

```powershell
git init -b main
git add .
git status --short
git commit -m "Initial BuildLab PC configurator"
git remote add origin https://github.com/YOUR-USERNAME/buildlab-pc-builder.git
git push -u origin main
```

Review `git status --short` before committing. `node_modules`, `dist`, local package cache, environment files, and the unused 766 MB case model are excluded by `.gitignore`. Keep `pnpm-lock.yaml` in Git. Replace `YOUR-USERNAME` with your GitHub account name.

## Deploy on Render

This project includes both the React app and its Node API, so create a **Web Service**, not a static site. Connect the GitHub repository, then set:

- Runtime: Node
- Build command: `pnpm install --frozen-lockfile && pnpm build`
- Start command: `pnpm start`
- Health check path: `/api/health`

The server reads Render's `PORT` variable and binds to `0.0.0.0`. After the first deploy completes, Render gives the service a public URL and can deploy later pushes automatically.
