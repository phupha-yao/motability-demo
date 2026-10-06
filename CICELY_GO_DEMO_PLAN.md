# Build plan: Cicely inside "Go with the Motability Scheme" (EV charging demo)

You are building a clickable, front-end-only demo. Read this whole file before writing code. Work through the milestones in order and check each acceptance list before moving on.

---

## 1. What the demo must show

A disabled driver at a public chargepoint shows the operator exactly which part of the charger caused difficulty, instead of leaving a star rating or describing an unfamiliar component in a text box. The operator then sees many of these reports combined on a 3D model of that charger.

Two surfaces:

1. **Driver flow (mobile, 390 x 844 phone frame).** Cicely opens from inside the Go app's chargepoint screen. The driver takes or picks a photo, taps or circles the problem part, confirms what the system identified ("Is this the cable holster?"), chooses what happened, optionally adds a short note, and submits.
2. **Operator view (desktop).** A rotatable 3D model of the charger with a difficulty heat map by component, a detail panel per component, filters, generation comparison and a before/after view around an intervention.

### Positioning (use this in on-screen copy and the intro screen)

Go already lets drivers leave a star rating, pick positive and negative tags, write a comment and add photos to a chargepoint review. Cicely does **not** replace that. It turns the photo into structured, component-level evidence: which part, what effect it had on the person, and whether a change helped. Frame Cicely as an add-on inside the existing review journey.

### Out of scope

- **No vision model.** Do not implement SAM 2 or any ML. Segmentation is simulated with pre-authored masks (section 5). Keep a clean interface so a real model could replace it later.
- No backend, auth, payments or real charging. All data is local and synthetic.
- No real Motability, Go, Zapmap or operator logos. Use neutral placeholders (see section 3).

---

## 2. Stack

- Vite + React + TypeScript, Tailwind CSS.
- 3D: `three` with `@react-three/fiber` and `@react-three/drei` (OrbitControls, Html labels).
- State: Zustand or React context. Persist submitted demo reports in `localStorage` so a report made in the driver flow appears in the operator view.
- Routing: `react-router-dom`. Routes: `/` (intro and launcher), `/driver/*`, `/operator`, `/dev/masks` (mask authoring tool, dev only).
- No server. `npm run dev` and `npm run build` must both work. The build must be deployable as static files.

---

## 3. Visual design

### 3a. Go app shell (host app)

Only the screens Cicely sits inside need to look like Go: a map/list stub, a chargepoint detail screen and the existing review entry point. This is an approximation for a pitch, not a copy.

What is known about Go:
- Motability Scheme brand refresh: bold, vibrant palette led by **blue and purple**, a wider supporting spectrum, round "wheel" motifs derived from the M in the wordmark.
- App features to stub: map of chargepoints, filter by connector type and speed, live availability, prices, charging speeds, start/track charging session, wallet, Go Charge card, webchat, chargepoint reviews (stars, positive/negative tags, comment, photos).
- Accessibility is central to Go: supports VoiceOver, text at 200%+, not relying on colour alone, sufficient contrast. The demo must meet the same bar.
- Bottom tab bar (Map, Charging, Wallet, More). The "More" tab is where support lives.

Implementation:
- Put Go tokens in `src/theme/go.ts`: `goBlue`, `goPurple`, `goInk`, `goSurface`, one accent. Use plausible placeholder values (e.g. a deep royal blue and a violet) and add a `// TODO: replace with values sampled from official screenshots` comment. The person will tweak these by hand from App Store screenshots.
- Wordmark: plain text "Go" in a rounded bold sans inside a circle. No Motability logo.
- System font stack for the Go shell.

### 3b. Cicely layer

When the flow hands over to Cicely, the styling changes so it is obvious which part is Cicely. Show a small "Powered by Cicely" strip at the top of every Cicely screen.

