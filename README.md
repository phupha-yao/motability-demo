# Cicely in Go: show us which part

A clickable, front-end-only concept demo. A disabled driver at a public chargepoint shows the operator exactly which part of the charger caused difficulty. The operator sees those reports combined on a 3D model of the charger.

All data is synthetic. Northway Charging is a fictional operator. Go and Zapmap appear only to show where Cicely could sit; no partnership is implied.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static files in dist/
npm run preview    # serve the build locally
```

The build is plain static files. It uses client-side routes, so the host must send unknown paths to `index.html` (`public/_redirects` does this on Netlify; on other hosts add an equivalent SPA fallback).

Other scripts:

- `npm run photos` regenerates the two charger illustrations and their masks from `scripts/build-photos.mjs`.
- `npm run stories` prints tables proving the four built-in data stories exist.

## Routes

| Route | What it is |
|---|---|
| `/` | Intro and launcher, with "Reset demo data" |
| `/driver` | Driver flow inside a 390 x 844 phone frame (Go shell, then Cicely) |
| `/operator` | Operator view: 3D heat map, detail panel, filters, all chargers, before and after |
| `/side-by-side` | Phone on the left, operator on the right, updating as reports are sent |
| `/dev/masks` | Mask authoring tool (dev server only) |

## Demo script

1. **Intro.** "Go already collects star ratings, tags and photos. Here is what happens when the photo becomes evidence."
2. **Driver.** Open a chargepoint in Go (Stratford Retail Park puts you at Charger 3, a Gen 1), tap "Show us which part", confirm the charger, use the demo photo, tap the holster, confirm "Is this the cable holster?", choose "Needed too much strength" and "Needed help from someone", record a short note, send.
3. **Operator.** The new report pulses on the holster. Choose "Eye height from a wheelchair (1.1 m)". Switch between Gen 1 and Gen 2.
4. **Before and after** at Ealing Broadway Hub: holster reports fall, cable reports rise, so the next decision is the cable weight.
5. **Close.** "Patterns in charging equipment, not monitoring individuals."

Tip: "Side by side" on a wide screen lets the room watch the report land as it is sent.

## How it is built

- Vite, React, TypeScript, Tailwind CSS v4.
- 3D: `three`, `@react-three/fiber`, `@react-three/drei`. The charger is built from primitives in `src/operator/ChargerModel.tsx`, one named group per component. Gen 1, Gen 2 and "Gen 1 with lowered holster and support arm" variants.
- State: Zustand. Reports sent in the demo are kept in `localStorage` (`cicely-go-demo:reports`); the 320 seed reports are regenerated from a fixed seed on every load, so "Reset demo data" only clears demo reports.
- Segmentation is simulated. `src/segmentation/types.ts` defines a `Segmenter` interface; `MockSegmenter` looks up pre-drawn polygons. A real model (for example SAM 2 running in the browser) could implement the same interface.

Key folders:

```
src/data/         taxonomy, impacts, network (sites, chargers, interventions), seed, photo masks
src/segmentation/ Segmenter interface, MockSegmenter, geometry helpers
src/driver/       Go shell screens and the Cicely flow
src/operator/     3D model, 2D fallback, panels, analytics
src/dev/          mask authoring tool
src/theme/        Go and Cicely tokens
```

## Swapping in real photos

1. Put the photo in `public/photos/` and add it to `PHOTOS` in `src/data/photos.ts`.
2. Run `npm run dev`, open `/dev/masks`, load the photo, draw one polygon per component and download the JSON.
3. Save it as `src/data/photos/<photoId>.masks.json`.

## Accessibility notes

- Every pointing step has a list alternative ("Can't point? Choose from a list instead"). The 3D view has a parts list and a 2D view for keyboard and screen reader use.
- Driver touch targets are at least 56 px. Heat colours are always paired with a number and a text label.
- `prefers-reduced-motion` turns off the outline tracing animation, pulses and camera easing.
- Checked: the full driver flow with mouse, with keyboard only (list route), and at 200% zoom without horizontal scrolling.

## Open items

- **Go colours and layouts.** Tokens in `src/theme/go.ts` and `src/index.css` are placeholders until sampled from official screenshots.
- **Brand files.** `public/brand/` has the Cicely wordmark only. Add `PPMori-Semibold.otf`, `InclusiveSans-Regular.woff` and `cicely-mark.svg` from the doc kit. Until then headings fall back to Manrope and body text to Inclusive Sans from Google Fonts.
- **Real charger photos**, taken with the site owner's permission, to replace the SVG illustrations.
- **Operator name.** The demo uses the fictional Northway Charging. Confirm before naming a real operator.
- **Permission** before showing anything resembling Motability or Zapmap branding outside a private pitch.
