# MAYBI Fashion Pack — React refactor

## Stack
- React 19 + TypeScript + Vite
- React Three Fiber / Three.js for the interactive 3D stage
- Framer Motion for pack/reveal/card transitions
- Lucide React for UI icons

## Run
```bash
npm install
npm run dev
```
Build production:
```bash
npm run build
```

## Refactor notes
The legacy project stored CSS, JS and images under separate `public/css`, `public/js`, `public/img` folders. Those folders were not duplicated in the uploaded archive, but the structure mixed application source with static assets. The refactor removes the legacy folders and uses:
- `src/components` — React UI
- `src/data` — game/catalog data
- `src/styles` — app styling
- `public/assets` — static image assets only

Unused `pack-art.png` was removed. The old Pokémon-oriented DOM/render code was replaced with typed React state and components..testdadad