- Background cream `#FFFBEC`, text ink `#1F1F1F`. No pure white, no pure black.
- Palette: mint `#D9E97F`, orange `#FE8D54`, dandelion `#FFE96A`, bubblegum `#FFC0C0`, malibu `#FF7199`, sky `#89D8FF`, fall `#B4B94D`.
- Headings: PP Mori Semibold. Body: Inclusive Sans. Font files and logo are in the Cicely doc kit (`assets/PPMori-Semibold.otf`, `assets/InclusiveSans-Regular.woff`, `assets/cicely-mark.svg`, `assets/cicely-wordmark.svg`). Ask the person for these if they are not already in `public/brand/`.
- Botanical, warm and confident. Avoid clinical "disability tech" styling.

### 3c. Heat map scale (operator view)

Never rely on colour alone. Use a sequential scale cream > dandelion > orange > malibu, and always pair it with a number badge and a text label (Low, Moderate, High, Very high).

---

## 4. Copy rules

- British English. No em dashes. Plain, warm, direct.
- Do not use "AI-powered", "real-time accessibility", "revolutionising" or "compliance platform".
- Show a persistent small banner on the operator view: "Demo with synthetic data".
- Never claim a partnership with Motability, Zapmap or any operator.

---

## 5. Simulated segmentation (core of the driver flow)

### 5a. Interface

```ts
// src/segmentation/types.ts
export type Prompt =
  | { kind: 'tap'; x: number; y: number }               // image-space px
  | { kind: 'lasso'; points: [number, number][] };       // rough outline

export interface SegmentResult {
  componentId: ComponentId;
  polygon: [number, number][];   // mask outline in image space
  confidence: number;            // 0..1, faked
  alternatives: ComponentId[];   // next best guesses, max 2
}

export interface Segmenter {
  segment(imageId: string, prompt: Prompt): Promise<SegmentResult | null>;
}
```

Implement `MockSegmenter` only. Add a comment that a SAM 2 implementation (for example SAM 2 ONNX in the browser) would satisfy the same interface.

### 5b. How the mock works

- Each demo photo has a JSON file of component polygons: `src/data/photos/<photoId>.masks.json` → `{ componentId, polygon }[]`.
- **Tap:** point-in-polygon test. If inside several, pick the smallest polygon. If inside none, pick the nearest polygon edge within 60 px, else return null and ask the driver to try again or choose from a list.
- **Lasso:** rasterise or approximate overlap area between the driver's outline and each polygon; pick the highest overlap ratio.
- Add 400 to 700 ms artificial delay with a "Finding that part" state.
- Animate the result: the polygon stroke draws on (SVG `stroke-dasharray`), then a translucent fill. Respect `prefers-reduced-motion`.
- Confidence: return 0.9 for clear taps, 0.6 for edge cases. Below 0.75, the confirm screen leads with the alternatives.

### 5c. Demo photos

Real photos are not available yet. Do this:

1. Draw 2 charger "photos" as detailed SVG illustrations (`public/photos/rapid-gen1.svg`, `public/photos/rapid-gen2.svg`): a rapid DC charger pedestal on a bay, showing screen, payment terminal, RFID pad, start/stop buttons, emergency stop, tethered cable, CCS connector, cable holster, cable management arm, bollards, kerb and bay surface. Gen 2 has a lower holster and a cable retractor.
2. Author mask JSON for each to match the illustration.
3. Build `/dev/masks`: load any image, click to place polygon points per component, drag points, export JSON. This lets the person swap in real JPG photos later and redraw masks in minutes.
4. Also let the driver "take a photo" via `<input type="file" accept="image/*" capture="environment">`. If they upload their own photo, there are no masks, so skip straight to the "choose from a list" fallback and keep their photo. Say this honestly on screen in demo mode.

---

## 6. Component taxonomy

`src/data/taxonomy.ts`. Each item: `id`, `label` (plain English), `alsoCalled` (synonyms drivers might use), `description` (one sentence the driver sees on the confirm screen), `pas1899Area`.

