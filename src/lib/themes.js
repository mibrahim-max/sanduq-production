// ── Sanduq theme library ───────────────────────────────────────────
// Each Sanduq wears one of these immersive "worlds". A theme is a full
// coordinated bundle: background gradient, ambient emoji, display font,
// glass-card colors, and text colors flipped for legibility.
//
// `mode` 'light' = bright background + dark ink; 'dark' = deep bg + light ink.
// This single file is the source of truth for both the picker and the
// group-screen renderer.

const FONTS = {
  bricolage: "'Bricolage Grotesque', sans-serif",
  fraunces:  "'Fraunces', serif",
  caveat:    "'Caveat', cursive",
  space:     "'Space Grotesk', sans-serif",
  outfit:    "'Outfit', sans-serif",
  spectral:  "'Spectral', serif",
  sora:      "'Sora', sans-serif",
  gloock:    "'Gloock', serif",
  jakarta:   "'Plus Jakarta Sans', sans-serif",
};

// Google Fonts needed by the themes (loaded once at app boot).
export const THEME_FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Caveat:wght@600;700&family=Space+Grotesk:wght@500;600;700&family=Outfit:wght@500;600;700;800&family=Spectral:wght@500;600;700&family=Sora:wght@600;700;800&family=Gloock&display=swap";

// hex -> rgba helper
function rgba(hex, a) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Build the full color set for a light-ink theme.
function light(ink) {
  return {
    mode: "light",
    titleColor: ink,
    sub: rgba(ink, 0.7),
    chip: "rgba(255,255,255,.4)", chipText: ink,
    glass: "rgba(255,255,255,.34)", glassBorder: "rgba(255,255,255,.55)",
    glassText: ink, glassSub: rgba(ink, 0.62),
    track: rgba(ink, 0.15),
    pillIdle: "rgba(255,255,255,.34)", pillIdleText: rgba(ink, 0.72),
    onPill: "#fff",
  };
}
// Build the full color set for a dark-ink theme.
function dark(ink) {
  return {
    mode: "dark",
    titleColor: ink,
    sub: rgba(ink, 0.65),
    chip: "rgba(255,255,255,.14)", chipText: ink,
    glass: "rgba(255,255,255,.1)", glassBorder: "rgba(255,255,255,.2)",
    glassText: ink, glassSub: rgba(ink, 0.6),
    track: "rgba(255,255,255,.13)",
    pillIdle: "rgba(255,255,255,.12)", pillIdleText: rgba(ink, 0.7),
  };
}

