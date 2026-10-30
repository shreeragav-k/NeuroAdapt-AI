// Illustrated pictures for the memory and attention games: flat sticker-style drawings, 26 of them.
// Each picture has a body colour that can be changed ("a red cat, a blue cat"), which lets the games
// test remembering what AND which colour. Drawn as inline SVG so they stay sharp at any size.

export const INK = "#2a2f35";

function mix(hex, toward, p) {
  const n = parseInt(hex.slice(1), 16), t = parseInt(toward.slice(1), 16);
  const c = (s) => Math.round(((n >> s) & 255) * (1 - p) + ((t >> s) & 255) * p);
  return "#" + [16, 8, 0].map((s) => c(s).toString(16).padStart(2, "0")).join("");
}
const dark = (h, p = 0.25) => mix(h, "#000000", p);
const light = (h, p = 0.4) => mix(h, "#ffffff", p);

const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const NO = `fill="none" ${S}`;
const eye = (x, y, r = 3.6) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}"/><circle cx="${x + r * 0.3}" cy="${y - r * 0.35}" r="${r * 0.32}" fill="#fff"/>`;

export const DEFAULT_TINT = {
  cat: "#ec8a2f", dog: "#b9824f", fish: "#3a9bd9", bird: "#3a6fd8", rabbit: "#d8d2c8", duck: "#e8b923", turtle: "#3f9d5a", butterfly: "#8a58c9",
  apple: "#d64545", banana: "#f0cd3a", cherries: "#c93a4a", strawberry: "#e0455a", carrot: "#ec8a2f", pear: "#9ccb4a",
  car: "#d64545", bus: "#f0b323", boat: "#d64545", plane: "#3a6fd8",
  house: "#d64545", tree: "#3f9d5a", flower: "#e57fae", sun: "#f0b323", key: "#e8b923", umbrella: "#d64545", balloon: "#d64545", cup: "#3a9bd9",
};

