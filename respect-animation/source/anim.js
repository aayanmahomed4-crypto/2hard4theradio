// "Respect is the Relationship" — deterministic frame renderer.
// render(t) draws the frame at time t (seconds). Every frame is a pure function of t.

const NAVY = "#11142C";
const COL = { coral: "#F25F5C", teal: "#14A098", yellow: "#F6B31B", purple: "#7B5CD6", blue: "#3A86FF", red: "#E5484D", green: "#2FB36B" };

// ---------------------------------------------------------------- helpers
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const ease = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const backOut = (k) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function icon(name, extra = "") {
  const ic = ICONS[name];
  return `<svg viewBox="${ic.vb}" ${extra}>${ic.inner}</svg>`;
}
function readTime(text, narr) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(narr ? 2.6 : 2.1, words * (narr ? 0.42 : 0.38) + (narr ? 1.3 : 1.05));
}

// ---------------------------------------------------------------- characters
const CHARS = {
  Alex: { skin: "#C98E6A", skinD: "#A9714F", hair: "#2A1A16", style: "bob", top: "hoodie", shirt: "#7B5CD6", shirtD: "#5E43B5", pants: "#2E3A59", shoes: "#F4F4F4", tag: COL.purple },
  Sam: { skin: "#8A5639", skinD: "#6E3F26", hair: "#171010", style: "curly", top: "tee", shirt: "#14A098", shirtD: "#0E7C75", pants: "#3B3F52", shoes: "#F25F5C", tag: COL.teal },
  Maya: { skin: "#EDBE9C", skinD: "#D39E7A", hair: "#5A3218", style: "long", top: "cardigan", shirt: "#F6B31B", shirtD: "#D9940A", pants: "#4A6FB5", shoes: "#FFFFFF", tag: "#D98E04" },
  Jordan: { skin: "#B27B58", skinD: "#93603F", hair: "#3A2A20", style: "short", top: "jacket", shirt: "#E5533D", shirtD: "#C23E2A", pants: "#26324A", shoes: "#2B2B2B", tag: COL.coral },
};

const POSES = {
  down: { lu: 7, lf: 6, ru: 7, rf: 6 },
  rest: { lu: 10, lf: 72, ru: 10, rf: 72 },
  restPhoneLowR: { lu: 10, lf: 72, ru: 10, rf: 80 },
  phoneR: { lu: 7, lf: 6, ru: 12, rf: 112 },
  phoneL: { lu: 12, lf: 128, ru: 7, rf: 6 },
  phoneLowR: { lu: 7, lf: 6, ru: 10, rf: 62 },
  phoneHoldR: { lu: 7, lf: 6, ru: 2, rf: 140 },
  reachR: { lu: 7, lf: 6, ru: 80, rf: 12 },
  reachL: { lu: 80, lf: 12, ru: 7, rf: 6 },
  openR: { lu: 7, lf: 6, ru: 34, rf: 58 },
  openL: { lu: 34, lf: 58, ru: 7, rf: 6 },
  shrug: { lu: 30, lf: -62, ru: 30, rf: -62 },
  cross: { lu: 6, lf: 118, ru: 6, rf: 118 },
  chestR: { lu: 7, lf: 6, ru: 6, rf: 142 },
  thinkL: { lu: -6, lf: 158, ru: 7, rf: 6 },
};

function blinkAmt(t, seed) {
  const p = 3.4 + (seed % 7) * 0.23;
  const ph = (t + seed * 1.37) % p;
  return ph < 0.13 ? 1 - Math.sin((ph / 0.13) * Math.PI) * 0.9 : 1;
}
function mouthOpen(t, seed) {
  const v = Math.sin(t * 13.3 + seed) * 0.55 + Math.sin(t * 7.1 + seed * 2) * 0.5 + 0.15;
  return clamp(v);
}

function hairBack(c) {
  const h = c.hair;
  if (c.style === "bob") return `<path d="M -98 -600 Q -102 -694 0 -698 Q 102 -694 98 -600 L 100 -498 Q 100 -476 78 -478 L -78 -478 Q -100 -476 -100 -498 Z" fill="${h}"/>`;
  if (c.style === "long") return `<path d="M -100 -592 Q -106 -702 0 -704 Q 106 -702 100 -592 L 112 -392 Q 114 -370 90 -370 L -90 -370 Q -114 -370 -112 -392 Z" fill="${h}"/>`;
  return "";
}
function hairFront(c) {
  const h = c.hair;
  if (c.style === "bob") return `<path d="M -86 -588 Q -90 -680 0 -682 Q 88 -680 88 -598 Q 62 -642 12 -636 Q -32 -630 -54 -608 Q -70 -598 -86 -588 Z" fill="${h}"/>`;
  if (c.style === "long") return `<path d="M -84 -594 Q -86 -680 0 -684 Q 86 -680 86 -602 L 72 -608 Q 30 -652 -22 -642 Q -62 -626 -84 -594 Z" fill="${h}"/>
    <path d="M -80 -632 Q 0 -700 80 -632" fill="none" stroke="#F25F5C" stroke-width="11" stroke-linecap="round"/>`;
  if (c.style === "curly") {
    let s = `<path d="M -84 -586 Q -88 -668 0 -672 Q 88 -668 84 -586 Q 72 -628 0 -626 Q -72 -628 -84 -586 Z" fill="${h}"/>`;
    [[-74, -622, 24], [-58, -654, 27], [-28, -676, 28], [6, -684, 28], [40, -672, 28], [64, -646, 26], [78, -616, 22], [-10, -650, 26], [26, -650, 24]].forEach(([x, y, r]) => (s += `<circle cx="${x}" cy="${y}" r="${r}" fill="${h}"/>`));
    return s;
  }
  // short
  return `<path d="M -84 -588 Q -88 -678 0 -682 Q 88 -678 84 -588 Q 78 -620 52 -632 Q 10 -648 -30 -638 Q -72 -624 -84 -588 Z" fill="${h}"/>
    <path d="M -46 -668 Q 2 -712 56 -680 Q 18 -668 -46 -668 Z" fill="${h}"/>`;
}