// id, name, group, emoji(s), font, gradient, atmosphere, accent + ink set.
const RAW = [
  // Trips & Adventure
  { id:"cabo", name:"Cabo", group:"Trips", emoji:"🌊", emoji2:"🏝️", font:FONTS.bricolage, tw:800, ls:"-1px",
    bg:"linear-gradient(165deg,#7FE9DC,#2DB5B0 48%,#0E6973)", atmos:"radial-gradient(circle at 75% 12%,rgba(255,255,255,.4),transparent 50%)",
    accent:"#063b3b", onAccent:"#fff", ...light("#063b3b") },
  { id:"road_trip", name:"Road Trip", group:"Trips", emoji:"🚐", emoji2:"🏔️", font:FONTS.outfit, tw:800, ls:"-0.5px",
    bg:"linear-gradient(165deg,#FFD89B,#FF9A6B 50%,#C75B39)", atmos:"radial-gradient(circle at 20% 15%,rgba(255,255,255,.4),transparent 48%)",
    accent:"#7a2f12", onAccent:"#fff", ...light("#5c2410") },
  { id:"beach_day", name:"Beach Day", group:"Trips", emoji:"🏖️", emoji2:"🐚", font:FONTS.bricolage, tw:800, ls:"-0.5px",
    bg:"linear-gradient(165deg,#FFF3C4,#7FD7E8 55%,#2BA8C4)", atmos:"radial-gradient(circle at 76% 14%,rgba(255,255,255,.45),transparent 50%)",
    accent:"#0a5a6e", onAccent:"#fff", ...light("#0a4a5a") },
  { id:"ski_trip", name:"Ski Trip", group:"Trips", emoji:"🎿", emoji2:"❄️", font:FONTS.space, tw:700, ls:"-0.5px",
    bg:"linear-gradient(165deg,#E8F4FF,#A9C9E8 50%,#5E7FA8)", atmos:"radial-gradient(circle at 30% 12%,rgba(255,255,255,.6),transparent 45%)",
    accent:"#2c4a6a", onAccent:"#fff", ...light("#23405e") },
  { id:"camping", name:"Camping", group:"Trips", emoji:"⛺", emoji2:"🔥", font:FONTS.outfit, tw:800, ls:"-0.5px",
    bg:"linear-gradient(165deg,#D9E8C4,#8BAE6F 50%,#4A6440)", atmos:"radial-gradient(circle at 24% 14%,rgba(255,255,255,.35),transparent 48%)",
    accent:"#3a4f28", onAccent:"#fff", ...light("#2e4020") },

  // Activities
  { id:"bbq", name:"BBQ", group:"Activities", emoji:"🍖", emoji2:"🔥", font:FONTS.bricolage, tw:800, ls:"-0.5px",
    bg:"linear-gradient(165deg,#FFD98A,#FF8A5B 50%,#C73E2D)", atmos:"radial-gradient(circle at 22% 15%,rgba(255,255,255,.4),transparent 47%)",
    accent:"#8a2418", onAccent:"#fff", ...light("#6e1c12") },
  { id:"bowling", name:"Bowling", group:"Activities", emoji:"🎳", emoji2:"🟣", font:FONTS.sora, tw:800, ls:"-0.5px",
    bg:"linear-gradient(165deg,#2b1055,#9163e0 130%)", atmos:"radial-gradient(circle at 78% 16%,rgba(180,140,255,.32),transparent 52%)",
    accent:"#B79BFF", onAccent:"#1a0f33", ...dark("#ece6ff") },
  { id:"potluck", name:"Potluck", group:"Activities", emoji:"🍲", emoji2:"🥘", font:FONTS.spectral, tw:600, ls:"0px",
    bg:"linear-gradient(165deg,#F6E0B5,#E0A878 52%,#B5764A)", atmos:"radial-gradient(circle at 24% 15%,rgba(255,255,255,.4),transparent 48%)",
    accent:"#6e3f1f", onAccent:"#fff", ...light("#54301a") },
  { id:"movie_night", name:"Movie Night", group:"Activities", emoji:"🎬", emoji2:"🍿", font:FONTS.sora, tw:800, ls:"-0.5px",
    bg:"linear-gradient(165deg,#1a1a2e,#2d2d52 50%,#0f0f1e)", atmos:"radial-gradient(circle at 78% 15%,rgba(255,200,100,.22),transparent 52%)",
    accent:"#F4C95D", onAccent:"#1a1a2e", ...dark("#ececf5") },
  { id:"concert", name:"Concert", group:"Activities", emoji:"🎤", emoji2:"🎶", font:FONTS.bricolage, tw:800, ls:"-0.5px",
    bg:"linear-gradient(165deg,#3a0ca3,#f72585 130%)", atmos:"radial-gradient(circle at 76% 16%,rgba(255,120,200,.3),transparent 52%)",
    accent:"#FF6BB0", onAccent:"#2a0a4a", ...dark("#f7e6f2") },
  { id:"game_day", name:"Game Day", group:"Activities", emoji:"🏈", emoji2:"🏆", font:FONTS.sora, tw:800, ls:"-0.5px",
    bg:"linear-gradient(165deg,#1B4D3E,#2E7D5B 50%,#143a2e)", atmos:"radial-gradient(circle at 78% 16%,rgba(255,255,255,.2),transparent 52%)",
    accent:"#7BE0A8", onAccent:"#143a2e", ...dark("#e6f4ec") },
  { id:"water_fun", name:"Water Fun", group:"Activities", emoji:"🤽", emoji2:"💦", font:FONTS.bricolage, tw:800, ls:"-0.5px",
    bg:"linear-gradient(165deg,#A0F0F8,#3BC4E0 50%,#1486B0)", atmos:"radial-gradient(circle at 76% 14%,rgba(255,255,255,.5),transparent 48%)",
    accent:"#0a5a78", onAccent:"#fff", ...light("#0a4a62") },
  { id:"game_night", name:"Game Night", group:"Activities", emoji:"🎮", emoji2:"🕹️", font:FONTS.space, tw:700, ls:"-0.5px",
    bg:"linear-gradient(165deg,#2b1055,#7597de 120%)", atmos:"radial-gradient(circle at 78% 16%,rgba(160,120,255,.3),transparent 52%)",
    accent:"#9D7BFF", onAccent:"#1a0f33", ...dark("#ece6ff") },

  // Celebrations
  { id:"birthday", name:"Birthday", group:"Celebrations", emoji:"🎂", emoji2:"🎈", font:FONTS.caveat, tw:700, ls:"0px", titleSize:"36px", bodyFont:FONTS.jakarta,
    bg:"linear-gradient(165deg,#FFE0B5,#FFB3C8 52%,#E89BC4)", atmos:"radial-gradient(circle at 22% 16%,rgba(255,255,255,.5),transparent 45%)",
    accent:"#E0568A", onAccent:"#fff", ...light("#4a2545") },
  { id:"party", name:"Party", group:"Celebrations", emoji:"🎉", emoji2:"🪩", font:FONTS.bricolage, tw:800, ls:"-0.5px",
    bg:"linear-gradient(165deg,#F6D365,#FB7BA5 50%,#A06CD5)", atmos:"radial-gradient(circle at 80% 18%,rgba(255,255,255,.4),transparent 48%)",
    accent:"#7a2a86", onAccent:"#fff", ...light("#5c1f66") },
  { id:"wedding", name:"Wedding", group:"Celebrations", emoji:"💍", emoji2:"🤍", font:FONTS.fraunces, tw:500, ls:"0px",
    bg:"linear-gradient(165deg,#FBF5EF,#F0E0D6 52%,#D9C3B0)", atmos:"radial-gradient(circle at 25% 14%,rgba(255,255,255,.5),transparent 48%)",
    accent:"#876743", onAccent:"#fff", ...light("#5e4a36") },
  { id:"new_year", name:"New Year", group:"Celebrations", emoji:"🥂", emoji2:"✨", font:FONTS.gloock, tw:400, ls:"0px",
    bg:"linear-gradient(165deg,#1a1430,#2d2150 50%,#0f0b1e)", atmos:"radial-gradient(circle at 75% 16%,rgba(255,215,120,.28),transparent 52%)",
    accent:"#E4C76B", onAccent:"#1a1430", ...dark("#f5edd6") },

  // Milestones
  { id:"graduation", name:"Graduation", group:"Milestones", emoji:"🎓", emoji2:"✨", font:FONTS.fraunces, tw:600, ls:"-0.5px",
    bg:"linear-gradient(165deg,#3B2F6B,#27225A 50%,#15132E)", atmos:"radial-gradient(circle at 80% 14%,rgba(180,160,255,.35),transparent 55%)",
    accent:"#C9A84C", onAccent:"#15132E", ...dark("#f4ecd8") },
  { id:"baby_shower", name:"Baby Shower", group:"Milestones", emoji:"🍼", emoji2:"🧸", font:FONTS.bricolage, tw:700, ls:"-0.5px",
    bg:"linear-gradient(165deg,#FFF0F3,#FFE0EC 50%,#FFD6E8)", atmos:"radial-gradient(circle at 26% 15%,rgba(255,255,255,.55),transparent 46%)",
    accent:"#E87BA0", onAccent:"#fff", ...light("#7a3b52") },

  // Cozy
  { id:"coffee_club", name:"Coffee Club", group:"Cozy", emoji:"☕", emoji2:"🫘", font:FONTS.spectral, tw:600, ls:"0px",
    bg:"linear-gradient(165deg,#EADBC8,#C8A984 52%,#8C6A4A)", atmos:"radial-gradient(circle at 24% 15%,rgba(255,255,255,.4),transparent 48%)",
    accent:"#5e4329", onAccent:"#fff", ...light("#46301d") },

  // Neutral (defaults)
  { id:"minimal_light", name:"Minimal Light", group:"Neutral", emoji:"◻️", emoji2:"▫️", font:FONTS.space, tw:600, ls:"-0.5px",
    bg:"linear-gradient(165deg,#FAFBFB,#EEF1F1 60%,#E2E7E7)", atmos:"none",
    accent:"#2a3535", onAccent:"#fff", ...light("#1c2525") },
  { id:"minimal_dark", name:"Minimal Dark", group:"Neutral", emoji:"⬛", emoji2:"▪️", font:FONTS.space, tw:600, ls:"-0.5px",
    bg:"linear-gradient(165deg,#23262d,#191b21 60%,#101216)", atmos:"none",
    accent:"#5EEAD4", onAccent:"#101216", ...dark("#e6e9ee") },
];