PAS 1899:2022 areas to map to: chargepoint component heights (socket, cable, screen/visual interface, payment), cable weight and cable management, connector grip and force, screen content and visibility, information and signage, bay and surroundings (kerb, ground surface, bollard spacing, bay dimensions).

| id | label | alsoCalled |
|---|---|---|
| screen | Screen | display, monitor |
| payment_terminal | Card reader | contactless, payment machine |
| rfid_reader | Card tap pad | RFID, Go Charge card reader |
| buttons | Buttons | start, stop, controls |
| emergency_stop | Emergency stop | red button |
| cable | Charging cable | lead, wire |
| connector | Plug | connector, nozzle, CCS, Type 2 |
| holster | Cable holster | plug holder, dock |
| cable_management | Cable support arm | retractor, overhead arm |
| socket | Socket | outlet (for untethered AC posts) |
| bollards | Bollards | posts, barriers |
| kerb | Kerb | step, dropped kerb |
| bay_surface | Ground surface | bay, slope, gravel |
| bay_space | Space around the car | bay width, room to open doors |
| signage | Signs and labels | instructions, stickers |
| lighting | Lighting | dark, lights |

---

## 7. Impact categories ("What happened?")

Multi-select, large tiles with icon + text:

- Needed too much strength
- Hard to reach
- Hard to see or read
- Hard to understand
- Needed help from someone
- Felt unsafe
- Could not charge
- Something else

Then one follow-up: "Did you finish charging?" Yes / Yes, with help / No, I left. This drives the "abandoned" metric.

---

## 8. Data model

```ts
type Report = {
  id: string;
  createdAt: string;               // ISO
  chargerId: string;
  siteId: string;
  operatorId: string;
  chargerModel: string;            // e.g. "Rapid 50 kW"
  generation: 'Gen 1' | 'Gen 2';
  entryPoint: 'go_app' | 'zapmap' | 'operator_app' | 'qr_on_charger';
  identifiedBy: 'location' | 'asset_id' | 'qr' | 'driver_confirmed';
  photoId?: string;
  componentId: ComponentId;
  componentConfirmed: boolean;     // driver confirmed the system's guess
  segmentationPrompt: 'tap' | 'lasso' | 'list';
  polygon?: [number, number][];
  impacts: ImpactId[];
  outcome: 'completed' | 'completed_with_help' | 'abandoned';
  note?: string;                   // short text or transcript
  noteKind?: 'text' | 'voice';
  selfDescribedGroups?: GroupId[]; // optional, e.g. wheelchair user, limited grip, sight loss
  weather?: 'dry' | 'wet' | 'dark';
};
```

Groups are optional, self-described and clearly marked optional. Show them as "patterns across groups", never as individual profiles.

### Seed data (`src/data/seed.ts`, deterministic seeded RNG)

- 1 operator, 4 sites in Greater London and 1 motorway services, 14 chargers, mix of Gen 1 and Gen 2.
- About 320 reports over 9 months.
- Built-in stories the demo must reveal:
  1. **Gen 1 holster** is the top hotspot: mostly "too much strength" and "hard to reach", high "needed help", concentrated among wheelchair users and people with limited grip.
  2. **Payment terminal** at one site gets "hard to see or read" spikes in wet and dark conditions (glare/lighting).
  3. **Intervention:** on a set date, the operator fitted lower holsters and a cable support arm at one site. After that date, holster reports drop sharply, but some reports **move to the cable** ("too heavy"). The before/after view must show this shift, not just a drop.
  4. Gen 2 chargers show far fewer holster reports than Gen 1.

---

## 9. Driver flow screens

Each screen: one primary action, 56 px minimum touch targets, VoiceOver/aria labels, works at 200% text, back button always visible.

