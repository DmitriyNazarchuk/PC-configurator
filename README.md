# BuildLab PC Builder

BuildLab is an English-language PC configurator built with React, Redux Toolkit, Vite, Three.js, and Node.js API functions. Parts and compatibility data come from the JSON catalog in `data/`.

## Deploy to Vercel

1. In Vercel, choose **Add New → Project** and import `DmitriyNazarchuk/PC-configurator` from GitHub. Set the project root to the repository root.
2. Use the **Vite** framework preset. Set the build command to `pnpm build` and the output directory to `dist`.
3. Deploy. Vercel publishes the React app and the endpoints under `api/` together. Later pushes to the connected branch trigger new deployments.

No environment variables or database are required for the current demo. The API reads the local JSON catalog, recalculates build totals and compatibility on the server, and validates shared component IDs. Share URLs carry an encoded list of public catalog IDs, so they continue to work without a writable server filesystem. The encoded IDs are not secret; the API resolves every ID against the catalog before returning a build.

The build copies case models from `models/cases/` into the generated `public/models/cases/` directory before Vite builds the static site. The generated copy is ignored by Git. The five source GLB models currently total about 60 MB.

Vercel Hobby is free for personal, non-commercial projects and includes usage limits for serverless functions. Review Vercel's [Hobby plan](https://vercel.com/docs/plans/hobby) and [platform limits](https://vercel.com/docs/limits) before deploying.

## Run locally

```sh
pnpm install
pnpm dev
```

Open `http://127.0.0.1:5173`. The development server runs Vite and the local Node API together. For the local production server, run `pnpm build` and then `pnpm start`; it serves the site at `http://localhost:4173` and stores local share records in `storage/builds.json`.

## Catalog and case models

Each component category has its own JSON file under `data/`. `data/categories.json` controls the order of the component slots. Prices and specifications are sample values, not live retailer data.

Place new GLB models in `models/cases/`, assign their `/models/cases/<filename>` path in `data/case.json`, then deploy. Before publishing a model, check its Sketchfab license and attribution requirements.
