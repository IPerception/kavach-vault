# Icon generator

Builds the brand image assets from the per-size source SVGs in this folder
(`mark-16.svg`, `mark-24.svg`, `mark-32.svg`, `app-icon.svg`) and from the gold banner
`kavach-banner.png` (this folder). The illustrated poster `docs/assets/kavach-logo.png` is
no longer used by the app.

Outputs (all committed, so normal builds never run this):

- `kavach-backend/src/main/packaging/kavach.ico` (16, 24, 32, 48, 64, 128, 256 px)
- `kavach-backend/src/main/packaging/kavach.png` (256 px)
- `kavach-frontend/public/favicon-32.png`
- `kavach-frontend/public/kavach-banner.webp` (1120 x 560, lock screen and setup wizard)

`kavach-frontend/public/favicon.svg` is a copy of `mark-32.svg`.

Run after changing a source SVG, or the banner:

    cd scripts/icons
    npm ci
    node generate.mjs

This is a standalone tool: it is not a frontend dependency and is not run by Maven or CI.