function torso(c) {
  const base = `M -88 -440 Q -88 -474 -54 -474 L 54 -474 Q 88 -474 88 -440 L 98 -262 Q 98 -246 82 -246 L -82 -246 Q -98 -246 -98 -262 Z`;
  let s = "";
  if (c.top === "hoodie") {
    s += `<ellipse cx="0" cy="-472" rx="64" ry="20" fill="${c.shirtD}"/>`;
    s += `<path d="${base}" fill="${c.shirt}"/>`;
    s += `<path d="M -40 -474 Q 0 -440 40 -474" fill="none" stroke="${c.shirtD}" stroke-width="10"/>`;
    s += `<line x1="-16" y1="-462" x2="-19" y2="-392" stroke="#fff" stroke-width="6" stroke-linecap="round"/><line x1="16" y1="-462" x2="19" y2="-392" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`;
    s += `<rect x="-62" y="-336" width="124" height="58" rx="16" fill="${c.shirtD}"/>`;
  } else if (c.top === "tee") {
    s += `<path d="${base}" fill="${c.shirt}"/>`;
    s += `<path d="M -30 -474 Q 0 -446 30 -474 Z" fill="${c.skinD}"/>`;
    s += `<rect x="-93" y="-402" width="186" height="22" fill="#FFFFFF" opacity="0.9"/>`;
  } else if (c.top === "cardigan") {
    s += `<path d="${base}" fill="#FFFFFF"/>`;
    s += `<path d="M -88 -440 Q -88 -474 -54 -474 L -26 -474 L -18 -246 L -82 -246 Q -98 -246 -98 -262 Z" fill="${c.shirt}"/>`;
    s += `<path d="M 88 -440 Q 88 -474 54 -474 L 26 -474 L 18 -246 L 82 -246 Q 98 -246 98 -262 Z" fill="${c.shirt}"/>`;
    [-420, -370, -320].forEach((y) => (s += `<circle cx="-30" cy="${y}" r="6" fill="${c.shirtD}"/>`));
    s += `<path d="M -26 -474 Q 0 -452 26 -474" fill="none" stroke="${c.skinD}" stroke-width="6"/>`;
  } else {
    s += `<path d="${base}" fill="${c.shirt}"/>`;
    s += `<path d="M -30 -474 L 0 -420 L 30 -474 Z" fill="#26324A"/>`;
    s += `<path d="M -54 -476 L -26 -474 L 0 -420 L -14 -400 Z" fill="${c.shirtD}"/><path d="M 54 -476 L 26 -474 L 0 -420 L 14 -400 Z" fill="${c.shirtD}"/>`;
    s += `<line x1="0" y1="-420" x2="0" y2="-250" stroke="${c.shirtD}" stroke-width="5"/>`;
    s += `<rect x="-70" y="-330" width="40" height="8" rx="4" fill="${c.shirtD}"/><rect x="30" y="-330" width="40" height="8" rx="4" fill="${c.shirtD}"/>`;
  }
  return s;
}

function arm(c, side, up, fore, phone, t) {
  const a1 = -side * up;
  const a2 = side * fore;
  const sleeve = c.top === "cardigan" ? c.shirt : c.shirt;
  const foreFill = c.top === "tee" ? c.skin : sleeve;
  let ph = "";
  if (phone) {
    const counter = -(a1 + a2) - side * 12;
    ph = `<g transform="translate(0,104) rotate(${counter.toFixed(2)}) translate(0,-40)">
      <rect x="-26" y="-50" width="52" height="96" rx="10" fill="#1E2233"/>
      <rect x="-20" y="-43" width="40" height="76" rx="5" fill="#9FE3FF"/>
      <rect x="-14" y="-34" width="28" height="7" rx="3" fill="#FFFFFF" opacity=".8"/>
      <rect x="-14" y="-20" width="20" height="7" rx="3" fill="#FFFFFF" opacity=".6"/>
      <rect x="-6" y="-6" width="20" height="7" rx="3" fill="#3A86FF" opacity=".8"/></g>`;
  }
  return `<g transform="translate(${side * 88},-450) rotate(${a1.toFixed(2)})">
    <rect x="-21" y="-16" width="42" height="136" rx="21" fill="${sleeve}"/>
    <g transform="translate(0,118) rotate(${a2.toFixed(2)})">
      <rect x="-19" y="-12" width="38" height="118" rx="19" fill="${foreFill}"/>
      ${c.top === "tee" ? "" : `<rect x="-20" y="86" width="40" height="12" rx="6" fill="${c.shirtD}"/>`}
      ${ph}
      <circle cx="0" cy="106" r="21" fill="${c.skin}"/>
    </g></g>`;
}

const BROWS = {
  neutral: ["M -46 -614 L -14 -616", "M 14 -616 L 46 -614"],
  smile: ["M -46 -614 Q -30 -624 -12 -616", "M 12 -616 Q 30 -624 46 -614"],
  happy: ["M -46 -616 Q -30 -630 -12 -620", "M 12 -620 Q 30 -630 46 -616"],
  sad: ["M -46 -608 L -14 -624", "M 14 -624 L 46 -608"],
  uneasy: ["M -46 -610 L -14 -621", "M 14 -621 L 46 -610"],
  annoyed: ["M -46 -624 L -14 -609", "M 14 -609 L 46 -624"],
  think: ["M -46 -622 Q -30 -632 -12 -624", "M 14 -614 L 46 -612"],
};
const MOUTHS = {
  neutral: `<path d="M -16 -530 Q 0 -525 16 -530" fill="none" stroke="#5A1F2A" stroke-width="6" stroke-linecap="round"/>`,
  smile: `<path d="M -24 -536 Q 0 -512 24 -536" fill="none" stroke="#5A1F2A" stroke-width="6" stroke-linecap="round"/>`,
  happy: `<path d="M -28 -540 Q 0 -498 28 -540 Z" fill="#5A1F2A"/><path d="M -20 -537 L 20 -537 L 18 -530 L -18 -530 Z" fill="#fff"/>`,
  sad: `<path d="M -20 -522 Q 0 -538 20 -522" fill="none" stroke="#5A1F2A" stroke-width="6" stroke-linecap="round"/>`,
  uneasy: `<path d="M -22 -528 Q -11 -536 0 -528 Q 11 -520 22 -528" fill="none" stroke="#5A1F2A" stroke-width="6" stroke-linecap="round"/>`,
  annoyed: `<path d="M -18 -525 L 18 -531" fill="none" stroke="#5A1F2A" stroke-width="6" stroke-linecap="round"/>`,
  think: `<path d="M -6 -528 Q 8 -532 20 -526" fill="none" stroke="#5A1F2A" stroke-width="6" stroke-linecap="round"/>`,
};

