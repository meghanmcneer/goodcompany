/* ==================================================================
   GOOD COMPANY — kitchen engine
   1. scrapeRecipe(url)     paste a link → title, image, ingredients, steps
   2. parseIngredient(str)  "1 1/2 cups maple syrup" → {qty, unit, name}
   3. combine(recipes)      adds matching ingredients across recipes
   4. timeline(recipe, ...) works backward from serve time → start + prep flags
   5. ovenPlan(...)         spots oven clashes + suggests how to share
================================================================== */
(function (root) {
  /* ---------------------------------------------------------------
     1. SCRAPING
     A site on GitHub Pages can't read other websites directly
     (browsers block it), so we ask a public relay to fetch the page,
     then read the recipe data most recipe sites publish (schema.org).
  --------------------------------------------------------------- */
  const RELAYS = [
    (u) => "https://api.allorigins.win/raw?url=" + encodeURIComponent(u),
    (u) => "https://corsproxy.io/?url=" + encodeURIComponent(u),
    (u) => "https://api.codetabs.com/v1/proxy?quest=" + encodeURIComponent(u)
  ];

  async function fetchHTML(url) {
    let lastErr;
    for (const relay of RELAYS) {
      try {
        const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 14000);
        const res = await fetch(relay(url), { signal: ctrl.signal }); clearTimeout(t);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const html = await res.text();
        if (html && html.length > 500) return html;
      } catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("could not reach that page");
  }

  const decode = (s) => {
    if (typeof document === "undefined") return String(s || "");
    const t = document.createElement("textarea"); t.innerHTML = String(s || ""); return t.value.replace(/\s+/g, " ").trim();
  };
  const isRecipe = (o) => o && (o["@type"] === "Recipe" || (Array.isArray(o["@type"]) && o["@type"].includes("Recipe")));
  function findRecipe(node) {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) { for (const n of node) { const r = findRecipe(n); if (r) return r; } return null; }
    if (isRecipe(node)) return node;
    if (node["@graph"]) return findRecipe(node["@graph"]);
    if (node.mainEntity) return findRecipe(node.mainEntity);
    return null;
  }
  function flattenSteps(ins) {
    if (!ins) return [];
    if (typeof ins === "string") return ins.split(/\n+|(?<=\.)\s+(?=[A-Z])/).map(decode).filter(Boolean);
    if (Array.isArray(ins)) return ins.flatMap(flattenSteps);
    if (ins.itemListElement) return flattenSteps(ins.itemListElement);
    if (ins.text) return [decode(ins.text)];
    if (ins.name) return [decode(ins.name)];
    return [];
  }
  const pickImage = (im) => !im ? "" : typeof im === "string" ? im : Array.isArray(im) ? pickImage(im[im.length > 1 ? 0 : 0]) : im.url || "";
  const isoMinutes = (iso) => { const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?/.exec(iso || ""); return m ? (+m[1] || 0) * 1440 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; };

  async function scrapeRecipe(url) {
    const html = await fetchHTML(url);
    const doc = new DOMParser().parseFromString(html, "text/html");
    let r = null;
    for (const s of doc.querySelectorAll('script[type="application/ld+json"]')) {
      try { r = findRecipe(JSON.parse(s.textContent)); } catch (e) {}
      if (r) break;
    }
    const meta = (p) => (doc.querySelector('meta[property="' + p + '"],meta[name="' + p + '"]') || {}).content || "";
    const out = {
      title: decode((r && r.name) || meta("og:title") || doc.title),
      note: decode((r && r.description) || meta("og:description")).slice(0, 220),
      image: (r && pickImage(r.image)) || meta("og:image"),
      source: url,
      ingredients: r && r.recipeIngredient ? r.recipeIngredient.map(decode).filter(Boolean) : [],
      steps: r ? flattenSteps(r.recipeInstructions) : [],
      yield: r && r.recipeYield ? decode(Array.isArray(r.recipeYield) ? r.recipeYield[0] : r.recipeYield) : "",
      totalMinutes: r ? isoMinutes(r.totalTime) : 0
    };
    if (!out.ingredients.length) { // fallback: common recipe-plugin markup
      const sel = '[itemprop="recipeIngredient"], .wprm-recipe-ingredient, .tasty-recipes-ingredients li, .mv-create-ingredients li, [class*="ingredient-list"] li, [class*="ingredients"] li';
      out.ingredients = [...doc.querySelectorAll(sel)].map((e) => decode(e.textContent)).filter((t) => t && t.length < 160).slice(0, 60);
    }
    if (!out.steps.length) {
      const sel = '[itemprop="recipeInstructions"] li, .wprm-recipe-instruction, .tasty-recipes-instructions li, .mv-create-instructions li, [class*="instructions"] li';
      out.steps = [...doc.querySelectorAll(sel)].map((e) => decode(e.textContent)).filter(Boolean).slice(0, 40);
    }
    const ym = /(\d+)/.exec(out.yield || ""); if (ym) out.serves = +ym[1];
    out.title = out.title.replace(/\s*[|–—-]\s*[^|–—-]+$/, "").trim() || "Untitled recipe";
    return out;
  }

  /* ---------------------------------------------------------------
     2. INGREDIENT PARSING
  --------------------------------------------------------------- */
  const FRAC = { "½": .5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": .25, "¾": .75, "⅛": .125, "⅜": .375, "⅝": .625, "⅞": .875, "⅕": .2, "⅙": 1 / 6, "⅚": 5 / 6 };
  const UNITS = {
    tsp: ["teaspoon", "teaspoons", "tsp", "tsps", "t"], tbsp: ["tablespoon", "tablespoons", "tbsp", "tbsps", "tbs", "tbl", "T"],
    cup: ["cup", "cups", "c"], oz: ["ounce", "ounces", "oz"], lb: ["pound", "pounds", "lb", "lbs"],
    g: ["gram", "grams", "g"], kg: ["kilogram", "kilograms", "kg"], ml: ["milliliter", "milliliters", "ml"], l: ["liter", "liters", "litre", "litres", "l"],
    pint: ["pint", "pints", "pt"], quart: ["quart", "quarts", "qt"], clove: ["clove", "cloves"], can: ["can", "cans"],
    stick: ["stick", "sticks"], pinch: ["pinch", "pinches"], dash: ["dash", "dashes"], sprig: ["sprig", "sprigs"],
    bunch: ["bunch", "bunches"], slice: ["slice", "slices"], head: ["head", "heads"], package: ["package", "packages", "pkg"], jar: ["jar", "jars"]
  };
  const UNIT_OF = {}; for (const [u, list] of Object.entries(UNITS)) list.forEach((w) => (UNIT_OF[w] = u));
  const DESCRIPTORS = /\b(large|medium|small|extra[- ]large|fresh|freshly|cold|chilled|softened|melted|room[- ]temperature|chopped|diced|minced|sliced|peeled|grated|packed|finely|roughly|thinly|whole|good|organic|ripe)\b/g;

  function singular(w) {
    if (/ies$/.test(w)) return w.replace(/ies$/, "y");
    if (/(tomato|potato)es$/.test(w)) return w.replace(/es$/, "");
    if (/(ch|sh|ss|x)es$/.test(w)) return w.replace(/es$/, "");
    if (/[^su]s$/.test(w)) return w.replace(/s$/, "");
    return w;
  }
  function plural(w) {
    if (/[^aeiou]y$/.test(w)) return w.replace(/y$/, "ies");
    if (/(ch|sh|ss|x|o)$/.test(w) && !/(pecan)$/.test(w)) return w + "es";
    if (/s$/.test(w)) return w;
    return w + "s";
  }

  function parseIngredient(raw) {
    let s = String(raw || "").trim();
    s = s.replace(/(\d)([½⅓⅔¼¾⅛⅜⅝⅞⅕⅙⅚])/g, "$1 $2");
    let qty = null; const nums = [];
    const tok = /^\s*(\d+\/\d+|\d*\.\d+|\d+|[½⅓⅔¼¾⅛⅜⅝⅞⅕⅙⅚])(?=[\s\-–a-zA-Z(]|$)/;
    let m;
    while ((m = tok.exec(s))) {
      const t = m[1]; nums.push(FRAC[t] != null ? FRAC[t] : t.includes("/") ? +t.split("/")[0] / +t.split("/")[1] : +t);
      s = s.slice(m[0].length);
      const range = /^\s*(?:-|–|to|or)\s*(?=\d)/.exec(s);
      if (range) { s = s.slice(range[0].length); const r = tok.exec(s); if (r) s = s.slice(r[0].length); break; } // "2-3" → take first
    }
    if (nums.length) qty = nums.reduce((a, b) => a + b, 0);
    s = s.trim(); const afterQty = s;
    let paren = ""; const pm = /^\(([^)]*)\)\s*/.exec(s); if (pm) { paren = pm[1]; s = s.slice(pm[0].length); }
    let unit = "";
    const um = /^([A-Za-z]+)\.?\s+/.exec(s);
    if (um && qty != null) {
      const w = um[1]; const u = UNIT_OF[w] || UNIT_OF[w.toLowerCase()];
      if (u && !(w === "T" && false)) { unit = u; s = s.slice(um[0].length); }
    }
    s = s.replace(/^of\s+/i, "");
    const display = s.split(",")[0].replace(/\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
    const key = singular(display.toLowerCase().replace(DESCRIPTORS, "").replace(/[^a-z\s-]/g, "").replace(/\s+/g, " ").trim()) || display.toLowerCase();
    return { raw: String(raw), qty, unit, name: display, key, note: paren, afterQty };
  }

  /* ---------------------------------------------------------------
     3. COMBINING  (volume and weight units are converted and added)
  --------------------------------------------------------------- */
  const VOL = { tsp: 1, tbsp: 3, cup: 48, ml: 0.2029, l: 202.9, pint: 96, quart: 192 };
  const WT_OZ = { oz: 1, lb: 16 };
  const WT_G = { g: 1, kg: 1000 };
  const family = (u) => (u in VOL && !["ml", "l"].includes(u) ? "vol" : u in WT_OZ ? "oz" : u in WT_G ? "g" : u === "ml" || u === "l" ? "metricvol" : "count:" + u);

  const NICE = [[1 / 8, "⅛"], [1 / 6, "⅙"], [1 / 4, "¼"], [1 / 3, "⅓"], [3 / 8, "⅜"], [1 / 2, "½"], [5 / 8, "⅝"], [2 / 3, "⅔"], [3 / 4, "¾"], [5 / 6, "⅚"], [7 / 8, "⅞"]];
  function fmt(n) {
    if (n == null) return "";
    let whole = Math.floor(n + 1e-9), rest = n - whole;
    if (rest < 0.03) return String(whole);
    if (rest > 0.97) return String(whole + 1);
    for (const [v, g] of NICE) if (Math.abs(rest - v) < 0.03) return (whole ? whole : "") + g;
    return String(Math.round(n * 100) / 100);
  }
  const niceFrac = (n) => { const r = n - Math.floor(n); return r < 0.03 || r > 0.97 || NICE.some(([v]) => Math.abs(r - v) < 0.03); };
  const unitLabel = (u, n) => ({ cup: n > 1 ? "cups" : "cup", clove: n > 1 ? "cloves" : "clove", can: n > 1 ? "cans" : "can", stick: n > 1 ? "sticks" : "stick", slice: n > 1 ? "slices" : "slice", sprig: n > 1 ? "sprigs" : "sprig", bunch: n > 1 ? "bunches" : "bunch", head: n > 1 ? "heads" : "head", package: n > 1 ? "packages" : "package", jar: n > 1 ? "jars" : "jar", pinch: n > 1 ? "pinches" : "pinch", dash: n > 1 ? "dashes" : "dash", pint: n > 1 ? "pints" : "pint", quart: n > 1 ? "quarts" : "quart" }[u] || u);

  function fmtVolume(tsp) {
    let cups = tsp / 48;
    if (cups >= 0.25) { const w = Math.floor(cups); const fr = CUP_STEPS.reduce((a, b) => (Math.abs(cups - w - b) < Math.abs(cups - w - a) ? b : a)); if (Math.abs(cups - (w + fr)) / cups < 0.04) { cups = w + fr; tsp = cups * 48; } }
    if (cups >= 0.25 && niceFrac(cups)) return fmt(cups) + " " + unitLabel("cup", cups);
    if (cups >= 0.25) { // e.g. 1 cup + 1 tbsp + 1 tsp
      const c = Math.floor(cups * 4) / 4; const tb = Math.round(((tsp - c * 48) / 3) * 2) / 2;
      return fmt(c) + " " + unitLabel("cup", c) + (tb ? " + " + fmt(tb) + " tbsp" : "");
    }
    const tbsp = tsp / 3;
    if (tbsp >= 1 && niceFrac(tbsp)) return fmt(tbsp) + " tbsp";
    return fmt(tsp) + " tsp";
  }
  function fmtAmount(fam, total, unit) {
    if (fam === "vol") return fmtVolume(total);
    if (fam === "oz") return total >= 16 ? fmt(total / 16) + " lb" : fmt(total) + " oz";
    if (fam === "g") return total >= 1000 ? fmt(total / 1000) + " kg" : Math.round(total) + " g";
    if (fam === "metricvol") return total >= 1000 ? fmt(total / 1000) + " l" : Math.round(total) + " ml";
    return fmt(total) + (unit ? " " + unitLabel(unit, total) : "");
  }

  /** recipes: [{title, ingredients:[...]}] → [{key, name, amount, from:[titles], parts}] */
  function combine(recipes) {
    const map = new Map();
    for (const r of recipes) {
      for (const line of r.ingredients || []) {
        const p = parseIngredient(line); if (!p.key) continue;
        if (!map.has(p.key)) map.set(p.key, { key: p.key, name: p.name, groups: {}, loose: 0, from: new Set(), lines: [], note: p.note });
        const e = map.get(p.key); e.from.add(r.title); e.lines.push(line);
        if (p.qty == null) { e.loose++; continue; }
        const fam = family(p.unit);
        const val = fam === "vol" ? p.qty * VOL[p.unit] : fam === "oz" ? p.qty * WT_OZ[p.unit] : fam === "g" ? p.qty * WT_G[p.unit] : fam === "metricvol" ? p.qty * (p.unit === "l" ? 1000 : 1) : p.qty;
        e.groups[fam] = e.groups[fam] || { total: 0, unit: p.unit }; e.groups[fam].total += val;
      }
    }
    return [...map.values()].map((e) => {
      const fams = Object.entries(e.groups);
      const amount = fams.map(([f, g]) => fmtAmount(f, g.total, g.unit)).join(" + ");
      const countOnly = fams.length === 1 && fams[0][0] === "count:" && fams[0][1].total > 1;
      const base = e.name.replace(/\b(\w+)$/, (w) => (countOnly ? plural(singular(w)) : w));
      return { key: e.key, name: base + (e.lines.length === 1 && e.note ? " (" + e.note + ")" : ""), amount, from: [...e.from], lines: e.lines, loose: e.loose };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }

  /* ---------------------------------------------------------------
     3b. SCALING — cooking for more (or fewer) people
  --------------------------------------------------------------- */
  const UNIT_WORDS = { cup: "cups", tablespoon: "tablespoons", teaspoon: "teaspoons", pound: "pounds", ounce: "ounces", clove: "cloves", can: "cans", stick: "sticks", gram: "grams", slice: "slices", sprig: "sprigs", head: "heads", jar: "jars", package: "packages", bunch: "bunches", pinch: "pinches", quart: "quarts", pint: "pints" };
  const SINGULAR_UNIT = Object.fromEntries(Object.entries(UNIT_WORDS).map(([a, b]) => [b, a]));
  // round to what a measuring cup or spoon can actually do
  const CUP_STEPS = [0, 1 / 4, 1 / 3, 1 / 2, 2 / 3, 3 / 4, 1];
  function friendly(q, unit) {
    if (unit in VOL && !["ml", "l"].includes(unit)) {
      const tsp = q * VOL[unit];
      if (tsp >= 12) {
        const c = tsp / 48, w = Math.floor(c); const fr = CUP_STEPS.reduce((a, b) => (Math.abs(c - w - b) < Math.abs(c - w - a) ? b : a));
        if (Math.abs(c - (w + fr)) / c < 0.04 || tsp > 24) return [w + fr, "cup"]; // exact cup measure, or more than ½ cup
      }
      if (tsp >= 3) return [Math.round((tsp / 3) * 2) / 2, "tbsp"];
      return [Math.max(0.125, Math.round(tsp * 4) / 4), "tsp"];
    }
    if (unit === "oz") return [q >= 4 ? Math.round(q) : Math.round(q * 2) / 2, unit];
    if (unit === "lb") return [Math.round(q * 4) / 4, unit];
    if (unit === "g" || unit === "ml") return [Math.round(q / 5) * 5, unit];
    if (unit === "stick") return [Math.round(q * 2) / 2, unit];
    if (["clove", "can", "jar", "package", "head", "bunch", "slice", "sprig"].includes(unit)) return [Math.max(1, Math.ceil(q - 0.05)), unit];
    return [q, unit];
  }
  const UNIT_SAY = { cup: ["cup", "cups"], tbsp: ["tablespoon", "tablespoons"], tsp: ["teaspoon", "teaspoons"] };

  function scaleLine(line, f) {
    if (!f || Math.abs(f - 1) < 0.001) return line;
    const p = parseIngredient(line); if (p.qty == null) return line;
    let q = p.qty * f;
    let rest = p.afterQty;
    // "1 (12-pound) turkey": a bigger bird, not more birds
    const wt = /^\((\d+(?:\.\d+)?)([-\s]?)(pound|lb|ounce|oz|kg|kilo)(s?)([^)]*)\)/i.exec(rest);
    if (!p.unit && wt && p.qty === 1) {
      const w = Math.round(+wt[1] * f * 2) / 2;
      return fmt(p.qty) + " " + rest.replace(wt[0], "(" + fmt(w) + wt[2] + wt[3] + wt[4] + wt[5] + ")");
    }
    if (!p.unit) q = Math.max(1, Math.ceil(q - 0.05)); // eggs and apples come whole
    if (p.unit) {
      const [nq, nu] = friendly(q, p.unit);
      if (UNIT_SAY[nu] && nu !== p.unit) { // switched measure, e.g. 12 tbsp → ¾ cup
        const name = rest.replace(/^(\([^)]*\)\s*)?[A-Za-z]+\.?\s+/, "$1");
        return fmt(nq) + " " + UNIT_SAY[nu][nq > 1 ? 1 : 0] + " " + name;
      }
      q = nq;
    }
    // fix the unit word ("1 cup" → "2 cups")
    rest = rest.replace(/^(\([^)]*\)\s*)?([A-Za-z]+)(\.?)(\s)/, (m, paren, w, dot, sp) => {
      const lw = w.toLowerCase();
      if (q > 1 && UNIT_WORDS[lw]) return (paren || "") + UNIT_WORDS[lw] + dot + sp;
      if (q <= 1 && SINGULAR_UNIT[lw]) return (paren || "") + SINGULAR_UNIT[lw] + dot + sp;
      return m;
    });
    // countable things get plural ("1 orange" → "2 oranges")
    if (!p.unit && q <= 1) rest = rest.replace(/^([^,(]*?)([A-Za-z]+)(\s*(?:,|\(|$))/, (m, a, w, b) => a + singular(w) + b);
    if (!p.unit && q > 1) rest = rest.replace(/^([^,(]*?)([A-Za-z]+)(\s*(?:,|\(|$))/, (m, a, w, b) => (singular(w.toLowerCase()) === w.toLowerCase() && !/s$/.test(w) ? a + plural(w) + b : m));
    return fmt(q) + " " + rest;
  }
  const scaleOf = (r) => (r && r.serves > 0 && r.cookingFor > 0 ? r.cookingFor / r.serves : 1);
  const MEAT = /(turkey|chicken|roast|beef|pork|lamb|ham|duck|brisket|prime rib|tenderloin|goose)/i;
  const round5 = (n) => Math.max(5, Math.round(n / 5) * 5);
  /** steps with their timing adjusted for the headcount; each may carry .was and .note */
  function adjustSteps(recipe) {
    const f = recipe.scale || scaleOf(recipe);
    const steps = (recipe.steps || []).map((s) => ({ text: s, ...stepInfo(s) }));
    let temp = null; steps.forEach((s) => { if (s.temp) temp = s.temp; if (s.oven && !s.temp) s.temp = temp; });
    if (Math.abs(f - 1) < 0.05) return steps;
    const meat = MEAT.test(recipe.title || "");
    steps.forEach((s) => {
      if (s.passive) return; // resting, chilling, room temperature: same time
      if (s.oven && s.known && meat) { // a bigger roast takes longer, but not twice as long
        const m = round5(s.minutes * Math.pow(f, 0.75));
        if (m !== s.minutes) { s.was = s.minutes; s.minutes = m; s.note = (f > 1 ? "bigger" : "smaller") + " roast, was " + fmtDur(s.was) + ". Check the temperature to be sure"; }
      } else if (s.oven && f >= 1.5) {
        const pans = Math.ceil(f - 0.05);
        s.note = "use " + pans + " dishes side by side, same time, and swap racks halfway";
      } else if (!s.known && f > 1.2) {
        s.was = s.minutes; s.minutes = round5(10 * Math.sqrt(f)); // more chopping, more stirring
      }
    });
    return steps;
  }

  /* ---------------------------------------------------------------
     4. TIMELINE — work backward from serve time
  --------------------------------------------------------------- */
  const WORDNUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40, "forty-five": 45 };
  const PASSIVE = /(room temperature|\brest|chill|refrigerat|fridge|freez|marinat|\brise\b|proof|thaw|soak|\bcool|set aside|let (it )?(sit|stand)|overnight|brine|steep)/i;
  const OVEN = /\b(roast|bake|broil|in the oven)/i;

  function stepInfo(text) {
    const t = String(text || "");
    let minutes = 0, overnight = false, dayAhead = false;
    if (/overnight/i.test(t)) { overnight = true; minutes = Math.max(minutes, 10 * 60); }
    if (/(day ahead|day before|24 hours ahead|a day in advance)/i.test(t)) { dayAhead = true; minutes = Math.max(minutes, 24 * 60); }
    if (/half an? hour/i.test(t)) minutes = Math.max(minutes, 30);
    const re = /(?:(every|each)\s+)?(\d+(?:\.\d+)?|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve|fifteen|twenty|thirty|forty-five|forty)(?:\s*(?:-|–|to|or)\s*(\d+(?:\.\d+)?))?\s*(hours?|hrs?|minutes?|mins?|days?)\b/gi;
    let m;
    while ((m = re.exec(t))) {
      if (m[1]) continue; // "every 30 minutes" isn't a duration
      const n = Math.max(+m[2] || WORDNUM[m[2].toLowerCase()] || 0, m[3] ? +m[3] : 0);
      const u = m[4].toLowerCase();
      const mins = u.startsWith("h") ? n * 60 : u.startsWith("d") ? n * 1440 : n;
      minutes = Math.max(minutes, mins);
    }
    const passive = PASSIVE.test(t);
    if (!minutes && /room temperature/i.test(t)) minutes = 60;
    const known = minutes > 0;
    if (!minutes) minutes = 10;
    const tm = /\b(2[5-9]\d|[3-5]\d\d)\s*(?:°|º|degrees)?\s*F?\b/.exec(t);
    const temp = tm && /(oven|bake|roast|heat|broil|°|degrees)/i.test(t) ? +tm[1] : null;
    return { minutes, known, passive, overnight, dayAhead, oven: OVEN.test(t) && !/^heat|^preheat/i.test(t.trim()), temp };
  }

  const pad = (n) => String(n).padStart(2, "0");
  const toISO = (d) => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  function clock(d) {
    let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? "pm" : "am"; h = h % 12 || 12;
    return h + (m ? ":" + pad(m) : "") + " " + ap;
  }
  function fmtDur(min) {
    if (min >= 1440 && min % 1440 === 0) return min / 1440 + (min === 1440 ? " day" : " days");
    const h = Math.floor(min / 60), m = min % 60;
    return [h ? h + (h === 1 ? " hr" : " hrs") : "", m ? m + " min" : ""].filter(Boolean).join(" ");
  }

  /** recipe with serve {day, time}; days [{id, iso}] → [{at: Date, text, kind, ...}] */
  function timeline(recipe, days) {
    if (!recipe.serve || !recipe.serve.day || !recipe.serve.time) return null;
    const day = days.find((d) => d.id === recipe.serve.day); if (!day || !day.iso) return null;
    const serveAt = new Date(day.iso + "T" + recipe.serve.time + ":00");
    const steps = adjustSteps(recipe);
    let end = new Date(serveAt);
    for (let i = steps.length - 1; i >= 0; i--) {
      const s = steps[i];
      let start = new Date(end.getTime() - s.minutes * 60000);
      if (s.overnight) { // overnight steps begin the evening before
        const eve = new Date(end); eve.setDate(eve.getDate() - (end.getHours() < 18 ? 1 : 0)); eve.setHours(20, 0, 0, 0);
        if (eve < start) start = eve;
      }
      // keep hands-on work out of the middle of the night when the next step can just wait longer
      const next = steps[i + 1];
      const h = start.getHours() + start.getMinutes() / 60;
      if (!s.passive && (h >= 22.5 || h < 6.5) && next && next.passive) {
        const eve = new Date(start); if (h < 6.5) eve.setDate(eve.getDate() - 1); eve.setHours(21, 30, 0, 0);
        start = new Date(eve.getTime() - s.minutes * 60000); s.minutes = (eve - start) / 60000;
      }
      s.start = start; s.end = new Date(start.getTime() + s.minutes * 60000); end = start;
    }
    const events = [];
    if (steps.length && !steps[0].passive) events.push({ at: steps[0].start, kind: "start", text: "start the " + recipe.title.toLowerCase(), recipe: recipe.title });
    steps.forEach((s, i) => {
      const flag = s.passive || (s.oven && s.minutes >= 30) || s.minutes >= 90;
      if ((i > 0 || s.passive) && flag) events.push({ at: s.start, kind: s.passive ? "flag" : "oven", text: s.text.replace(/\.$/, ""), dur: s.known || s.was ? fmtDur(s.minutes) : "", recipe: recipe.title, temp: s.oven ? s.temp : null, note: s.note || "" });
    });
    events.push({ at: serveAt, kind: "serve", text: "serve the " + recipe.title.toLowerCase(), recipe: recipe.title });
    return { serveAt, steps, events };
  }

  /* ---------------------------------------------------------------
     5. OVEN PLANNER
  --------------------------------------------------------------- */
  const SENSITIVE = /(pie|cake|bread|biscuit|cookie|pastry|souffl|tart|roll|turkey|chicken|roast|beef|pork|lamb|ham|duck|fish)/i;
  function ovenPlan(recipes, days) {
    const slots = [];
    for (const r of recipes) {
      const tl = timeline(r, days); if (!tl) continue;
      tl.steps.forEach((s, i) => {
        if (!s.oven || !s.temp) return;
        const after = tl.steps[i + 1];
        slots.push({ recipe: r.title, temp: s.temp, start: s.start, end: s.end, minutes: s.minutes, restAfter: after && after.passive ? after.minutes : 0, sensitive: SENSITIVE.test(r.title) });
      });
    }
    const clashes = [];
    for (let i = 0; i < slots.length; i++) for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i], b = slots[j];
      const from = new Date(Math.max(a.start, b.start)), to = new Date(Math.min(a.end, b.end));
      if (to <= from) continue;
      clashes.push({ a, b, from, to, overlap: (to - from) / 60000, ideas: suggest(a, b) });
    }
    return { slots, clashes };
  }
  function suggest(a, b) {
    const ideas = [];
    const diff = Math.abs(a.temp - b.temp);
    const [hot, cool] = a.temp >= b.temp ? [a, b] : [b, a];
    if (diff === 0) {
      ideas.push("Same temperature, so they can share the oven. Leave a few inches around each dish so air moves, and swap rack positions halfway.");
      return ideas;
    }
    if (diff <= 50) {
      const keep = hot.sensitive && !cool.sensitive ? hot : cool.sensitive && !hot.sensitive ? cool : hot;
      const flex = keep === hot ? cool : hot;
      const adj = Math.round(flex.minutes * 0.1 * ((flex.temp - keep.temp) / 25));
      const newMin = flex.minutes + adj;
      ideas.push("Run the oven at " + keep.temp + "° for both. The " + keep.recipe.toLowerCase() + " is the fussier dish, so it keeps its temperature, and the " + flex.recipe.toLowerCase() + " goes from " + fmtDur(flex.minutes) + " to about " + fmtDur(newMin) + (adj < 0 ? ". Start checking it " + Math.abs(adj) + " minutes early." : ". Give it about " + adj + " extra minutes."));
      ideas.push("Put the bigger dish on the lowest rack and the other on the upper-middle rack, then rotate both halfway through.");
    }
    for (const [x, y] of [[a, b], [b, a]]) {
      if (x.restAfter >= 20) {
        const xr = x.recipe.toLowerCase(), yr = y.recipe.toLowerCase();
        if (x.restAfter >= y.minutes) ideas.push("Use the " + xr + "'s " + fmtDur(x.restAfter) + " rest. When it comes out, set the oven to " + y.temp + "° and slide in the " + yr + ". It'll be done right on time.");
        else if (diff <= 50) ideas.push("Bake the " + yr + " next to the " + xr + " at " + x.temp + "° until the " + xr + " comes out. Then set the oven to " + y.temp + "° and let it finish during the " + fmtDur(x.restAfter) + " rest.");
        else ideas.push("Put the " + yr + " in at " + y.temp + "° the moment the " + xr + " comes out. It will run about " + fmtDur(y.minutes - x.restAfter) + " past the rest, so push its serve time back a little or bake it ahead.");
        break;
      }
    }
    const ahead = !cool.sensitive ? cool : !hot.sensitive ? hot : null;
    const other = ahead === cool ? hot : cool;
    if (ahead) ideas.push("Make the " + ahead.recipe.toLowerCase() + " earlier in the day (or the day before). Rewarm it covered in the " + other.temp + "° oven for the last 20 to 25 minutes.");
    ideas.push("Got a countertop oven or air fryer? It can take the smaller dish.");
    return ideas;
  }

  const api = { scrapeRecipe, parseIngredient, combine, stepInfo, timeline, ovenPlan, fmt, fmtDur, clock, toISO, scaleLine, scaleOf, adjustSteps };
  if (typeof module !== "undefined") module.exports = api; else root.Kitchen = api;
})(typeof window !== "undefined" ? window : globalThis);
