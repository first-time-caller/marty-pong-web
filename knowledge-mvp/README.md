# The Knowledge — MVP

Lightweight web-first prototype for a London taxi route game.

## Features
- MapLibre GL JS with OpenFreeMap tiles
- Noir-style map (hidden labels, neon roads)
- Random A→B route generation within ~3 miles of Charing Cross
- Draw your route and score against ideal straight-line distance
- PWA-ready (manifest + service worker)

## Run Locally
Serve the folder with any static server.

```powershell
cd "c:\Users\bradley\Desktop\coding practice stuff\knowledge-mvp"
python -m http.server 8000
```

Then open http://localhost:8000 in your browser.

## Notes
- Routing uses straight-line distance as a placeholder for MVP.
- Next step: swap in GraphHopper client-side routing and oneway validation.