function drawChar(name, s, t) {
  const c = CHARS[name];
  const seed = name.length * 1.7 + name.charCodeAt(0) * 0.05;
  const bob = Math.sin(t * 2.1 + seed) * 2.6;
  const bl = blinkAmt(t, seed);
  const talkO = s.talking ? mouthOpen(t, seed) : 0;
  const tilt = (s.talking ? Math.sin(t * 2.7 + seed) * 2.6 : Math.sin(t * 0.9 + seed) * 0.8) + (s.tilt || 0);
  const pdx = s.lookX * 6;
  const pdy = s.lookDown ? 6 : 0;
  let g = `<g transform="translate(${s.x.toFixed(1)},${s.y}) scale(${s.scale})">`;
  if (!s.seated) {
    g += `<ellipse cx="0" cy="0" rx="118" ry="18" fill="rgba(0,0,0,.16)"/>`;
    g += `<rect x="-60" y="-266" width="54" height="244" rx="24" fill="${c.pants}"/><rect x="6" y="-266" width="54" height="244" rx="24" fill="${c.pants}"/>`;
    g += `<rect x="-74" y="-40" width="70" height="40" rx="18" fill="${c.shoes}"/><rect x="4" y="-40" width="70" height="40" rx="18" fill="${c.shoes}"/>`;
    g += `<rect x="-74" y="-12" width="70" height="12" rx="6" fill="rgba(0,0,0,.18)"/><rect x="4" y="-12" width="70" height="12" rx="6" fill="rgba(0,0,0,.18)"/>`;
  }
  g += `<g transform="translate(0,${bob.toFixed(2)}) rotate(${(s.lean || 0).toFixed(2)} 0 -250)">`;
  // back hair follows the head
  g += `<g transform="rotate(${tilt.toFixed(2)} 0 -500)">${hairBack(c)}</g>`;
  g += torso(c);
  g += `<rect x="-22" y="-522" width="44" height="60" rx="14" fill="${c.skinD}"/>`;
  // head
  g += `<g transform="rotate(${tilt.toFixed(2)} 0 -500)">`;
  g += `<ellipse cx="-80" cy="-576" rx="15" ry="20" fill="${c.skinD}"/><ellipse cx="80" cy="-576" rx="15" ry="20" fill="${c.skinD}"/>`;
  g += `<ellipse cx="0" cy="-578" rx="80" ry="88" fill="${c.skin}"/>`;
  g += `<ellipse cx="-48" cy="-548" rx="15" ry="9" fill="#F28C8C" opacity=".35"/><ellipse cx="48" cy="-548" rx="15" ry="9" fill="#F28C8C" opacity=".35"/>`;
  const er = Math.max(1.6, 12.5 * bl);
  [-29, 29].forEach((ex) => {
    g += `<ellipse cx="${(ex + pdx).toFixed(1)}" cy="${(-582 + pdy).toFixed(1)}" rx="10" ry="${er.toFixed(2)}" fill="#1B1B2A"/>`;
    if (bl > 0.6) g += `<circle cx="${(ex + pdx + 3.5).toFixed(1)}" cy="${(-586 + pdy).toFixed(1)}" r="3.2" fill="#fff"/>`;
  });
  const br = BROWS[s.expr] || BROWS.neutral;
  g += `<path d="${br[0]}" stroke="${c.hair}" stroke-width="7" stroke-linecap="round" fill="none"/><path d="${br[1]}" stroke="${c.hair}" stroke-width="7" stroke-linecap="round" fill="none"/>`;
  g += `<path d="M -6 -552 Q 0 -545 6 -552" fill="none" stroke="${c.skinD}" stroke-width="5" stroke-linecap="round"/>`;
  if (talkO > 0.05) {
    const ry = 4 + 13 * talkO;
    g += `<ellipse cx="0" cy="-530" rx="${(14 + 5 * talkO).toFixed(1)}" ry="${ry.toFixed(1)}" fill="#5A1F2A"/>`;
    if (talkO > 0.4) g += `<ellipse cx="0" cy="${(-530 + ry * 0.55).toFixed(1)}" rx="9" ry="${(ry * 0.35).toFixed(1)}" fill="#E36F7E"/>`;
  } else g += MOUTHS[s.expr] || MOUTHS.neutral;
  g += hairFront(c);
  g += `</g>`;
  // arms (in front)
  g += arm(c, -1, s.lu, s.lf, s.phone === "L", t) + arm(c, 1, s.ru, s.rf, s.phone === "R", t);
  g += `</g></g>`;
  return g;
}