// Public: array of themes, lookup by id, and the picker grouping order.
export const THEMES = RAW;
export const THEME_BY_ID = Object.fromEntries(RAW.map(t => [t.id, t]));
export const THEME_GROUP_ORDER = ["Trips", "Activities", "Celebrations", "Milestones", "Cozy", "Neutral"];

// Map a group's category string to a sensible default theme id.
export function defaultThemeForCategory(category) {
  const c = (category || "").toLowerCase();
  if (c.includes("trip") || c.includes("travel") || c.includes("vacation")) return "cabo";
  if (c.includes("beach")) return "beach_day";
  if (c.includes("birthday")) return "birthday";
  if (c.includes("wedding")) return "wedding";
  if (c.includes("grad")) return "graduation";
  if (c.includes("baby")) return "baby_shower";
  if (c.includes("bbq") || c.includes("barbecue") || c.includes("grill")) return "bbq";
  if (c.includes("party") || c.includes("celebrat")) return "party";
  if (c.includes("game") || c.includes("sport")) return "game_day";
  if (c.includes("concert") || c.includes("music")) return "concert";
  if (c.includes("movie")) return "movie_night";
  if (c.includes("food") || c.includes("dinner") || c.includes("potluck")) return "potluck";
  if (c.includes("coffee")) return "coffee_club";
  return "minimal_light";
}

// Resolve a theme object from an id, falling back safely.
export function resolveTheme(id) {
  return THEME_BY_ID[id] || THEME_BY_ID["minimal_light"];
}
