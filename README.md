# Icon Playground

Canonical, editable icon playground. Browse icons with live style controls, edit raw SVG, and copy/export.

**Live:** [icon-playground.vercel.app](https://icon-playground.vercel.app)

## Canonical source

`icons/` is the single source of truth — drop `.svg` files there (subfolders OK). A build step scans it and generates `src/icons.generated.ts` (gitignored):

```bash
npm run icons        # regenerate the manifest (auto-runs before dev/build)
```

Optional re-seed from an HTML icon sheet (path is an argument — nothing machine-specific):

```bash
node scripts/extract-recto.mjs /path/to/icon-options.html
# or: RECTO_HTML=/path/to/icon-options.html node scripts/extract-recto.mjs
```

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
```

- **Library** — grid with size / color / stroke / rotate / background; detail panel (size strip, Copy SVG/JSX, Download SVG/PNG).
- **SVG Editor** — paste/edit raw SVG with live preview and export.

## Deploy (Vercel)

Git pushes to `main` on [Cashie1597/icon-playground](https://github.com/Cashie1597/icon-playground) deploy production automatically.

```bash
vercel link          # once, if not linked
vercel --prod        # CLI deploy
```

Optional protection (Vercel → Project → Settings → Deployment Protection): team SSO or password. Metadata sets `robots: noindex` as a crawl backstop.
