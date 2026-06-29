# Icon Playground

Canonical, editable icon playground & preview for the **Recto** icon set. Browse
the icons with live style controls, edit raw SVG, and copy/export. Built to deploy
as a **private** Vercel preview link.

## Canonical source

`icons/` is the single source of truth — drop `.svg` files there (subfolders OK).
A build step scans it and generates `src/icons.generated.ts`:

```bash
npm run icons        # regenerate the manifest (auto-runs before dev/build)
```

The 12 Recto concepts were seeded from `recto/icon-options.html` via
`scripts/extract-recto.mjs` (re-run it to re-sync).

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
```

- **Library tab** — grid of canonical icons with size / color / stroke / rotate /
  background controls; click an icon for the detail panel (size strip, Copy SVG,
  Copy JSX, Download .svg).
- **SVG Editor tab** — paste/edit raw SVG with a live preview pane + export.

## Deploy a private link (Vercel)

```bash
npm i -g vercel      # if needed
vercel link
vercel               # preview deploy → prints a private *.vercel.app URL
vercel --prod        # promote when ready
```

Make the link private (choose one in **Vercel → Project → Settings → Deployment
Protection**):

- **Vercel Authentication** — only your Vercel team can open the link (default,
  zero config).
- **Password Protection** — single shared password for the deployment.

`robots` is already set to `noindex` in `src/app/layout.tsx` as a backstop.