**Go shell**
1. **Map stub.** Static map image with pins (plain SVG, no map tiles needed). Tap a pin.
2. **Chargepoint detail.** Name, address, connectors, speed, price per kWh, availability, existing reviews summary (stars + tags). Primary button "Start charging" (inactive in demo). Secondary card: "Something not work for you here? Show us which part" → opens Cicely.
   - Also add a small demo-only toggle to switch the entry point label: "Opened from Go", "Opened from Zapmap", "Scanned QR on charger". This shows the concept of entry from several apps. Label Zapmap as a possible future integration.

**Cicely**
3. **Confirm charger.** "You're at Charger 3, Osprey-style Rapid 50 kW, Gen 1, at [site]." Show how it was identified (location / asset ID). Buttons: "Yes, that's it" / "No, choose a different charger" (list of nearby chargers, or type asset ID printed on the unit).
4. **Photo.** "Take a photo of the charger" with camera input, plus "Use demo photo" (default during pitches). Tip text: "Get the part that was a problem in the picture. You don't need to know what it's called."
5. **Point to the part.** Photo full width. Mode switch: "Tap it" / "Draw round it". Under the photo: "Can't point? Choose from a list instead" (always available, for drivers who cannot use touch gestures or use a screen reader). Pinch to zoom.
6. **Confirm the part.** Traced outline over the photo. "Is this the cable holster?" with one-line description. Buttons: "Yes", "No, it's this" (show the 2 alternatives as tiles), "Try again".
7. **What happened?** Impact tiles (section 7), then outcome question.
8. **Tell us more (optional).** Short text box with 280 character limit, or "Record a voice note" (use Web Speech API to show a live transcript if available, otherwise fake a transcript after a 3 second recording). "Skip" is equally prominent.
9. **About you (optional).** Self-described groups, multi-select, with "Prefer not to say". Explain in one line why it's asked: "This helps the operator see if a problem affects some people more than others."
10. **Check and send.** Summary card: photo with outline, part, what happened, outcome, note. "Send to [operator]".
11. **Sent.** "Thank you. The operator can now see exactly which part caused the problem." Plus "Your report has also been added to your Go review" (to show it complements existing reviews). Button: "See what the operator sees" → `/operator` with the new report highlighted.

---

## 10. Operator view

Desktop layout: left filter rail, centre 3D viewport, right detail panel, bottom strip for time trend.

### 10a. 3D charger model

- Build the charger procedurally from three.js primitives in `src/operator/ChargerModel.tsx` (boxes, cylinders, tube geometry for the cable via a CatmullRom curve, a simple bay with kerb and two bollards). Name each mesh with its `ComponentId`. Two variants: Gen 1 and Gen 2 (lower holster, cable support arm).
- OrbitControls with sensible limits; preset camera buttons: Front, Side, Driver's eye height from a wheelchair (about 1.1 m), Top.
- Heat map: tint each component mesh by report count or rate for the current filter, using the scale in 3c, plus a floating `Html` badge with the count. Components with no reports stay neutral grey-cream.
- Hover outlines a component; click selects it. Keyboard: Tab cycles components, Enter selects.
- Fallback toggle "2D view": an SVG front elevation with the same colouring, for low-power machines and screen readers.

### 10b. Detail panel (selected component)

- Total reports, trend sparkline.
- Impacts breakdown (horizontal bars, labelled).
- Outcomes: completed / with help / abandoned (counts and %).
- Groups affected (only show a group if n ≥ 5, otherwise "Not enough reports to show").
- Where: list of chargers and sites ranked by rate per 100 sessions (fake session counts per charger in seed data).
- By generation: Gen 1 vs Gen 2 side by side.
- Evidence gallery: thumbnails of driver photos with outlines, impact chips and notes. Click opens a larger view.
- Suggested PAS 1899 area to check, phrased cautiously: "Reports relate to: cable management and connector force." Do not state compliance or non-compliance.

### 10c. Filters

Date range, site, charger, generation, impact, outcome, group, conditions (wet/dark), entry point.