// ---------------------------------------------------------------- backgrounds
function cloud(x, y, s) {
  return `<g transform="translate(${x.toFixed(1)},${y}) scale(${s})" fill="#fff" opacity=".92"><ellipse cx="0" cy="0" rx="90" ry="34"/><ellipse cx="-50" cy="6" rx="56" ry="26"/><ellipse cx="54" cy="8" rx="60" ry="24"/><ellipse cx="10" cy="-26" rx="54" ry="34"/></g>`;
}
function tree(x, y, s, c1 = "#5DB35F", c2 = "#3F9A4A") {
  return `<g transform="translate(${x},${y}) scale(${s})"><rect x="-16" y="-150" width="32" height="160" rx="12" fill="#8A5A3B"/>
    <circle cx="0" cy="-230" r="110" fill="${c2}"/><circle cx="-70" cy="-180" r="80" fill="${c1}"/><circle cx="70" cy="-190" r="84" fill="${c1}"/><circle cx="0" cy="-280" r="86" fill="${c1}"/></g>`;
}
function table(color = "#A86B3C", top = "#C98B55") {
  return `<rect x="150" y="790" width="1620" height="22" rx="10" fill="${top}"/><rect x="150" y="806" width="1620" height="40" rx="6" fill="${color}"/>
    <rect x="300" y="846" width="40" height="240" fill="${color}"/><rect x="1580" y="846" width="40" height="240" fill="${color}"/>
    <rect x="150" y="846" width="1620" height="14" fill="rgba(0,0,0,.15)"/>`;
}
function bgCourtyard(t, seated) {
  let s = `<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7CC8FF"/><stop offset="1" stop-color="#D9F1FF"/></linearGradient></defs>`;
  s += `<rect width="1920" height="1080" fill="url(#sky)"/><circle cx="1690" cy="150" r="70" fill="#FFE27A"/>`;
  s += cloud(((t * 14 + 300) % 2300) - 200, 140, 1) + cloud(((t * 9 + 1300) % 2300) - 200, 220, 0.8);
  s += `<rect x="190" y="250" width="1540" height="470" fill="#F1D4AA"/><rect x="170" y="230" width="1580" height="34" rx="8" fill="#C9694A"/>`;
  for (let r = 0; r < 2; r++) for (let i = 0; i < 9; i++) {
    const x = 250 + i * 162, y = 300 + r * 170;
    if (i === 4 && r === 1) continue;
    s += `<rect x="${x}" y="${y}" width="104" height="120" rx="8" fill="#9FD3F2" stroke="#FFFFFF" stroke-width="8"/><line x1="${x + 52}" y1="${y}" x2="${x + 52}" y2="${y + 120}" stroke="#fff" stroke-width="6"/>`;
  }
  s += `<rect x="900" y="470" width="120" height="250" rx="10" fill="#8A4F38"/><circle cx="1000" cy="600" r="7" fill="#F6B31B"/>`;
  s += `<circle cx="960" cy="290" r="0" fill="none"/>`;
  s += `<rect y="700" width="1920" height="380" fill="#D8CFC2"/><rect y="700" width="1920" height="34" fill="#86C26A"/>`;
  for (let i = 0; i < 12; i++) s += `<line x1="${i * 180 - 40}" y1="734" x2="${i * 220 - 300}" y2="1080" stroke="#CBC1B3" stroke-width="4"/>`;
  s += tree(110, 740, 1.05) + tree(1820, 750, 1.1);
  if (seated) s += "";
  return s;
}
function bgCorridor(t) {
  let s = `<rect width="1920" height="1080" fill="#E7EDF6"/><rect width="1920" height="70" fill="#D5DEEB"/>`;
  [380, 960, 1540].forEach((x) => (s += `<rect x="${x - 120}" y="70" width="240" height="18" rx="9" fill="#FFFFFF"/><rect x="${x - 120}" y="88" width="240" height="40" fill="rgba(255,255,255,.35)"/>`));
  s += `<rect x="120" y="230" width="380" height="250" rx="16" fill="#C58B5A"/><rect x="138" y="248" width="344" height="214" rx="10" fill="#E9C9A0"/>`;
  [[160, 270, "#FFFFFF", -4], [310, 262, "#FFE27A", 3], [180, 370, "#9FD3F2", 2], [330, 360, "#F7A8A6", -3]].forEach(([x, y, f, r]) => (s += `<rect x="${x}" y="${y}" width="130" height="80" rx="6" fill="${f}" transform="rotate(${r} ${x + 65} ${y + 40})"/>`));
  for (let i = 0; i < 12; i++) {
    const x = 560 + i * 112;
    s += `<rect x="${x}" y="300" width="104" height="560" rx="8" fill="${i % 2 ? "#4C7BD9" : "#5A89E6"}"/>`;
    for (let v = 0; v < 4; v++) s += `<rect x="${x + 26}" y="${330 + v * 14}" width="52" height="6" rx="3" fill="rgba(0,0,0,.18)"/>`;
    s += `<rect x="${x + 78}" y="560" width="10" height="44" rx="5" fill="#D8E2F5"/>`;
  }
  s += `<rect y="860" width="1920" height="220" fill="#C9D3E0"/><rect y="860" width="1920" height="12" fill="#B4C0D2"/>`;
  return s;
}
function bgClassroom(t) {
  let s = `<rect width="1920" height="1080" fill="#F3ECE1"/>`;
  s += `<rect x="1180" y="150" width="560" height="440" rx="14" fill="#FFFFFF"/><rect x="1200" y="170" width="520" height="400" rx="8" fill="#BFE6FF"/>`;
  s += cloud(1300 + Math.sin(t * 0.2) * 30, 300, 0.7) + tree(1600, 580, 0.7);
  s += `<rect x="1200" y="560" width="520" height="10" fill="#FFFFFF"/><line x1="1460" y1="170" x2="1460" y2="570" stroke="#fff" stroke-width="12"/>`;
  s += `<rect x="150" y="170" width="820" height="420" rx="14" fill="#5B6B5A"/><rect x="168" y="188" width="784" height="384" rx="8" fill="#2F6B55"/>`;
  s += `<path d="M 230 270 Q 300 240 380 270 T 540 270" stroke="#E7F2EC" stroke-width="7" fill="none" stroke-linecap="round"/>`;
  s += `<path d="M 230 340 L 640 340" stroke="#E7F2EC" stroke-width="7" stroke-linecap="round"/><path d="M 230 400 L 520 400" stroke="#E7F2EC" stroke-width="7" stroke-linecap="round"/>`;
  s += `<rect y="820" width="1920" height="260" fill="#C99B6D"/><rect y="820" width="1920" height="14" fill="#B58757"/>`;
  return s;
}
function bgSunset(t) {
  let s = `<defs><linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF9A6B"/><stop offset=".55" stop-color="#FFC98F"/><stop offset="1" stop-color="#FFE7C2"/></linearGradient></defs>`;
  s += `<rect width="1920" height="1080" fill="url(#sun)"/><circle cx="1500" cy="520" r="120" fill="#FFF1C9" opacity=".95"/>`;
  s += cloud(((t * 8 + 500) % 2300) - 200, 180, 0.9);
  s += `<path d="M 0 600 Q 400 470 800 590 T 1920 560 L 1920 1080 L 0 1080 Z" fill="#E98B6B"/><path d="M 0 680 Q 500 590 1000 690 T 1920 650 L 1920 1080 L 0 1080 Z" fill="#C9705A"/>`;
  s += `<rect y="720" width="1920" height="360" fill="#8DB867"/>`;
  s += tree(160, 760, 1.05, "#6FA75A", "#4F8A45") + tree(1780, 770, 1.0, "#6FA75A", "#4F8A45");
  return s;
}
function bgDark(t) {
  let s = `<defs><radialGradient id="dk" cx=".5" cy=".45" r=".75"><stop offset="0" stop-color="#2A1838"/><stop offset="1" stop-color="#0B0A14"/></radialGradient></defs>`;
  s += `<rect width="1920" height="1080" fill="url(#dk)"/>`;
  const pulse = 0.18 + 0.08 * Math.sin(t * 2.2);
  s += `<circle cx="960" cy="500" r="520" fill="#E5484D" opacity="${pulse.toFixed(3)}" filter="url(#blur)"/>`;
  for (let i = 0; i < 26; i++) {
    const x = (i * 337) % 1920, y = ((i * 211 + t * (12 + (i % 5) * 4)) % 1180) - 50;
    s += `<circle cx="${x}" cy="${(1080 - y).toFixed(1)}" r="${2 + (i % 3)}" fill="#fff" opacity=".18"/>`;
  }
  return s;
}
function bgBrand(t) {
  let s = `<defs><linearGradient id="br" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5B3FD0"/><stop offset="1" stop-color="#14A098"/></linearGradient></defs>`;
  s += `<rect width="1920" height="1080" fill="url(#br)"/>`;
  const shapes = [[180, 220, 90, COL.yellow], [1720, 260, 120, COL.coral], [260, 860, 140, "#FFFFFF"], [1640, 860, 80, COL.yellow], [980, 140, 50, "#FFFFFF"]];
  shapes.forEach(([x, y, r, f], i) => {
    const dy = Math.sin(t * 0.8 + i) * 18;
    s += `<g transform="translate(${x},${(y + dy).toFixed(1)})" opacity=".22"><path d="M ${-r} ${-r * 0.6} Q ${-r} ${-r} ${-r * 0.6} ${-r} L ${r * 0.6} ${-r} Q ${r} ${-r} ${r} ${-r * 0.6} L ${r} ${r * 0.2} Q ${r} ${r * 0.6} ${r * 0.6} ${r * 0.6} L ${-r * 0.1} ${r * 0.6} L ${-r * 0.5} ${r} L ${-r * 0.45} ${r * 0.6} Q ${-r} ${r * 0.6} ${-r} ${r * 0.2} Z" fill="${f}"/></g>`;
  });
  return s;
}
const BGS = { courtyard: bgCourtyard, corridor: bgCorridor, classroom: bgClassroom, sunset: bgSunset, dark: bgDark, brand: bgBrand };

