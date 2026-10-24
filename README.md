# BuildLab PC Builder

BuildLab is an English-language PC configurator built with React, Redux Toolkit, Vite, Three.js, and a Node.js REST API. The parts catalog is maintained in JSON files in `data/`; compatibility checks and shared-build summaries are calculated by the server.

## Deploy to Render

BuildLab needs a **Web Service** because the Node.js server provides the API, serves the Three.js case models, and hosts the built React app. Do not deploy it as a Static Site.

1. In Render, create **New → Web Service** and connect the GitHub repository containing this project. Select the branch you want to deploy.
2. Set the service configuration:

   | Setting           | Value                                                                                                         |
   | ----------------- | ------------------------------------------------------------------------------------------------------------- |
   | Runtime           | Node                                                                                                          |
   | Root Directory    | Leave blank if this project is at the repository root; otherwise enter the project directory                  |
   | Build Command     | `corepack enable && corepack prepare pnpm@11.25.0 --activate && pnpm install --frozen-lockfile && pnpm build` |
   | Start Command     | `pnpm start`                                                                                                  |
   | Health Check Path | `/api/health`                                                                                                 |

3. Set `NODE_VERSION` to `24.22.1` in the service's environment variables. The application requires Node.js 22.12 or newer.
4. Create the service and wait for the first deploy to finish. Render will provide a public URL. Pushes to the connected branch trigger later deploys automatically.

### Preserve shared builds

Shared build records are written to `storage/builds.json`. Render's default filesystem is ephemeral, so records can disappear after a restart or deploy. To preserve them, attach a persistent disk in the service settings and use the absolute mount path `<project root>/storage` (for a repository-root service, Render's default project root is `/opt/render/project/src`, so the path is `/opt/render/project/src/storage`). Render persistent disks are available on paid services and attach to a single instance. Without a disk, the configurator still works, but saved share links may be lost when the service restarts or redeploys.

The current JSON file store is intended for a single server instance. Use a database before scaling the API to multiple instances.

## Run locally

```sh
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5173`. The production server can be run locally with `pnpm build` followed by `pnpm start`; it serves the site at `http://localhost:4173`.

## Catalog and case models

Each component category has its own JSON file under `data/`. `data/categories.json` controls the order in which component slots appear. Prices and specifications are sample data, not live retailer data.

Case models are stored in `models/cases/` and streamed by the Node API. Before publishing a model, check its Sketchfab license and attribution requirements. Share links contain an ID; the server stores the selected product IDs and derives the totals and compatibility data from the catalog.

## References

- [Render Web Services](https://render.com/docs/web-services)
- [Deploy a Node.js app on Render](https://render.com/docs/deploy-node-express-app)
- [Render persistent disks](https://render.com/docs/disks)
