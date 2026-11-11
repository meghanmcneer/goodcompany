/* ==================================================================
   GOOD COMPANY — landing
================================================================== */
(function () {
  const { esc, icons, img, data } = GC;
  const INK = "#3B2418", MARBLE = "#FFFDF6", NEON = "#FF5A12", ICE = "#CFE4EC", BUTTER = "#F5E2A0", TAN = "#E2C19C", ORANGE = "#D9682F", SHADE = "rgba(59,36,24,.10)";
  const S = 'stroke="' + INK + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';

  /* ---------- the two marble regulars ---------- */
  function bust(kind) {
    let hair = "";
    if (kind === "dave") { // a head of tight curls
      const curls = [];
      for (let a = 200; a <= 340; a += 14) { const r = (a * Math.PI) / 180; curls.push([150 + 54 * Math.cos(r), 142 + 66 * Math.sin(r)]); }
      for (let a = 215; a <= 325; a += 18) { const r = (a * Math.PI) / 180; curls.push([150 + 36 * Math.cos(r), 130 + 48 * Math.sin(r)]); }
      hair = curls.map(([x, y]) => '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="12" fill="' + MARBLE + '" ' + S + '/><path d="M' + (x - 4).toFixed(1) + " " + y.toFixed(1) + " q4 -6 8 0" + '" fill="none" stroke="' + INK + '" stroke-width="2"/>').join("");
    } else { // venus: parted waves + a low bun
      hair = '<circle cx="150" cy="70" r="22" fill="' + MARBLE + '" ' + S + '/><path d="M138 64 q12 -10 24 0 M140 76 q10 6 20 0" fill="none" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M97 150 C92 100 118 78 150 80 C182 78 208 100 203 150 C196 124 176 106 150 104 C124 106 104 124 97 150Z" fill="' + MARBLE + '" ' + S + "/>" +
        '<path d="M150 82 L150 104 M118 96 q8 10 4 24 M130 88 q6 10 2 18 M182 96 q-8 10 -4 24 M170 88 q-6 10 -2 18" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    }
    const chest = kind === "dave"
      ? '<path d="M96 268 q28 12 48 2 M156 270 q22 10 48 -2 M118 300 q14 10 30 2 M152 302 q16 8 30 -2" fill="none" stroke="' + INK + '" stroke-width="2"/>'
      : '<path d="M30 330 C70 296 120 306 160 296 C200 286 240 300 270 318 L270 330Z" fill="' + MARBLE + '" ' + S + '/><path d="M70 314 q30 -14 60 -8 M150 308 q34 -12 70 0 M110 326 q40 -16 90 -8" fill="none" stroke="' + INK + '" stroke-width="2"/>' +
        '<path d="M100 270 q24 10 44 0 M156 270 q22 10 44 0" fill="none" stroke="' + INK + '" stroke-width="2"/>';
    return '<svg viewBox="0 0 300 470" xmlns="http://www.w3.org/2000/svg">' +
      // plinth
      '<rect x="70" y="330" width="160" height="22" fill="' + TAN + '" ' + S + '/><rect x="90" y="352" width="120" height="80" fill="' + BUTTER + '" ' + S + '/><rect x="60" y="432" width="180" height="20" fill="' + TAN + '" ' + S + "/>" +
      // shoulders + neck
      '<path d="M30 330 C32 272 78 250 118 246 L182 246 C222 250 268 272 270 330 Z" fill="' + MARBLE + '" ' + S + "/>" +
      '<path d="M127 196 C128 220 124 236 118 250 L182 250 C176 236 172 220 173 196 Z" fill="' + MARBLE + '" ' + S + "/>" +
      '<path d="M128 236 q22 10 44 0" fill="none" stroke="' + SHADE + '" stroke-width="10"/>' + chest +
      // ears, head
      '<ellipse cx="99" cy="146" rx="8" ry="14" fill="' + MARBLE + '" ' + S + '/><ellipse cx="201" cy="146" rx="8" ry="14" fill="' + MARBLE + '" ' + S + "/>" +
      '<ellipse cx="150" cy="142" rx="51" ry="63" fill="' + MARBLE + '" ' + S + "/>" +
      '<path d="M112 170 q38 42 76 0" fill="none" stroke="' + SHADE + '" stroke-width="12"/>' +
      // face: the classic blank stare
      '<path d="M122 128 q12 -8 25 -2 M153 126 q13 -6 25 2" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M127 140 q9 -6 18 0 M155 140 q9 -6 18 0" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M150 136 L145 164 q5 5 11 0" fill="none" stroke="' + INK + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<path d="M139 180 q11 6 22 0 M142 180 q8 -3 16 0" fill="none" stroke="' + INK + '" stroke-width="2.4" stroke-linecap="round"/>' +
      hair + "</svg>";
  }

  /* ---------- accessories ---------- */
  const pearls = () => { let s = ""; for (let i = 0; i <= 14; i++) { const t = i / 14; const x = 8 + 114 * t, y = 8 + 50 * Math.sin(Math.PI * t); s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="6.5" fill="#FFFDF2" stroke="' + INK + '" stroke-width="2"/><circle cx="' + (x - 2).toFixed(1) + '" cy="' + (y - 2).toFixed(1) + '" r="1.6" fill="#fff"/>'; } return '<svg viewBox="0 0 130 70">' + s + "</svg>"; };
  const crown = () => { let s = '<path d="M8 40 Q75 18 142 40" fill="none" stroke="#6E9A86" stroke-width="5" stroke-linecap="round"/>'; const cols = [NEON, ICE, BUTTER, ORANGE, ICE, NEON, BUTTER]; for (let i = 0; i < 7; i++) { const t = i / 6; const x = 14 + 122 * t, y = 40 - 18 * Math.sin(Math.PI * t); for (let p = 0; p < 5; p++) { const a = (p / 5) * Math.PI * 2; s += '<circle cx="' + (x + 7 * Math.cos(a)).toFixed(1) + '" cy="' + (y + 7 * Math.sin(a)).toFixed(1) + '" r="6" fill="' + cols[i] + '" stroke="' + INK + '" stroke-width="1.6"/>'; } s += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="4" fill="' + INK + '"/>'; } return '<svg viewBox="0 0 150 60">' + s + "</svg>"; };
  const PIECES = [
    { id: "hat", w: 88, slot: "head", anchor: [0.5, 0.92], at: [150, 84], r: -10, home: [44, 250, -8],
      svg: '<svg viewBox="0 0 100 125"><path d="M50 12 L92 112 Q50 124 8 112Z" fill="' + NEON + '" ' + S + '/><path d="M37 44 L63 44 M28 70 L72 70 M18 96 L82 96" stroke="' + ICE + '" stroke-width="7" stroke-linecap="round"/><circle cx="50" cy="12" r="11" fill="' + BUTTER + '" ' + S + "/></svg>" },
    { id: "beret", w: 128, slot: "head", anchor: [0.5, 0.7], at: [142, 90], r: -8, home: [145, 262, 6],
      svg: '<svg viewBox="0 0 140 72"><path d="M8 44 C8 18 50 10 76 12 C110 14 136 26 132 44 C126 58 96 62 70 62 C40 62 10 58 8 44Z" fill="#7A4E34" ' + S + '/><path d="M34 56 Q70 70 108 56" fill="none" ' + S + '/><path d="M74 12 l2 -9" ' + S + "/></svg>" },
    { id: "crown", w: 136, slot: "head", anchor: [0.5, 0.6], at: [150, 96], r: 0, home: [30, 400, -4], svg: crown() },
    { id: "shades", w: 132, slot: "eyes", anchor: [0.5, 0.45], at: [150, 138], r: 0, home: [52, 500, 5],
      svg: '<svg viewBox="0 0 140 50"><path d="M6 14 Q8 8 18 8 L58 10 Q62 12 60 22 Q56 42 34 42 Q12 42 8 26Z" fill="' + NEON + '" ' + S + '/><path d="M134 14 Q132 8 122 8 L82 10 Q78 12 80 22 Q84 42 106 42 Q128 42 132 26Z" fill="' + NEON + '" ' + S + '/><path d="M58 16 Q70 9 82 16" fill="none" ' + S + '/><path d="M20 16 l10 0 M94 16 l10 0" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>' },
    { id: "specs", w: 116, slot: "eyes", anchor: [0.5, 0.5], at: [150, 138], r: 0, home: [812, 60, -6],
      svg: '<svg viewBox="0 0 130 46"><circle cx="34" cy="24" r="18" fill="' + ICE + '" fill-opacity=".55" ' + S + '/><circle cx="96" cy="24" r="18" fill="' + ICE + '" fill-opacity=".55" ' + S + '/><path d="M52 22 Q65 14 78 22 M16 20 L2 14 M114 20 L128 14" fill="none" ' + S + "/></svg>" },
    { id: "stache", w: 72, slot: "lip", anchor: [0.5, 0.45], at: [150, 172], r: 0, home: [835, 150, 8],
      svg: '<svg viewBox="0 0 100 40"><path d="M50 14 C40 4 22 6 14 18 C8 26 2 26 0 22 C4 36 26 38 50 26 C74 38 96 36 100 22 C98 26 92 26 86 18 C78 6 60 4 50 14Z" fill="' + INK + '"/></svg>' },
    { id: "pearls", w: 124, slot: "neck", anchor: [0.5, 0.2], at: [150, 250], r: 0, home: [808, 222, 4], svg: pearls() },
    { id: "bow", w: 76, slot: "neck", anchor: [0.5, 0.5], at: [150, 256], r: 0, home: [836, 318, -10],
      svg: '<svg viewBox="0 0 90 50"><path d="M45 25 L8 6 Q1 25 8 44Z M45 25 L82 6 Q89 25 82 44Z" fill="' + ICE + '" ' + S + '/><circle cx="20" cy="18" r="3" fill="' + NEON + '"/><circle cx="18" cy="32" r="3" fill="' + NEON + '"/><circle cx="70" cy="18" r="3" fill="' + NEON + '"/><circle cx="72" cy="32" r="3" fill="' + NEON + '"/><rect x="38" y="16" width="14" height="18" rx="4" fill="' + NEON + '" ' + S + "/></svg>" },
    { id: "scarf", w: 150, slot: "neck", anchor: [0.5, 0.18], at: [150, 246], r: 0, home: [800, 400, 3],
      svg: '<svg viewBox="0 0 160 120"><path d="M10 18 Q80 48 150 18 L150 40 Q80 72 10 40Z" fill="' + ORANGE + '" ' + S + '/><path d="M98 46 L122 48 L130 114 L104 112Z" fill="' + ORANGE + '" ' + S + '/><path d="M40 30 L40 50 M70 36 L70 56 M100 34 L100 54 M128 26 L128 46 M106 70 L126 72 M108 90 L128 92" stroke="' + BUTTER + '" stroke-width="5" stroke-linecap="round"/><path d="M104 112 l-2 6 M112 113 l-1 6 M120 113 l0 6 M128 114 l1 6" ' + S + "/></svg>" },
    { id: "tag", w: 108, slot: "chest", anchor: [0.5, 0.5], at: [196, 300], r: -6, home: [822, 515, 6],
      svg: '<svg viewBox="0 0 120 80"><rect x="3" y="3" width="114" height="74" rx="8" fill="#fff" ' + S + '/><path d="M3 30 L3 11 Q3 3 11 3 L109 3 Q117 3 117 11 L117 30Z" fill="' + NEON + '" ' + S + '/><text x="60" y="22" text-anchor="middle" font-family="Helvetica, Arial" font-weight="700" font-size="13" letter-spacing="2" fill="#fff">HELLO</text><text x="60" y="44" text-anchor="middle" font-family="Helvetica, Arial" font-size="8" letter-spacing="1.5" fill="' + INK + '">MY NAME IS</text><text x="60" y="69" text-anchor="middle" font-family="Paloma, Helvetica" font-size="22" fill="' + INK + '">Dot</text></svg>' },
    { id: "pie", w: 104, slot: "chest", anchor: [0.5, 0.5], at: [104, 304], r: 4, home: [160, 372, -6],
      svg: '<svg viewBox="0 0 110 70"><ellipse cx="55" cy="44" rx="52" ry="20" fill="' + ICE + '" ' + S + '/><path d="M10 38 Q55 2 100 38 Q55 56 10 38Z" fill="' + TAN + '" ' + S + '/><path d="M30 30 L44 44 M48 22 L66 46 M68 22 L84 40 M28 40 L60 20 M44 46 L80 24" stroke="' + ORANGE + '" stroke-width="4" stroke-linecap="round"/></svg>' }
  ];
  /* ---------- hero art: a still life in the magnet-set style ----------
     marble busts + accessories, each with a white die-cut paper edge */
  const SCALE = 250 / 300;
  const BUSTS = [{ id: "venus", x: 36, y: 70, r: -4 }, { id: "dave", x: 316, y: 52, r: 3 }];
  const DRESS = { venus: ["hat", "shades", "pearls"], dave: ["beret", "bow", "stache"] };
  const SUITCASE = '<svg viewBox="0 0 120 100"><rect x="34" y="6" width="52" height="20" rx="8" fill="none" ' + S + '/><rect x="6" y="20" width="108" height="74" rx="10" fill="' + ICE + '" ' + S + '/><path d="M6 46 H114" ' + S + '/><rect x="26" y="20" width="12" height="74" fill="' + NEON + '" ' + S + '/><rect x="82" y="20" width="12" height="74" fill="' + NEON + '" ' + S + '/><circle cx="60" cy="68" r="10" fill="' + BUTTER + '" ' + S + '/><path d="M54 68 h12 M60 62 v12" stroke="' + INK + '" stroke-width="2"/></svg>';
  const CANDLES = '<svg viewBox="0 0 120 120"><path d="M30 34 q-6 -12 0 -22 q6 10 0 22Z M60 26 q-6 -12 0 -22 q6 10 0 22Z M90 34 q-6 -12 0 -22 q6 10 0 22Z" fill="' + NEON + '" ' + S + '/><rect x="24" y="36" width="12" height="62" fill="' + BUTTER + '" ' + S + '/><rect x="54" y="28" width="12" height="70" fill="' + ICE + '" ' + S + '/><rect x="84" y="36" width="12" height="62" fill="' + BUTTER + '" ' + S + '/><path d="M10 112 Q60 92 110 112Z" fill="' + TAN + '" ' + S + '/><path d="M18 98 h84 v6 h-84Z" fill="' + ORANGE + '" ' + S + '/></svg>';
  const PIE = PIECES.find((p) => p.id === "pie").svg;
  const TAG = PIECES.find((p) => p.id === "tag").svg;

  function cut(svg, x, y, w, rot) {
    const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg); const h = (w * vb[2]) / vb[1];
    return '<g transform="rotate(' + (rot || 0) + " " + (x + w / 2) + " " + (y + h / 2) + ')" filter="url(#cut)">' +
      svg.replace("<svg ", '<svg x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" overflow="visible" ') + "</g>";
  }
  function heroArt() {
    let out = '<svg class="still-life" viewBox="0 0 640 560" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Two marble busts dressed for dinner">' +
      '<defs><filter id="cut" x="-20%" y="-20%" width="140%" height="140%"><feMorphology in="SourceAlpha" operator="dilate" radius="4" result="d"/>' +
      '<feFlood flood-color="#fff"/><feComposite in2="d" operator="in" result="edge"/>' +
      '<feOffset in="d" dx="4" dy="6" result="o"/><feFlood flood-color="rgba(59,36,24,.22)"/><feComposite in2="o" operator="in" result="shadow"/>' +
      '<feMerge><feMergeNode in="shadow"/><feMergeNode in="edge"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>';
    BUSTS.forEach((b) => {
      out += cut(bust(b.id), b.x, b.y, 250, b.r);
      DRESS[b.id].forEach((pid) => {
        const p = PIECES.find((q) => q.id === pid);
        const vb = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(p.svg); const h = (p.w * vb[2]) / vb[1];
        const x = b.x + p.at[0] * SCALE - p.w * p.anchor[0], y = b.y + p.at[1] * SCALE - h * p.anchor[1];
        out += cut(p.svg, x, y, p.w, (b.id === "dave" ? p.r : -p.r) + b.r);
      });
    });
    out += cut(PIE, 8, 444, 120, -8) + cut(SUITCASE, 520, 410, 104, 7) + cut(TAG, 214, 470, 104, -5);
    out += '<g transform="rotate(14 600 120)" filter="url(#cut)"><image href="' + img("images/fork.png") + '" x="578" y="40" width="54" height="110"/></g>';
    return out + "</svg>";
  }

  /* ---------- stickers peppered across the whole page ----------
     [src, top as % of the page, side, inset from that edge (vw), width (px), tilt] */
  const PEPPER = [ // top % here is of the hero, above the orange banner
    ["images/activities/flowers.webp", 4, "right", 6, 190, -5],
    ["images/stickers/cocktail.webp", 12, "right", 24, 110, 9],
    ["images/stickers/cheese-board.webp", 38, "right", 14, 165, -8],
    ["images/activities/craft.webp", 36, "right", 29, 120, 7],
    ["images/stickers/dessert.webp", 66, "right", 3, 118, 6]
  ];
  function pepper() {
    const main = document.querySelector(".landing-hero"); if (!main || main.querySelector(".pepper")) return;
    const layer = document.createElement("div"); layer.className = "pepper"; layer.setAttribute("aria-hidden", "true");
    layer.innerHTML = PEPPER.map(([src, top, side, inset, w, r], i) =>
      '<img src="' + src + '" alt="" style="top:' + top + "%;" + side + ":" + inset + "vw;--w:" + w + "px;--r:" + r + "deg;--d:" + (i * 0.4).toFixed(1) + 's">').join("");
    main.prepend(layer);
  }

  const KINDS = [
    { id: "meal", title: "Meals", art: PIE, line: "Dinners, brunches, the long table. Recipes, oven plans, and one market list that does the math." },
    { id: "trip", title: "Trips", art: SUITCASE, line: "Weekends away and holidays somewhere else. Day-by-day itineraries that work around arrivals." },
    { id: "together", title: "Get-togethers", art: CANDLES, line: "Birthdays, game nights, the first toast. A guest book for who's bringing what." }
  ];
  function render() {
    pepper();
    const k = document.querySelector("#kinds"); if (!k) return;
    k.innerHTML = KINDS.map((x, i) => {
      const n = data.gatherings.filter((g) => (g.kind || []).includes(x.id)).length;
      return '<a class="kind-card" href="#gatherings" style="--r:' + [-1.2, 0.8, -0.6][i] + 'deg"><div class="kind-art">' + x.art + '</div><p class="eyebrow orange">' + (n ? n + " planned" : "start one") + '</p><h3 class="hed">' + x.title + "</h3><p>" + x.line + "</p></a>";
    }).join("");
  }

  /* ---------- gatherings ---------- */
  function gatherings() {
    const el = document.querySelector("#gathering-grid"); if (!el) return;
    el.innerHTML = data.gatherings.map((g, gi) =>
      '<a class="g-card" href="gathering.html?g=' + esc(g.id) + '"><div class="img" style="background-image:url(\'' + esc(img(g.cardImage || g.heroImage)) + '\')"><span class="badge neon">No. ' + esc(g.number) + "</span>" + '<span class="kind-tags">' + (g.kind || []).map((k) => "<i>" + esc({ meal: "meal", trip: "trip", together: "get-together" }[k] || k) + "</i>").join("") + "</span>" + GC.pencil("gatherings." + gi + ".cardImage", g.id + "-card") + "</div>" +
      '<div class="body"><p class="eyebrow orange">' + esc(g.place) + " · " + esc(g.status) + '</p><h3 class="hed">' + esc(g.title) + '</h3><p style="margin:10px 0 0;color:var(--muted)">' + esc(g.subtitle) + '</p><div class="meta">' + esc(g.dates) + " · " + esc(g.people) + " people</div></div></a>").join("") +
      (GC.editing ? '<button type="button" class="g-card soon" data-new-gathering><div><p class="eyebrow ice">No. ' + String(data.gatherings.length + 1).padStart(3, "0") + '</p><h3 class="hed">+ add a gathering</h3><p style="color:var(--ice-deep);max-width:300px;margin:12px auto 0">A meal, a trip, or a get-together. Pick the dates and the days build themselves.</p></div></button>' : "") +
      (GC.editing ? "" : '<a class="g-card soon" href="recipes.html"><div><p class="eyebrow ice">No. ' + String(data.gatherings.length + 1).padStart(3, "0") + ' · up next</p><h3 class="hed">the next long table</h3><p style="color:var(--ice-deep);max-width:300px;margin:12px auto 0">Until then, the Recipe Box is where the good ones wait. ' + icons.ne + "</p></div></a>");
  }

  function newGathering() {
    const today = new Date().toISOString().slice(0, 10);
    UI.editForm({
      eyebrow: "Good Company", title: "add a gathering",
      hint: "You can change all of this later, add or remove days, and invite the company.",
      fields: [
        { k: "title", label: "What is it", ph: "Spring dinner in Ojai" },
        { k: "kind", label: "Kind", type: "select", opts: [["meal", "A meal"], ["trip", "A trip"], ["together", "A get-together"], ["meal,trip", "A meal + a trip"]] },
        { k: "place", label: "Where", ph: "Ojai" },
        { k: "start", label: "First day", type: "date" },
        { k: "end", label: "Last day (same as first for one day)", type: "date" },
        { k: "subtitle", label: "One line about it", ph: "a long table under the oaks" }
      ],
      values: { kind: "meal", start: today, end: today },
      onSave: (v) => {
        if (!v.title) return GC.toast("Give it a name first.");
        const s = new Date((v.start || today) + "T12:00:00"); let e = new Date((v.end || v.start || today) + "T12:00:00");
        if (e < s) e = new Date(s);
        const days = [];
        for (let d = new Date(s); d <= e && days.length < 21; d.setDate(d.getDate() + 1)) {
          days.push({ id: "d" + (days.length + 1), iso: d.toISOString().slice(0, 10),
            dow: d.toLocaleDateString("en-US", { weekday: "long" }), short: d.toLocaleDateString("en-US", { weekday: "short" }),
            date: d.toLocaleDateString("en-US", { month: "long", day: "numeric" }), num: String(d.getDate()),
            title: "Day " + (days.length + 1), label: "", note: "", items: [] });
        }
        const md = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        const yr = e.getFullYear();
        data.gatherings.push({
          id: GC.slug(v.title) + "-" + GC.uid(), number: String(data.gatherings.length + 1).padStart(3, "0"),
          kind: v.kind.split(","), title: v.title, place: v.place || "", subtitle: v.subtitle || "",
          dates: days.length > 1 ? md(s) + " — " + md(e) + ", " + yr : md(s) + ", " + yr,
          datesLong: s.toLocaleDateString("en-US", { month: "long", day: "numeric" }) + (days.length > 1 ? " — " + e.toLocaleDateString("en-US", { month: "long", day: "numeric" }) : "") + ", " + yr,
          people: 0, status: "Planning", heroImage: "", heroCaption: "", cardImage: "",
          bigPicture: [{ text: "Finalize the menu", done: false }, { text: "Make the market list", done: false }, { text: "Give everyone a dish", done: false }, { text: "Add a little adventure", done: false }],
          days, recipes: [], activities: [], scrapbook: [], market: [], guests: []
        });
        GC.save(v.title + " started. Open it to start planning.");
      }
    });
  }
  document.addEventListener("click", (e) => { if (e.target.closest("[data-new-gathering]")) newGathering(); });

  GC.onChange = () => { render(); gatherings(); };
  GC.ready.then(() => { render(); gatherings(); });
})();
