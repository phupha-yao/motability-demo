// Generates the two demo charger "photos" (SVG illustrations) and their mask JSON
// from one set of shape definitions, so outlines always line up with the drawing.
// Run with: npm run photos
// When real photos arrive, drop them in public/photos and redraw masks at /dev/masks.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const W = 600;
const H = 800;

const rect = (x, y, w, h) => [
  [x, y],
  [x + w, y],
  [x + w, y + h],
  [x, y + h],
];

function bezier(p0, p1, p2, p3, steps = 40) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return pts;
}

// Thick band around a polyline, as a closed polygon.
function band(pts, half) {
  const left = [];
  const right = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    left.push([pts[i][0] + nx * half, pts[i][1] + ny * half]);
    right.push([pts[i][0] - nx * half, pts[i][1] - ny * half]);
  }
  // Keep every 4th point so masks stay editable at /dev/masks.
  const thin = (arr) => arr.filter((_, i) => i % 4 === 0 || i === arr.length - 1);
  return [...thin(left), ...thin(right).reverse()];
}

const round = (poly) => poly.map(([x, y]) => [Math.round(x), Math.round(y)]);
const d = (pts) => 'M' + pts.map((p) => p.map((n) => n.toFixed(1)).join(' ')).join(' L');

function build(gen) {
  const g2 = gen === 2;
  const holster = g2 ? { x: 398, y: 404, w: 52, h: 66 } : { x: 398, y: 238, w: 52, h: 70 };
  const conn = g2 ? { x: 406, y: 352, w: 36, h: 62 } : { x: 406, y: 186, w: 36, h: 64 };
  const cableStart = g2 ? [502, 112] : [402, 548];
  const cableEnd = [424, conn.y + conn.h - 2];
  const cablePts = g2
    ? bezier(cableStart, [516, 330], [452, 540], cableEnd)
    : bezier(cableStart, [526, 610], [528, 330], cableEnd);

  const masks = [
    { componentId: 'lighting', polygon: rect(160, 34, 280, 28) },
    { componentId: 'signage', polygon: rect(232, 132, 156, 46) },
    { componentId: 'screen', polygon: rect(248, 194, 124, 98) },
    { componentId: 'buttons', polygon: rect(258, 300, 104, 36) },
    { componentId: 'payment_terminal', polygon: rect(244, 346, 70, 86) },
    { componentId: 'rfid_reader', polygon: rect(322, 350, 54, 56) },
    { componentId: 'socket', polygon: rect(250, 450, 54, 54) },
    { componentId: 'emergency_stop', polygon: rect(328, 444, 46, 46) },
    { componentId: 'holster', polygon: rect(holster.x, holster.y, holster.w, holster.h) },
    { componentId: 'connector', polygon: rect(conn.x - 2, conn.y - 4, conn.w + 4, conn.h + 4) },
    { componentId: 'cable', polygon: band(cablePts, 13) },
    { componentId: 'bollards', polygon: rect(116, 438, 44, 164) },
    { componentId: 'bollards', polygon: rect(536, 438, 44, 164) },
    { componentId: 'kerb', polygon: rect(0, 596, 600, 34) },
    {
      componentId: 'bay_space',
      polygon: [
        [150, 660],
        [450, 660],
        [470, 790],
        [130, 790],
      ],
    },
    { componentId: 'bay_surface', polygon: rect(0, 630, 600, 170) },
  ];
  if (g2) {
    masks.push({
      componentId: 'cable_management',
      polygon: [
        [384, 58],
        [524, 58],
        [524, 114],
        [484, 114],
        [484, 76],
        [402, 76],
        [402, 132],
        [384, 132],
      ],
    });
  }

  const hatch = [];
  for (let x = 60; x < 480; x += 26) {
    hatch.push(`<line x1="${x}" y1="790" x2="${x + 70}" y2="660" />`);
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="Helvetica, Arial, sans-serif">
  <title>Illustration of a ${g2 ? 'Gen 2' : 'Gen 1'} rapid charger on a parking bay</title>
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#cfe6f0"/><stop offset="1" stop-color="#f3efe0"/>
    </linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#e4e7ea"/><stop offset="0.6" stop-color="#f4f5f6"/><stop offset="1" stop-color="#d5d9dd"/>
    </linearGradient>
    <linearGradient id="asphalt" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#55595e"/><stop offset="1" stop-color="#3b3e42"/>
    </linearGradient>
    <linearGradient id="kerb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#d8d4ca"/><stop offset="0.35" stop-color="#bdb8ac"/><stop offset="1" stop-color="#8f8b82"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.5" cy="0" r="0.8">
      <stop offset="0" stop-color="#fff6c8" stop-opacity="0.9"/><stop offset="1" stop-color="#fff6c8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/>
    </radialGradient>
  </defs>

  <!-- sky, canopy and hedge -->
  <rect width="${W}" height="600" fill="url(#sky)"/>
  <rect x="0" y="0" width="${W}" height="36" fill="#3a3f45"/>
  <rect x="160" y="34" width="280" height="28" rx="6" fill="#f5f0dc" stroke="#2f3338" stroke-width="3"/>
  <polygon points="160,62 440,62 560,420 40,420" fill="url(#glow)"/>
  <g fill="#6f8f4e">
    <ellipse cx="40" cy="520" rx="90" ry="70"/><ellipse cx="170" cy="540" rx="80" ry="60"/>
    <ellipse cx="460" cy="535" rx="90" ry="62"/><ellipse cx="580" cy="515" rx="80" ry="72"/>
  </g>
  <g fill="#86a45f">
    <ellipse cx="90" cy="545" rx="60" ry="40"/><ellipse cx="520" cy="550" rx="70" ry="40"/>
  </g>
  <rect x="0" y="560" width="${W}" height="40" fill="#cdc8bb"/>

  <!-- kerb and bay -->
  <rect x="0" y="596" width="${W}" height="34" fill="url(#kerb)"/>
  <rect x="0" y="630" width="${W}" height="170" fill="url(#asphalt)"/>
  <clipPath id="zone"><path d="M150 660 L450 660 L470 790 L130 790 Z"/></clipPath>
  <g stroke="#e7c94a" stroke-width="6" opacity="0.9" clip-path="url(#zone)">${hatch.join('')}</g>
  <path d="M150 660 L450 660 L470 790 L130 790 Z" fill="none" stroke="#f1f1ee" stroke-width="6"/>
  <path d="M90 630 L60 800" stroke="#f1f1ee" stroke-width="8"/>
  <path d="M520 630 L548 800" stroke="#f1f1ee" stroke-width="8"/>

  <!-- bollards -->
  ${[116, 536]
    .map(
      (x) => `<g>
    <rect x="${x}" y="438" width="44" height="164" rx="20" fill="#2f5d50"/>
    <rect x="${x}" y="470" width="44" height="18" fill="#f4f1e6"/>
    <rect x="${x}" y="500" width="44" height="10" fill="#f4f1e6"/>
    <ellipse cx="${x + 22}" cy="444" rx="20" ry="7" fill="#3f7465"/>
  </g>`,
    )
    .join('\n  ')}

  <!-- pedestal -->
  <rect x="226" y="584" width="182" height="18" fill="#7e8389"/>
  <rect x="400" y="128" width="16" height="460" fill="#aab0b6"/>
  <path d="M220 600 L220 150 Q220 118 252 118 L370 118 Q400 118 400 150 L400 600 Z" fill="url(#body)" stroke="#8c9298" stroke-width="2"/>
  ${g2 ? '<rect x="220" y="540" width="180" height="14" fill="#89d8ff"/>' : '<rect x="220" y="540" width="180" height="14" fill="#9ba3ab"/>'}

  <!-- signage -->
  <rect x="232" y="132" width="156" height="46" rx="6" fill="#26323d"/>
  <text x="310" y="154" fill="#f2f2ee" font-size="15" font-weight="700" text-anchor="middle">RAPID 50 kW</text>
  <text x="310" y="171" fill="#9fd5ef" font-size="11" text-anchor="middle">Northway Charging ${g2 ? '· Gen 2' : ''}</text>

  <!-- screen -->
  <rect x="248" y="194" width="124" height="98" rx="8" fill="#1d2329"/>
  <rect x="256" y="202" width="108" height="82" rx="4" fill="#2e6d8e"/>
  <text x="310" y="232" fill="#f2f8fb" font-size="11" text-anchor="middle">Tap card or</text>
  <text x="310" y="247" fill="#f2f8fb" font-size="11" text-anchor="middle">use the app</text>
  <rect x="270" y="258" width="80" height="16" rx="3" fill="#89d8ff" opacity="0.6"/>

  <!-- buttons -->
  <rect x="258" y="300" width="104" height="36" rx="18" fill="#cfd4d9"/>
  <circle cx="284" cy="318" r="13" fill="#3e9b5b" stroke="#2b6b3f" stroke-width="2"/>
  <circle cx="336" cy="318" r="13" fill="#5a6168" stroke="#3a4046" stroke-width="2"/>
  <text x="284" y="322" fill="#fff" font-size="9" text-anchor="middle">START</text>
  <text x="336" y="322" fill="#fff" font-size="9" text-anchor="middle">STOP</text>

  <!-- payment terminal -->
  <rect x="244" y="346" width="70" height="86" rx="6" fill="#2a2f35"/>
  <rect x="252" y="354" width="54" height="22" rx="2" fill="#9cb7a3"/>
  ${[0, 1, 2]
    .map((r) => [0, 1, 2].map((c) => `<rect x="${256 + c * 17}" y="${384 + r * 14}" width="12" height="9" rx="2" fill="#6b737b"/>`).join(''))
    .join('')}

  <!-- card tap pad -->
  <rect x="322" y="350" width="54" height="56" rx="8" fill="#f8f6ef" stroke="#4b5259" stroke-width="2"/>
  <g fill="none" stroke="#4b5259" stroke-width="2.5" stroke-linecap="round">
    <path d="M343 368 q6 10 0 20"/><path d="M350 364 q9 14 0 28"/><path d="M357 360 q12 18 0 36"/>
  </g>

  <!-- socket -->
  <rect x="250" y="450" width="54" height="54" rx="8" fill="#3a4046"/>
  <circle cx="277" cy="477" r="18" fill="#1c2024" stroke="#8a9198" stroke-width="2"/>
  ${[[-7, -6], [7, -6], [0, 2], [-8, 7], [8, 7]].map(([dx, dy]) => `<circle cx="${277 + dx}" cy="${477 + dy}" r="3" fill="#8a9198"/>`).join('')}

  <!-- emergency stop -->
  <rect x="328" y="444" width="46" height="46" rx="6" fill="#ffd21f" stroke="#a58a10" stroke-width="2"/>
  <circle cx="351" cy="467" r="15" fill="#d6261f" stroke="#8f1813" stroke-width="2"/>

  ${
    g2
      ? `<!-- cable support arm and retractor -->
  <rect x="384" y="58" width="18" height="74" fill="#5b6470"/>
  <rect x="384" y="58" width="140" height="18" rx="4" fill="#5b6470"/>
  <rect x="484" y="72" width="40" height="42" rx="6" fill="#3d444d"/>
  <circle cx="504" cy="93" r="10" fill="#89d8ff" stroke="#2c3238" stroke-width="2"/>`
      : ''
  }

  <!-- cable -->
  <path d="${d(cablePts)}" fill="none" stroke="#151719" stroke-width="20" stroke-linecap="round"/>
  <path d="${d(cablePts)}" fill="none" stroke="#33373b" stroke-width="10" stroke-linecap="round"/>

  <!-- holster -->
  <rect x="${holster.x}" y="${holster.y}" width="${holster.w}" height="${holster.h}" rx="8" fill="#4d555d" stroke="#2c3238" stroke-width="2"/>
  <rect x="${holster.x + 8}" y="${holster.y + 6}" width="${holster.w - 16}" height="${holster.h - 24}" rx="5" fill="#2a2f34"/>

  <!-- connector (plug) -->
  <rect x="${conn.x}" y="${conn.y}" width="${conn.w}" height="${conn.h}" rx="12" fill="#2b2f33"/>
  <rect x="${conn.x + 6}" y="${conn.y + 8}" width="${conn.w - 12}" height="20" rx="6" fill="#4a5158"/>
  <rect x="${conn.x + 10}" y="${conn.y + 34}" width="${conn.w - 20}" height="18" rx="4" fill="#ff7a45"/>

  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>
`;

  return { svg, masks: masks.map((m) => ({ componentId: m.componentId, polygon: round(m.polygon) })) };
}

for (const gen of [1, 2]) {
  const id = `rapid-gen${gen}`;
  const { svg, masks } = build(gen);
  const svgPath = resolve(root, 'public/photos', `${id}.svg`);
  const maskPath = resolve(root, 'src/data/photos', `${id}.masks.json`);
  mkdirSync(dirname(svgPath), { recursive: true });
  mkdirSync(dirname(maskPath), { recursive: true });
  writeFileSync(svgPath, svg);
  writeFileSync(maskPath, JSON.stringify(masks, null, 2) + '\n');
  console.log(`wrote ${id}: ${masks.length} masks`);
}