// ---------------------------------------------------------------- cards (HTML)
function popStyle(e, pos) {
  const k = clamp(e / 0.38);
  const sc = lerp(0.82, 1, backOut(k));
  const op = clamp(e / 0.22);
  const tr = pos === "center" ? `translate(-50%,-50%) scale(${sc.toFixed(3)})` : `translateX(-50%) scale(${sc.toFixed(3)})`;
  const top = pos === "center" ? "top:46%;" : `top:${pos === "top2" ? 40 : 54}px;`;
  return `${top}transform:${tr};opacity:${op.toFixed(3)};`;
}
function appear(e, at, dur = 0.3) {
  const k = clamp((e - at) / dur);
  return `opacity:${k.toFixed(3)};transform:translateY(${((1 - ease(k)) * 24).toFixed(1)}px) scale(${lerp(0.9, 1, backOut(k)).toFixed(3)});`;
}
function renderCard(card, e, fadeOut) {
  let h = "";
  const opMul = fadeOut != null ? 1 - clamp(fadeOut / 0.3) : 1;
  const wrap = (inner, w, extra = "") => `<div class="card" style="width:${w}px;${popStyle(e, card.pos || "center")}${extra}"><div style="opacity:${opMul}">${inner}</div></div>`;
  if (card.dim) h += `<div class="dim" style="opacity:${(clamp(e / 0.3) * opMul).toFixed(3)}"></div>`;
  if (card.type === "formula") {
    let inner = `<h2 style="text-align:center;${appear(e, 0)}">HEALTHY RELATIONSHIPS =</h2><div class="formula">`;
    card.parts.forEach((p, i) => {
      if (i) inner += `<span class="plus" style="${appear(e, 0.55 + i * 0.6 - 0.15)}">+</span>`;
      inner += `<span class="chip" style="background:${p[1]};${appear(e, 0.55 + i * 0.6)}">${p[0]}</span>`;
    });
    h += wrap(inner + `</div>`, 1640, "padding:36px 50px;");
  } else if (card.type === "icons") {
    let inner = `<h2 style="text-align:center;color:${card.color || NAVY}">${esc(card.title)}</h2><div class="iconrow">`;
    card.items.forEach((it, i) => (inner += `<div class="ico" style="${appear(e, 0.35 + i * (card.stagger || 0.45))}"><div class="disc" style="background:${it.color}">${icon(it.icon)}</div>${esc(it.label)}</div>`));
    h += wrap(inner + `</div>`, card.w || 1400, "padding:38px 50px 42px;");
  } else if (card.type === "list") {
    let inner = `<h1 style="color:${card.color}">${esc(card.title)}</h1>`;
    card.items.forEach((it, i) => (inner += `<div class="bul" style="${appear(e, 0.5 + i * (card.stagger || 1))}"><span class="tick" style="background:${card.color}">${icon("FaUserCheck")}</span>${esc(it)}</div>`));
    h += wrap(inner, 1260);
  } else if (card.type === "banner") {
    let inner = `<h1 style="text-align:center;color:${card.color || NAVY};font-size:${card.size || 84}px">${card.html || esc(card.title)}</h1>`;
    if (card.sub) inner += `<div style="text-align:center;font-size:40px;font-weight:800;margin-top:20px;${appear(e, 0.5)}">${esc(card.sub)}</div>`;
    h += wrap(inner, card.w || 1400, "padding:54px 70px;");
  } else if (card.type === "steps") {
    let inner = `<h2 style="text-align:center;color:${COL.teal}">GOOD COMMUNICATION</h2><div class="steps">`;
    card.items.forEach((it, i) => {
      if (i) inner += `<div class="arrow" style="${appear(e, 0.45 + i * 0.75 - 0.2)}">→</div>`;
      inner += `<div class="step" style="${appear(e, 0.45 + i * 0.75)}"><div class="disc" style="background:${it.color}">${icon(it.icon)}</div>${esc(it.label)}</div>`;
    });
    h += wrap(inner + `</div>`, 1500, "padding:34px 50px 30px;");
  }
  return h;
}