### 10d. Before and after

- Intervention log: list with date, site, description ("Lower holster and cable support arm fitted").
- Toggle "Before / After / Compare". Compare shows two models side by side with the same scale, plus a small table per component: before rate, after rate, change. Highlight where reports moved to (holster down, cable up).
- Include an honest caveat line: "Fewer reports could also reflect fewer visits. Compare rates per 100 sessions."

### 10e. Portfolio overview (simple)

A top tab "All chargers": table of chargers with top component, total reports, abandoned %, generation. Clicking a row loads that charger into the 3D view.

---

## 11. Intro and launcher (`/`)

Short Cicely-branded page:
- One-line problem: a star rating shows that someone had a bad experience, not which part caused it.
- Two big buttons: "Driver view" and "Operator view". On wide screens, offer "Side by side" (phone frame on the left, operator view on the right, live-updating when a report is submitted).
- "Reset demo data" button.

---

## 12. Accessibility acceptance (applies to everything)

- All interactive elements reachable by keyboard and labelled for screen readers.
- Touch targets ≥ 56 px in driver flow.
- Text contrast ≥ 4.5:1. Nothing conveyed by colour alone.
- Works with browser zoom at 200% without horizontal scrolling in the phone frame.
- `prefers-reduced-motion` disables tracing animation and camera easing.
- Every pointing step has a list-based alternative.

---

## 13. Milestones

**M1. Scaffold and theme.** Vite + React + TS + Tailwind, routes, Go and Cicely theme tokens, fonts loaded, phone frame component, intro page.
Accept: both themes visibly distinct; fonts render (not Arial); build passes.

**M2. Data.** Taxonomy, impacts, types, seeded generator with the four stories, localStorage store with reset.
Accept: a quick console table proves the four stories exist in the data.

**M3. Photos and masks.** Two SVG charger illustrations, mask JSON, `/dev/masks` tool with export.
Accept: overlaying masks on photos lines up with components.

**M4. Driver flow.** Screens 1 to 11 with MockSegmenter, tap and lasso, alternatives, list fallback, voice note, submission to store.
Accept: full flow completes with mouse, touch emulation and keyboard only.

**M5. Operator 3D.** Procedural Gen 1 and Gen 2 models, heat tinting, badges, selection, camera presets, 2D fallback.
Accept: clicking the holster on Gen 1 shows it as the top hotspot.

**M6. Operator panels.** Detail panel, filters, portfolio table, evidence gallery, new-report highlight.
Accept: report submitted in driver flow appears within the panel and gallery.

**M7. Before/after.** Intervention log, compare mode, shift from holster to cable visible.
Accept: compare view shows the holster rate falling and the cable rate rising at the intervention site.

**M8. Polish.** Side-by-side mode, empty and error states, copy pass against section 4, accessibility pass against section 12, README with run instructions and the demo script below.

---

## 14. Demo script (put in README)

1. Intro: "Go already collects star ratings, tags and photos. Here is what happens when the photo becomes evidence."
2. Driver: open a chargepoint in Go, tap "Show us which part", confirm the charger, use the demo photo, tap the holster, confirm "Is this the cable holster?", choose "Needed too much strength" and "Needed help from someone", record a short note, send.
3. Operator: the new report pulses on the holster. Rotate to wheelchair eye height. Show the Gen 1 vs Gen 2 comparison.
4. Before/after at the intervention site: holster reports fall, cable reports rise, so the next decision is the cable weight.
5. Close: "Patterns in charging equipment, not monitoring individuals."

---

## 15. Open items to flag to the person, do not guess

- Exact Go colours and screen layouts: tokens are placeholders until sampled from official screenshots.
- Real charger photos (taken with the site owner's permission) to replace the SVG illustrations.
- Whether to name a real operator in the demo. Default: a fictional "Northway Charging".
- Permission before showing anything resembling Motability or Zapmap branding outside a private pitch.