const ICON = {
  cat: (T) => `<path d="M21 46 L25 13 L47 30Z" fill="${T}" ${S}/><path d="M79 46 L75 13 L53 30Z" fill="${T}" ${S}/>
    <path d="M27 36 L28 24 L38 31Z M73 36 L72 24 L62 31Z" fill="#f4b6c4"/><circle cx="50" cy="58" r="31" fill="${T}" ${S}/>
    <path d="M42 30 q8 6 16 0 M44 26 q6 4 12 0" fill="none" stroke="${dark(T, .3)}" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="39" cy="55" rx="4.4" ry="5.4" fill="${INK}"/><ellipse cx="61" cy="55" rx="4.4" ry="5.4" fill="${INK}"/>
    <circle cx="40.5" cy="53" r="1.5" fill="#fff"/><circle cx="62.5" cy="53" r="1.5" fill="#fff"/>
    <path d="M45.5 64 h9 l-4.5 5.5Z" fill="#e57fae" ${S}/><path d="M50 69.5 q-5 7 -11 3 M50 69.5 q5 7 11 3" ${NO} stroke-width="2.4"/>
    <path d="M24 62 L7 58 M24 68 L8 70 M76 62 L93 58 M76 68 L92 70" ${NO} stroke-width="2"/>`,
  dog: (T) => `<ellipse cx="21" cy="50" rx="11" ry="22" transform="rotate(14 21 50)" fill="${dark(T, .3)}" ${S}/><ellipse cx="79" cy="50" rx="11" ry="22" transform="rotate(-14 79 50)" fill="${dark(T, .3)}" ${S}/>
    <circle cx="50" cy="52" r="29" fill="${T}" ${S}/><ellipse cx="50" cy="66" rx="16" ry="12" fill="${light(T, .6)}" ${S}/>
    <ellipse cx="50" cy="60" rx="7" ry="5" fill="${INK}"/><path d="M50 65 v6 M50 71 q-6 5 -12 1 M50 71 q6 5 12 1" ${NO} stroke-width="2.4"/>${eye(38, 46, 4.2)}${eye(62, 46, 4.2)}
    <path d="M30 34 q6 -6 12 -4 M70 34 q-6 -6 -12 -4" ${NO} stroke-width="2.2"/><path d="M52 74 q2 10 -3 12 q-5 -2 -3 -12Z" fill="#e57fae" ${S} stroke-width="2"/>`,
  fish: (T) => `<path d="M68 50 L93 30 Q97 50 93 70Z" fill="${dark(T, .15)}" ${S}/><ellipse cx="44" cy="50" rx="33" ry="23" fill="${T}" ${S}/>
    <path d="M40 28 Q52 10 62 30Z" fill="${dark(T, .2)}" ${S}/><path d="M42 72 Q52 90 60 70Z" fill="${dark(T, .2)}" ${S}/>
    <path d="M60 33 q9 17 0 34" ${NO} stroke-width="2.6"/><path d="M34 50 q6 -6 12 0 M44 56 q6 -6 12 0" ${NO} stroke-width="2" opacity=".5"/>
    <circle cx="26" cy="44" r="6.5" fill="#fff" ${S} stroke-width="2.4"/>${eye(25, 44, 3.2)}<path d="M13 56 q5 4 10 0" ${NO} stroke-width="2.4"/>`,
  bird: (T) => `<path d="M26 58 L6 40 Q4 58 10 70Z" fill="${dark(T, .2)}" ${S}/><circle cx="50" cy="52" r="29" fill="${T}" ${S}/>
    <ellipse cx="44" cy="60" rx="17" ry="12" fill="${dark(T, .2)}" ${S} transform="rotate(-18 44 60)"/><path d="M72 46 L95 54 L72 62Z" fill="#ec8a2f" ${S}/>
    ${eye(63, 42, 4.6)}<path d="M42 22 q-2 -9 5 -12 M50 21 q2 -9 9 -10" ${NO} stroke-width="2.6"/><path d="M44 81 v10 M56 81 v10 M40 91 h8 M52 91 h8" ${NO} stroke="#ec8a2f" stroke-width="3"/>`,
  rabbit: (T) => `<ellipse cx="37" cy="26" rx="10" ry="25" fill="${T}" ${S}/><ellipse cx="63" cy="26" rx="10" ry="25" fill="${T}" ${S}/>
    <ellipse cx="37" cy="28" rx="4.6" ry="17" fill="#f4b6c4"/><ellipse cx="63" cy="28" rx="4.6" ry="17" fill="#f4b6c4"/>
    <circle cx="50" cy="66" r="26" fill="${T}" ${S}/>${eye(40, 62, 4)}${eye(60, 62, 4)}<path d="M46 70 h8 l-4 5Z" fill="#e57fae" ${S} stroke-width="2"/>
    <path d="M50 75 q-4 5 -9 2 M50 75 q4 5 9 2" ${NO} stroke-width="2.2"/><rect x="46.5" y="78" width="7" height="8" rx="1.5" fill="#fff" ${S} stroke-width="2"/>
    <circle cx="31" cy="72" r="4.5" fill="#f4b6c4" opacity=".7"/><circle cx="69" cy="72" r="4.5" fill="#f4b6c4" opacity=".7"/>`,
  duck: (T) => `<path d="M16 62 L4 52 Q6 70 20 74Z" fill="${dark(T, .1)}" ${S}/><ellipse cx="46" cy="68" rx="33" ry="21" fill="${T}" ${S}/>
    <circle cx="66" cy="36" r="18" fill="${T}" ${S}/><path d="M80 34 Q97 36 96 44 Q86 50 79 45Z" fill="#ec8a2f" ${S}/>${eye(70, 31, 3.8)}
    <ellipse cx="42" cy="68" rx="16" ry="10" fill="${dark(T, .18)}" ${S} transform="rotate(-12 42 68)"/><path d="M8 90 q10 -6 20 0 t20 0 t20 0 t20 0" ${NO} stroke="#3a9bd9" stroke-width="3"/>`,
  turtle: (T) => `<ellipse cx="26" cy="78" rx="10" ry="8" fill="${light(T, .35)}" ${S}/><ellipse cx="70" cy="78" rx="10" ry="8" fill="${light(T, .35)}" ${S}/>
    <circle cx="86" cy="58" r="11" fill="${light(T, .35)}" ${S}/>${eye(89, 55, 3)}<path d="M12 68 L2 74 L14 76Z" fill="${light(T, .35)}" ${S}/>
    <path d="M14 70 A36 36 0 0 1 86 70 Z" fill="${T}" ${S}/><path d="M50 36 v34 M30 46 q20 10 40 0 M24 60 h52" ${NO} stroke="${dark(T, .35)}" stroke-width="2.6"/>`,
  butterfly: (T) => `<ellipse cx="28" cy="36" rx="22" ry="19" transform="rotate(-20 28 36)" fill="${T}" ${S}/><ellipse cx="72" cy="36" rx="22" ry="19" transform="rotate(20 72 36)" fill="${T}" ${S}/>
    <ellipse cx="33" cy="66" rx="16" ry="15" transform="rotate(20 33 66)" fill="${light(T, .35)}" ${S}/><ellipse cx="67" cy="66" rx="16" ry="15" transform="rotate(-20 67 66)" fill="${light(T, .35)}" ${S}/>
    <circle cx="26" cy="34" r="6.5" fill="#fff" opacity=".85"/><circle cx="74" cy="34" r="6.5" fill="#fff" opacity=".85"/><circle cx="33" cy="66" r="4.5" fill="#fff" opacity=".85"/><circle cx="67" cy="66" r="4.5" fill="#fff" opacity=".85"/>
    <ellipse cx="50" cy="52" rx="5.5" ry="26" fill="${INK}"/><path d="M47 28 Q42 14 34 12 M53 28 Q58 14 66 12" ${NO} stroke-width="2.4"/>`,
  apple: (T) => `<path d="M50 30 C32 16 8 32 14 58 C20 84 38 94 50 86 C62 94 80 84 86 58 C92 32 68 16 50 30Z" fill="${T}" ${S}/>
    <path d="M50 30 Q50 16 58 8" ${NO} stroke="#7a4e2a" stroke-width="4"/><path d="M54 20 Q70 6 82 18 Q68 32 54 20Z" fill="#3f9d5a" ${S}/><ellipse cx="30" cy="48" rx="6" ry="11" fill="#fff" opacity=".4" transform="rotate(18 30 48)"/>`,
  banana: (T) => `<path d="M16 30 C10 66 40 92 86 80 C92 78 92 70 86 70 C58 72 38 54 36 26 C35 18 18 20 16 30Z" fill="${T}" ${S}/>
    <path d="M22 32 C24 56 44 76 78 76" ${NO} stroke="${dark(T, .2)}" stroke-width="2.4"/><path d="M16 30 Q22 16 30 16 L36 26" fill="#7a5a2a" ${S}/><path d="M86 70 L94 72 L90 80Z" fill="#7a5a2a" ${S} stroke-width="2"/>`,
  cherries: (T) => `<path d="M50 12 Q40 40 32 62 M50 12 Q62 38 70 60" ${NO} stroke="#3f7d3a" stroke-width="3.4"/><path d="M50 12 Q68 2 84 14 Q68 24 50 12Z" fill="#3f9d5a" ${S}/>
    <circle cx="31" cy="72" r="17" fill="${T}" ${S}/><circle cx="70" cy="70" r="17" fill="${T}" ${S}/><ellipse cx="25" cy="66" rx="4" ry="6" fill="#fff" opacity=".5"/><ellipse cx="64" cy="64" rx="4" ry="6" fill="#fff" opacity=".5"/>`,
  strawberry: (T) => `<path d="M50 92 C26 76 12 52 22 36 C32 22 68 22 78 36 C88 52 74 76 50 92Z" fill="${T}" ${S}/>
    <path d="M50 24 L40 12 L46 22 L34 18 L44 28 Z M50 24 L60 12 L54 22 L66 18 L56 28 Z M50 26 L50 10" fill="#3f9d5a" ${S} stroke-width="2.4"/>
    ${[[36, 44], [52, 42], [66, 48], [44, 58], [60, 62], [50, 74], [34, 62], [68, 36]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.2" ry="3.2" fill="#f7e27a"/>`).join("")}`,
  carrot: (T) => `<path d="M50 30 Q40 18 32 12 M50 30 Q50 14 50 6 M50 30 Q60 18 68 12" ${NO} stroke="#3f9d5a" stroke-width="5"/><path d="M34 32 Q50 24 66 32 L54 92 Q50 98 46 92Z" fill="${T}" ${S}/>
    <path d="M40 46 h8 M54 58 h8 M44 70 h7" ${NO} stroke="${dark(T, .3)}" stroke-width="2.6"/>`,
  pear: (T) => `<path d="M50 18 C42 18 40 30 38 40 C26 50 18 66 28 80 C38 94 62 94 72 80 C82 66 74 50 62 40 C60 30 58 18 50 18Z" fill="${T}" ${S}/>
    <path d="M50 18 Q52 8 58 4" ${NO} stroke="#7a4e2a" stroke-width="4"/><path d="M54 14 Q68 4 80 14 Q66 24 54 14Z" fill="#3f9d5a" ${S} stroke-width="2.4"/><ellipse cx="38" cy="66" rx="5" ry="10" fill="#fff" opacity=".4"/>`,
  car: (T) => `<path d="M8 64 L16 46 Q20 40 28 40 L64 40 Q72 40 76 46 L90 58 Q96 62 96 68 L96 74 L8 74Z" fill="${T}" ${S}/>
    <path d="M24 46 L60 46 L60 58 L18 58Z M66 46 L74 46 L84 58 L66 58Z" fill="#bfe3f5" ${S} stroke-width="2.4"/><path d="M60 46 V58" ${NO} stroke-width="2.4"/>
    <circle cx="28" cy="76" r="11" fill="${INK}"/><circle cx="76" cy="76" r="11" fill="${INK}"/><circle cx="28" cy="76" r="4.5" fill="#cfd4da"/><circle cx="76" cy="76" r="4.5" fill="#cfd4da"/><rect x="88" y="62" width="8" height="6" rx="2" fill="#fff3a0"/>`,
  bus: (T) => `<rect x="6" y="24" width="88" height="54" rx="10" fill="${T}" ${S}/>
    ${[14, 32, 50].map((x) => `<rect x="${x}" y="32" width="14" height="16" rx="3" fill="#bfe3f5" ${S} stroke-width="2.4"/>`).join("")}<rect x="70" y="32" width="18" height="30" rx="3" fill="#bfe3f5" ${S} stroke-width="2.4"/>
    <path d="M6 56 H94" ${NO} stroke-width="2.4"/><circle cx="26" cy="80" r="10" fill="${INK}"/><circle cx="74" cy="80" r="10" fill="${INK}"/><circle cx="26" cy="80" r="4" fill="#cfd4da"/><circle cx="74" cy="80" r="4" fill="#cfd4da"/>`,
  boat: (T) => `<path d="M12 62 H88 L76 84 H24Z" fill="${T}" ${S}/><path d="M50 12 V62" ${NO}/><path d="M52 14 L84 56 H52Z" fill="#fff" ${S}/><path d="M48 24 L20 56 H48Z" fill="#f3e6b0" ${S}/>
    <path d="M4 90 q12 -8 24 0 t24 0 t24 0 t20 0" ${NO} stroke="#3a9bd9" stroke-width="3.4"/>`,
  plane: (T) => `<path d="M10 52 L2 30 L22 30 L34 50Z" fill="${dark(T, .15)}" ${S}/><path d="M42 54 L24 88 L46 88 L74 54Z" fill="${dark(T, .15)}" ${S}/>
    <path d="M6 54 Q8 42 30 42 L78 42 Q96 44 96 54 Q96 64 78 66 L30 66 Q8 66 6 54Z" fill="${T}" ${S}/>${[34, 46, 58, 70].map((x) => `<circle cx="${x}" cy="52" r="3.6" fill="#bfe3f5" ${S} stroke-width="1.8"/>`).join("")}<path d="M82 46 Q92 46 94 52 L82 52Z" fill="#bfe3f5" ${S} stroke-width="2"/>`,
  house: (T) => `<rect x="18" y="46" width="64" height="44" fill="#f1e3c5" ${S}/><path d="M8 50 L50 12 L92 50Z" fill="${T}" ${S}/><rect x="62" y="18" width="10" height="20" fill="${dark(T, .2)}" ${S} stroke-width="2.4"/>
    <rect x="42" y="62" width="16" height="28" rx="2" fill="#8b5e3c" ${S}/><circle cx="54" cy="77" r="1.8" fill="#f0cd3a"/><rect x="24" y="56" width="13" height="13" fill="#bfe3f5" ${S} stroke-width="2.4"/><rect x="63" y="56" width="13" height="13" fill="#bfe3f5" ${S} stroke-width="2.4"/>`,
  tree: (T) => `<rect x="43" y="54" width="14" height="38" rx="2" fill="#8b5e3c" ${S}/><circle cx="50" cy="32" r="24" fill="${T}" ${S}/><circle cx="30" cy="50" r="17" fill="${T}" ${S}/><circle cx="70" cy="50" r="17" fill="${T}" ${S}/>
    <circle cx="50" cy="32" r="22" fill="${T}"/><circle cx="32" cy="50" r="15" fill="${T}"/><circle cx="68" cy="50" r="15" fill="${T}"/><circle cx="42" cy="26" r="4" fill="#fff" opacity=".3"/><circle cx="62" cy="44" r="3" fill="#fff" opacity=".3"/>`,
  flower: (T) => `<path d="M50 54 Q50 76 46 94" ${NO} stroke="#3f9d5a" stroke-width="4.4"/><path d="M48 80 Q32 70 26 76 Q34 90 48 80Z" fill="#3f9d5a" ${S} stroke-width="2.4"/>
    ${[0, 60, 120, 180, 240, 300].map((a) => `<circle cx="${(50 + 19 * Math.cos((a * Math.PI) / 180)).toFixed(1)}" cy="${(36 + 19 * Math.sin((a * Math.PI) / 180)).toFixed(1)}" r="13" fill="${T}" ${S} stroke-width="2.6"/>`).join("")}<circle cx="50" cy="36" r="11" fill="#f0cd3a" ${S}/>`,
  sun: (T) => `${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => { const r = (a * Math.PI) / 180; return `<path d="M${(50 + 32 * Math.cos(r)).toFixed(1)} ${(50 + 32 * Math.sin(r)).toFixed(1)} L${(50 + 45 * Math.cos(r)).toFixed(1)} ${(50 + 45 * Math.sin(r)).toFixed(1)}" ${NO} stroke="${T}" stroke-width="6"/>`; }).join("")}
    <circle cx="50" cy="50" r="26" fill="${T}" ${S}/>${eye(42, 46, 3.2)}${eye(58, 46, 3.2)}<path d="M40 58 q10 10 20 0" ${NO} stroke-width="2.6"/>`,
  key: (T) => `<circle cx="28" cy="42" r="21" fill="${T}" ${S}/><circle cx="28" cy="42" r="8" fill="#f6f1e7" ${S}/><path d="M48 42 H92 V56 H84 V48 H76 V58 H68 V48 H48Z" fill="${T}" ${S}/><ellipse cx="20" cy="34" rx="5" ry="3" fill="#fff" opacity=".5"/>`,
  umbrella: (T) => `<path d="M8 52 A42 40 0 0 1 92 52 Q81 42 71 52 Q60 42 50 52 Q40 42 29 52 Q19 42 8 52Z" fill="${T}" ${S}/><path d="M50 52 Q36 30 50 12 M50 52 Q64 30 50 12" ${NO} stroke-width="2.4" opacity=".6"/>
    <path d="M50 52 V82 Q50 92 40 90" ${NO} stroke-width="4.4"/><path d="M50 12 V6" ${NO} stroke-width="4"/>`,
  balloon: (T) => `<ellipse cx="50" cy="40" rx="27" ry="33" fill="${T}" ${S}/><path d="M45 72 L55 72 L50 80Z" fill="${dark(T, .2)}" ${S} stroke-width="2.4"/><path d="M50 80 q-8 6 0 10 t0 8" ${NO} stroke-width="2.4"/><ellipse cx="38" cy="26" rx="6" ry="10" fill="#fff" opacity=".45" transform="rotate(20 38 26)"/>`,
  cup: (T) => `<path d="M78 44 q18 -2 14 14 q-4 12 -18 10" ${NO} stroke-width="6"/><path d="M22 34 H78 L70 82 Q69 90 61 90 H39 Q31 90 30 82Z" fill="${T}" ${S}/><path d="M26 46 H74" ${NO} stroke="#fff" stroke-width="3" opacity=".5"/>
    <path d="M38 24 q-6 -8 0 -14 M50 24 q-6 -8 0 -14 M62 24 q-6 -8 0 -14" ${NO} stroke="#9aa0a6" stroke-width="2.6"/>`,
};

export const ANIMALS = ["cat", "dog", "fish", "bird", "rabbit", "duck", "turtle", "butterfly"];
export const FRUITS = ["apple", "banana", "cherries", "strawberry", "carrot", "pear"];
export const VEHICLES = ["car", "bus", "boat", "plane"];
export const THINGS = ["house", "tree", "flower", "sun", "key", "umbrella", "balloon", "cup"];
export const ALL_PICTURES = [...ANIMALS, ...FRUITS, ...VEHICLES, ...THINGS];
export const PICTURE_SETS = { pictures: ALL_PICTURES, mixed: ALL_PICTURES, animals: ANIMALS, fruits: FRUITS, vehicles: VEHICLES, things: THINGS };

// pictureSvg("cat", 64, "#3a6fd8", "cat|blue")  ->  a blue cat. `key` is what the games compare.
export function pictureSvg(name, px = 64, tint = null, key = null) {
  if (!ICON[name]) throw new Error("no picture called " + name);
  return `<svg class="pic" viewBox="0 0 100 100" width="${px}" height="${px}" role="img" aria-label="${name}" data-key="${key || name}">${ICON[name](tint || DEFAULT_TINT[name])}</svg>`;
}