// ---------------------------------------------------------------- the script
const RESPECT_C = COL.coral;
const SCENES = [
  {
    id: "title", bg: "brand", chars: {},
    beats: [{ d: 5.6, overlay: "title" }],
  },
  {
    id: "s1", label: "Scene 1 · The question", bg: "courtyard", seatedTable: true,
    chars: {
      Maya: { x: 400, y: 1076, scale: 0.92, seated: true, pose: "down", expr: "smile" },
      Alex: { x: 770, y: 1076, scale: 0.92, seated: true, pose: "phoneR", expr: "neutral", lookDown: true, phone: "R" },
      Sam: { x: 1140, y: 1076, scale: 0.92, seated: true, pose: "down", expr: "smile" },
      Jordan: { x: 1510, y: 1076, scale: 0.92, seated: true, pose: "down", expr: "neutral" },
    },
    beats: [
      { d: 2.2 },
      { who: "Alex", text: "Okay, serious question. What actually makes a relationship healthy?", set: { Alex: { pose: "phoneLowR", lookDown: false, expr: "smile" } } },
      { who: "Sam", text: "Trust?", set: { Sam: { expr: "think", pose: "thinkL" } } },
      { who: "Maya", text: "Not arguing all the time?", set: { Maya: { expr: "smile" }, Sam: { pose: "down", expr: "smile" } } },
      { who: "Jordan", text: "Being able to be yourself?", set: { Jordan: { expr: "smile", pose: "openR" } } },
      { who: "Alex", text: "Exactly. But what does that actually look like?", set: { Alex: { expr: "happy", pose: "openL" }, Jordan: { pose: "down" } } },
      { d: 4.8, card: { type: "formula", pos: "top", parts: [["RESPECT", COL.coral], ["TRUST", COL.teal], ["COMMUNICATION", COL.purple], ["BOUNDARIES", COL.yellow]] }, set: { Alex: { pose: "phoneLowR", expr: "smile" } } },
      {
        who: "N", text: "Relationships aren't just about dating. They include friendships, family relationships, classmates and people we care about.",
        card: { type: "icons", pos: "top", title: "RELATIONSHIPS INCLUDE…", items: [
          { icon: "FaUserFriends", label: "Friendships", color: COL.teal },
          { icon: "FaHome", label: "Family", color: COL.purple },
          { icon: "FaSchool", label: "Classmates", color: COL.yellow },
          { icon: "FaHeart", label: "People we care about", color: COL.coral }], stagger: 0.9, w: 1360 },
      },
      { d: 0.8, card: null },
    ],
  },
  {
    id: "s2", label: "Scene 2 · Respect", bg: "corridor",
    chars: {
      Maya: { x: 720, y: 905, scale: 0.95, pose: "down", expr: "neutral" },
      Sam: { x: 1200, y: 905, scale: 0.95, pose: "down", expr: "smile" },
    },
    beats: [
      { d: 1.2 },
      { who: "Maya", text: "Sorry, I don't really feel like coming today.", set: { Maya: { expr: "uneasy", pose: "cross" } } },
      { who: "Sam", text: "That's okay. Maybe another time.", set: { Sam: { expr: "smile", pose: "openL" }, Maya: { expr: "smile" } } },
      { d: 1.3, freeze: true },
      { who: "N", text: "First: respect.", card: { type: "banner", title: "RESPECT", color: RESPECT_C, size: 110, w: 900 } },
      { d: 6.2, card: { type: "list", title: "RESPECT", color: RESPECT_C, dim: true, items: ["Listen to each other.", "Accept differences.", "Don't insult or embarrass someone.", "Treat people the way you want to be treated."], stagger: 1.25 } },
      { who: "N", text: "Respect means understanding that someone else's feelings, opinions and choices matter too." },
      { d: 0.8, card: null },
    ],
  },
  {
    id: "s3", label: "Scene 3 · Boundaries", bg: "classroom",
    chars: {
      Sam: { x: 700, y: 905, scale: 0.95, pose: "down", expr: "smile" },
      Jordan: { x: 1160, y: 905, scale: 0.95, pose: "phoneR", expr: "smile", lookDown: true, phone: "R" },
    },
    beats: [
      { d: 1.8 },
      { who: "Sam", text: "Let me see your messages.", set: { Sam: { pose: "reachR", lean: 7, x: 760, expr: "smile" } } },
      { who: "Jordan", text: "I'd rather keep my messages private.", set: { Jordan: { pose: "phoneHoldR", lookDown: false, x: 1230, lean: 5, expr: "neutral" } } },
      { who: "Sam", text: "But if we're friends, you should show me.", set: { Sam: { pose: "shrug", lean: 0, x: 730, expr: "annoyed" } } },
      { who: "Jordan", text: "Being friends doesn't mean I have to give up my privacy.", set: { Jordan: { expr: "smile", lean: 0 } } },
      { d: 1.9, set: { Sam: { pose: "thinkL", expr: "think" } } },
      { who: "Sam", text: "Fair enough.", set: { Sam: { pose: "down", expr: "smile" }, Jordan: { expr: "happy" } } },
      { d: 2.4, card: { type: "banner", title: "BOUNDARIES ARE HEALTHY", color: COL.teal, w: 1500 } },
      {
        who: "N", text: "Everyone has boundaries. That could mean needing personal space, keeping something private, or saying no to something you're uncomfortable with.",
        card: { type: "icons", pos: "center", dim: true, title: "BOUNDARIES ARE HEALTHY", color: COL.teal, items: [
          { icon: "FaPeopleArrows", label: "Needing personal space", color: COL.teal },
          { icon: "FaLock", label: "Keeping something private", color: COL.purple },
          { icon: "FaHandPaper", label: "Saying no when you're uncomfortable", color: COL.coral }], stagger: 1.6, w: 1260 },
      },
      { who: "N", text: "And remember: No means no. You don't have to feel guilty for setting a boundary.", card: { type: "banner", dim: true, title: "NO MEANS NO.", color: COL.coral, size: 110, sub: "You don't have to feel guilty for setting a boundary.", w: 1400 } },
      { d: 0.8, card: null },
    ],
  },
  {
    id: "s4", label: "Scene 4 · Pressure", bg: "courtyard",
    chars: {
      Jordan: { x: 1660, y: 862, scale: 0.86, pose: "down", expr: "neutral" },
      Sam: { x: 1360, y: 880, scale: 0.9, pose: "down", expr: "neutral" },
      Alex: { x: 600, y: 905, scale: 0.95, pose: "down", expr: "smile" },
      Maya: { x: 1000, y: 905, scale: 0.95, pose: "down", expr: "neutral" },
    },
    beats: [
      { d: 1.1 },
      { who: "Alex", text: "Come on, just do it. Everyone else is.", set: { Alex: { pose: "openR", lean: 8, x: 640, expr: "smile" }, Maya: { expr: "uneasy" } } },
      { who: "Maya", text: "I don't want to.", set: { Maya: { pose: "cross", expr: "uneasy" } } },
      { who: "Alex", text: "Seriously? Don't be boring.", set: { Alex: { pose: "shrug", expr: "annoyed", lean: 4 }, Maya: { expr: "sad" }, Sam: { expr: "uneasy" }, Jordan: { expr: "uneasy" } } },
      { d: 1.3, freeze: true },
      { who: "N", text: "Pressure isn't respect." },
      { who: "N", text: "You should never have to do something just to keep a friend, impress someone or prove that you care.", card: { type: "banner", dim: true, html: `A HEALTHY FRIEND WILL RESPECT YOUR <span style="color:${COL.coral}">“NO.”</span>`, size: 80, w: 1500 } },
      { d: 1.0 },
    ],
  },
  {
    id: "s5", label: "Scene 5 · Communication", bg: "sunset", seatedTable: true, tableColor: ["#8A5638", "#A86B47"],
    chars: {
      Jordan: { x: 760, y: 1076, scale: 0.92, seated: true, pose: "down", expr: "neutral" },
      Sam: { x: 1160, y: 1076, scale: 0.92, seated: true, pose: "down", expr: "smile" },
    },
    beats: [
      { d: 1.4 },
      { who: "Jordan", text: "When you didn't invite me yesterday, I felt left out.", set: { Jordan: { expr: "sad" }, Sam: { expr: "neutral" } } },
      { who: "Sam", text: "I didn't realise you felt that way. I'm sorry.", set: { Sam: { expr: "sad", pose: "chestR" } } },
      { who: "Jordan", text: "Thanks for listening.", set: { Jordan: { expr: "smile" }, Sam: { expr: "smile", pose: "down" } } },
      { d: 1.0, set: { Jordan: { expr: "happy" } } },
      {
        who: "N", text: "Good communication doesn't mean you never disagree.",
        card: { type: "steps", pos: "top2", items: [
          { label: "Talk", icon: "FaComments", color: COL.teal },
          { label: "Listen", icon: "FaAssistiveListeningSystems", color: COL.purple },
          { label: "Understand", icon: "FaLightbulb", color: COL.yellow },
          { label: "Solve", icon: "FaHandshake", color: COL.coral }] },
      },
      { who: "N", text: "It means being honest about how you feel, listening to the other person and trying to solve problems without insulting, threatening or humiliating each other." },
      { d: 0.8, card: null },
    ],
  },
  {
    id: "s6", label: "Scene 6 · Red flags", bg: "dark", chars: {},
    beats: [
      { d: 0.6 },
      { who: "N", text: "Sometimes, a relationship can become unhealthy.", overlay: "flagsTitle", d: 3.8 },
      { d: 14.6, overlay: "flags" },
    ],
  },
  {
    id: "end", bg: "brand", chars: {},
    beats: [{ d: 7.5, overlay: "end" }],
  },
];

const FLAGS = [
  { icon: "FaMobileAlt", text: "Checking your phone or messages without asking" },
  { icon: "FaUserSlash", text: "Telling you who you can and can't see" },
  { icon: "FaCommentSlash", text: "Put-downs and “jokes” that hurt" },
  { icon: "FaSadTear", text: "Making you feel guilty for saying no" },
  { icon: "FaBolt", text: "Jealousy, anger or threats when you disagree" },
  { icon: "FaExclamationTriangle", text: "Pressure to “prove” that you care" },
];

// ---------------------------------------------------------------- build timeline
const BUILT = [];
const CAPTIONS = [];
let TOTAL = 0;
for (const sc of SCENES) {
  let t = 0;
  const beats = [];
  for (const b of sc.beats) {
    const d = b.d != null ? b.d : readTime(b.text, b.who === "N");
    beats.push({ ...b, t0: t, t1: t + d });
    if (b.text) CAPTIONS.push({ start: TOTAL + t, end: TOTAL + t + d - 0.15, who: b.who === "N" ? "Narrator" : b.who, text: b.text });
    t += d;
  }
  // character keyframes
  const keys = {};
  for (const name of Object.keys(sc.chars)) {
    let st = { phone: null, lookDown: false, lean: 0, tilt: 0, ...sc.chars[name] };
    keys[name] = [{ t0: 0, st }];
    for (const b of beats) if (b.set && b.set[name]) { st = { ...st, ...b.set[name] }; keys[name].push({ t0: b.t0, st }); }
  }
  // card intervals and freeze start
  const cards = [];
  let cur = null;
  let freezeAt = null;
  for (const b of beats) {
    if (b.card !== undefined) {
      if (cur) { cur.end = b.t0; cards.push(cur); cur = null; }
      if (b.card) cur = { card: b.card, start: b.t0, end: t };
    }
    if (b.freeze && freezeAt == null) freezeAt = b.t0;
  }
  if (cur) cards.push(cur);
  BUILT.push({ ...sc, start: TOTAL, dur: t, beats, keys, cards, freezeAt });
  TOTAL += t;
}

function poseVals(st) {
  let name = st.pose;
  if (st.seated && name === "down") name = "rest";
  if (st.seated && name === "phoneLowR") name = "restPhoneLowR";
  const p = { ...(POSES[name] || POSES.down) };
  if (st.seated) {
    if (p.lu <= 8 && p.lf <= 8) { p.lu = 10; p.lf = 72; }
    if (p.ru <= 8 && p.rf <= 8) { p.ru = 10; p.rf = 72; }
  }
  return { lu: p.lu, lf: p.lf, ru: p.ru, rf: p.rf };
}
function charState(sc, name, t, speaker) {
  const ks = sc.keys[name];
  let i = 0;
  while (i + 1 < ks.length && ks[i + 1].t0 <= t) i++;
  const curK = ks[i], prevK = ks[Math.max(0, i - 1)];
  const k = i === 0 ? 1 : ease(clamp((t - curK.t0) / 0.5));
  const a = prevK.st, b = curK.st;
  const pa = poseVals(a), pb = poseVals(b);
  const s = { ...b };
  ["x", "y", "lean", "tilt", "scale"].forEach((p) => (s[p] = lerp(a[p] != null ? a[p] : b[p], b[p], k)));
  ["lu", "lf", "ru", "rf"].forEach((p) => (s[p] = lerp(pa[p], pb[p], k)));
  // keep phone visible during the transition if either state holds it
  s.phone = b.phone || (k < 1 ? a.phone : null);
  // gaze
  let target = null;
  if (speaker && speaker !== name && sc.chars[speaker]) target = charX(sc, speaker, t);
  else if (speaker === name) {
    const others = Object.keys(sc.chars).filter((n) => n !== name);
    if (others.length) {
      const myX = s.x;
      others.sort((p, q) => Math.abs(charX(sc, p, t) - myX) - Math.abs(charX(sc, q, t) - myX));
      target = charX(sc, others[0], t);
    }
  }
  s.lookX = b.lookX != null ? b.lookX : target != null ? clamp((target - s.x) / 260, -1, 1) : 0;
  return s;
}
function charX(sc, name, t) {
  const ks = sc.keys[name];
  let i = 0;
  while (i + 1 < ks.length && ks[i + 1].t0 <= t) i++;
  const prev = ks[Math.max(0, i - 1)].st.x, cur = ks[i].st.x;
  return lerp(prev, cur, i === 0 ? 1 : ease(clamp((t - ks[i].t0) / 0.5)));
}

// ---------------------------------------------------------------- overlays
function overlayTitle(e) {
  const k1 = clamp(e / 0.6), k2 = clamp((e - 0.7) / 0.6), k3 = clamp((e - 1.5) / 0.6);
  let h = `<div class="bigtitle" style="top:300px;font-size:44px;letter-spacing:8px;opacity:${k1};transform:translateY(${(1 - ease(k1)) * 30}px)">A CAMPAIGN ABOUT HEALTHY RELATIONSHIPS</div>`;
  h += `<div class="bigtitle" style="top:380px;font-size:150px;line-height:1;opacity:${k2};transform:scale(${lerp(0.85, 1, backOut(k2)).toFixed(3)})">RESPECT IS THE</div>`;
  h += `<div class="bigtitle" style="top:540px;font-size:150px;line-height:1;color:${COL.yellow};opacity:${k2};transform:scale(${lerp(0.85, 1, backOut(k2)).toFixed(3)})">RELATIONSHIP</div>`;
  const vals = ["Respect", "Trust", "Communication", "Boundaries", "Equality"];
  h += `<div style="position:absolute;top:760px;left:0;right:0;display:flex;justify-content:center;gap:22px">`;
  vals.forEach((v, i) => (h += `<span class="chip" style="background:rgba(255,255,255,.18);font-size:36px;${appear(e, 1.5 + i * 0.25)}">${v}</span>`));
  h += `</div>`;
  void k3;
  return h;
}
function overlayFlagsTitle(e) {
  const k = clamp(e / 0.5);
  return `<div class="bigtitle" style="top:330px;font-size:150px;color:#fff;opacity:${k};transform:scale(${lerp(0.8, 1, backOut(k)).toFixed(3)})">${icon("FaFlag", `style="width:120px;height:120px;fill:${COL.red};vertical-align:-8px"`)} RED FLAGS</div>
    <div class="bigtitle" style="top:530px;font-size:44px;font-weight:800;color:rgba(255,255,255,.8);${appear(e, 0.7)}">Signs a relationship is becoming unhealthy</div>`;
}
function overlayFlags(e) {
  let h = `<div class="bigtitle" style="top:56px;font-size:70px;">${icon("FaFlag", `style="width:58px;height:58px;fill:${COL.red};vertical-align:-4px"`)} RED FLAGS</div>`;
  const per = 1.75;
  FLAGS.forEach((f, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 150 + col * 840, y = 200 + row * 228;
    const k = clamp((e - 0.3 - i * per) / 0.3);
    const shake = k > 0 && k < 1 ? Math.sin(e * 60) * 6 * (1 - k) : 0;
    const hl = e - 0.3 - i * per;
    const glow = hl >= 0 && hl < per ? `box-shadow:0 0 0 6px ${COL.red}, 0 18px 50px rgba(0,0,0,.45);` : "";
    h += `<div class="flag" style="left:${x + shake}px;top:${y}px;width:780px;height:190px;opacity:${k};transform:scale(${lerp(0.7, 1, backOut(k)).toFixed(3)});${glow}"><div class="disc">${icon(f.icon)}</div>${esc(f.text)}</div>`;
  });
  return h;
}
function overlayEnd(e) {
  let h = `<div class="bigtitle" style="top:250px;font-size:130px;line-height:1;${appear(e, 0.2, 0.5)}">RESPECT IS THE</div>`;
  h += `<div class="bigtitle" style="top:390px;font-size:130px;line-height:1;color:${COL.yellow};${appear(e, 0.4, 0.5)}">RELATIONSHIP</div>`;
  const vals = [["Respect", COL.coral], ["Trust", COL.teal], ["Communication", COL.purple], ["Boundaries", COL.yellow], ["Equality", COL.blue]];
  h += `<div style="position:absolute;top:580px;left:0;right:0;display:flex;justify-content:center;gap:22px">`;
  vals.forEach((v, i) => (h += `<span class="chip" style="background:${v[1]};font-size:38px;${appear(e, 1.0 + i * 0.25)}">${v[0]}</span>`));
  h += `</div>`;
  h += `<div class="bigtitle" style="top:740px;font-size:44px;font-weight:800;${appear(e, 2.6, 0.5)}">If something doesn't feel right, talk to someone you trust —<br>a friend, family member, teacher or school counsellor.</div>`;
  return h;
}
const OVERLAYS = { title: overlayTitle, flagsTitle: overlayFlagsTitle, flags: overlayFlags, end: overlayEnd };

// ---------------------------------------------------------------- render
const stage = document.getElementById("stage");
const ui = document.getElementById("ui");
function render(T) {
  T = Math.min(T, TOTAL - 0.001);
  const sc = BUILT.find((s) => T >= s.start && T < s.start + s.dur) || BUILT[BUILT.length - 1];
  const t = T - sc.start;
  let bi = 0;
  while (bi + 1 < sc.beats.length && sc.beats[bi + 1].t0 <= t) bi++;
  const beat = sc.beats[bi];
  const frozen = sc.freezeAt != null && t >= sc.freezeAt;
  const ct = frozen ? sc.freezeAt : t;
  const speaker = !frozen && beat.who && beat.who !== "N" && t < beat.t1 - 0.25 && t > beat.t0 + 0.1 ? beat.who : null;

  // ---- SVG scene
  let svg = `<defs><filter id="blur"><feGaussianBlur stdDeviation="60"/></filter><filter id="freeze"><feColorMatrix type="saturate" values="0.12"/></filter></defs>`;
  svg += `<g ${frozen ? 'filter="url(#freeze)"' : ""}>`;
  svg += BGS[sc.bg](ct, sc.seatedTable);
  const names = Object.keys(sc.chars).sort((a, b) => sc.chars[a].y - sc.chars[b].y);
  for (const n of names) {
    const st = charState(sc, n, ct, frozen ? null : speaker);
    st.talking = speaker === n;
    svg += drawChar(n, st, ct);
  }
  if (sc.seatedTable) svg += table(...(sc.tableColor || []));
  svg += `</g>`;
  stage.innerHTML = svg;

  // ---- UI layer
  let h = "";
  if (frozen) {
    const fe = t - sc.freezeAt;
    h += `<div class="flash" style="opacity:${(1 - clamp(fe / 0.25)) * 0.7}"></div>`;
    h += `<div class="pause" style="opacity:${clamp(fe / 0.3)}">${icon("FaPause")}FREEZE FRAME</div>`;
  }
  // overlays (title, flags, end)
  for (const b of sc.beats) if (b.overlay && t >= b.t0 && t < b.t1) h += OVERLAYS[b.overlay](t - b.t0);
  // cards
  for (const c of sc.cards) {
    if (t >= c.start && t < c.end + 0.3) h += renderCard(c.card, t - c.start, t >= c.end ? t - c.end : null);
  }
  // caption
  if (beat.text && t > beat.t0 + 0.05 && t < beat.t1 - 0.12) {
    const e = t - beat.t0;
    const op = clamp(e / 0.2) * clamp((beat.t1 - 0.12 - t) / 0.15);
    if (beat.who === "N") h += `<div class="cap narr" style="opacity:${op.toFixed(3)}"><span class="who">NARRATOR</span><span class="txt">${esc(beat.text)}</span></div>`;
    else h += `<div class="cap" style="opacity:${op.toFixed(3)}"><span class="who" style="background:${CHARS[beat.who].tag}">${beat.who.toUpperCase()}</span><span class="txt">${esc(beat.text)}</span></div>`;
  }
  // scene fades
  const fin = 1 - clamp(t / 0.4), fout = 1 - clamp((sc.dur - t) / 0.4);
  const f = Math.max(sc === BUILT[0] ? fin : fin * 0.9, fout * 0.9);
  if (f > 0.001) h += `<div class="fade" style="opacity:${f.toFixed(3)}"></div>`;
  ui.innerHTML = h;
}
window.render = render;
window.TOTAL = TOTAL;
window.CAPTIONS = CAPTIONS;
window.SCENE_STARTS = BUILT.map((s) => ({ id: s.id, label: s.label, start: s.start, dur: s.dur }));
render(0);
