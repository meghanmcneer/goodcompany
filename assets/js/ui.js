/* ==================================================================
   GOOD COMPANY — shared UI: drawer, forms, recipe detail, stars
================================================================== */
(function () {
  const { esc, icons, img, data, editing } = GC;
  const K = window.Kitchen;

  /* ---------- drawer ---------- */
  let back;
  function open(inner, mount) {
    if (!back) {
      back = document.createElement("div"); back.className = "modal-back";
      back.innerHTML = '<div class="modal" role="dialog" aria-modal="true"></div>';
      back.addEventListener("click", (e) => { if (e.target === back || e.target.closest("[data-close]")) close(); });
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
      document.body.appendChild(back);
    }
    const m = back.querySelector(".modal"); m.innerHTML = inner; m.scrollTop = 0;
    back.classList.add("open"); document.body.style.overflow = "hidden";
    if (mount) mount(m);
    return m;
  }
  function close() { if (back) back.classList.remove("open"); document.body.style.overflow = ""; GC.applyType((data.site || {}).type); }
  const top = (eyebrow, title) =>
    '<div class="modal-top"><div><p class="eyebrow">' + esc(eyebrow || "Good Company") + ' <img class="fork-mini" src="' + GC.img("images/fork.png") + '" alt=""></p><h2 class="hed">' + esc(title) + '</h2></div><button class="x" data-close aria-label="close">×</button></div>';

  /* ---------- forms ----------
     fields: [{k, label, type:'text'|'area'|'lines'|'select'|'time'|'number', opts:[[v,l]], ph}] */
  function form(fields, v) {
    return fields.map((f) => {
      const val = v[f.k] == null ? "" : v[f.k];
      let input;
      if (f.type === "area" || f.type === "lines") input = '<textarea name="' + f.k + '" placeholder="' + esc(f.ph || "") + '">' + esc(f.type === "lines" ? (val || []).join("\n") : val) + "</textarea>";
      else if (f.type === "select") {
        input = '<select name="' + f.k + '">' + f.opts.map(([ov, ol]) => '<option value="' + esc(ov) + '"' + (String(ov) === String(val) ? " selected" : "") + ">" + esc(ol) + "</option>").join("") + "</select>";
        if (f.preview) { const pv = f.preview[val]; input = '<div class="pick-row">' + input + '<img class="pick-preview' + (pv ? "" : " empty") + '" data-for="' + f.k + '" src="' + (pv ? pv.src : "") + '" alt=""></div>'; }
      }
      else input = '<input name="' + f.k + '" type="' + (f.type || "text") + '" value="' + esc(val) + '" placeholder="' + esc(f.ph || "") + '">';
      return '<div class="field"><label>' + esc(f.label) + "</label>" + input + "</div>";
    }).join("");
  }
  function read(root, fields) {
    const out = {};
    fields.forEach((f) => {
      const el = root.querySelector('[name="' + f.k + '"]'); if (!el) return;
      out[f.k] = f.type === "lines" ? el.value.split("\n").map((s) => s.trim()).filter(Boolean) : f.type === "number" ? +el.value || 0 : el.value.trim();
    });
    return out;
  }
  function editForm({ eyebrow, title, hint, fields, values, onSave, onDelete, deleteLabel }) {
    open(top(eyebrow, title) + (hint ? '<p class="hint">' + esc(hint) + "</p>" : "") +
      '<form class="gc-form">' + form(fields, values) +
      '<div class="modal-actions"><button class="btn" type="submit">save it</button><button class="btn ghost" type="button" data-close>cancel</button>' +
      (onDelete ? '<button class="del" type="button">' + esc(deleteLabel || "remove") + "</button>" : "") + "</div></form>", (m) => {
      fields.filter((f) => f.preview).forEach((f) => {
        const sel = m.querySelector('[name="' + f.k + '"]'); const im = m.querySelector('.pick-preview[data-for="' + f.k + '"]');
        const show = () => { const pv = f.preview[sel.value]; im.src = pv ? pv.src : ""; im.classList.toggle("empty", !pv); };
        sel.addEventListener("change", () => { sel.dataset.touched = "1"; show(); });
        const src = f.guessFrom && m.querySelector('[name="' + f.guessFrom + '"]');
        if (src && !values[f.k]) src.addEventListener("input", () => { if (sel.dataset.touched) return; const gss = f.guess(src.value); if (gss) { sel.value = gss; show(); } });
      });
      m.querySelector("form").addEventListener("submit", (e) => {
        e.preventDefault(); const v = read(m, fields);
        fields.filter((f) => f.fallback).forEach((f) => { if (!v[f.k]) v[f.k] = (f.guess && f.guess(v[f.guessFrom])) || f.fallback; });
        onSave(v); close();
      });
      const d = m.querySelector(".del"); if (d) d.addEventListener("click", () => { if (deleteLabel) { close(); onDelete(); } else if (confirm("Remove this?")) { onDelete(); close(); } });
    });
  }

  /* ---------- stars ---------- */
  function stars(n, interactive) {
    let h = '<span class="stars' + (interactive ? " pick" : "") + '" data-val="' + (n || 0) + '">';
    for (let i = 1; i <= 5; i++) h += (interactive ? '<button type="button" data-star="' + i + '"' : "<span") + ' class="star' + (i <= n ? " on" : "") + '">★' + (interactive ? "</button>" : "</span>");
    return h + "</span>";
  }
  function bindStars(root) {
    root.querySelectorAll(".stars.pick").forEach((s) => s.addEventListener("click", (e) => {
      const b = e.target.closest("[data-star]"); if (!b) return;
      const v = +b.dataset.star === +s.dataset.val ? 0 : +b.dataset.star; s.dataset.val = v;
      s.querySelectorAll(".star").forEach((x, i) => x.classList.toggle("on", i < v));
    }));
  }

  const CATEGORIES = [
    { id: "appetizer", label: "Appetizer", src: "images/stickers/appetizer.webp" },
    { id: "bread", label: "Bread", src: "images/stickers/bread.webp" },
    { id: "breakfast", label: "Breakfast", src: "images/stickers/breakfast.webp" },
    { id: "pasta", label: "Pasta", src: "images/stickers/pasta.webp" },
    { id: "cheese-board", label: "Cheese board", src: "images/stickers/cheese-board.webp" },
    { id: "cocktail", label: "Cocktail", src: "images/stickers/cocktail.webp" },
    { id: "coffee", label: "Coffee", src: "images/stickers/coffee.webp" },
    { id: "condiment", label: "Condiment", src: "images/stickers/condiment.webp" },
    { id: "dessert", label: "Dessert", src: "images/stickers/dessert.webp" },
    { id: "drink", label: "Drink", src: "images/stickers/drink.webp" },
    { id: "fish-entree", label: "Fish entrée", src: "images/stickers/fish-entree.webp" },
    { id: "meat-entree", label: "Meat entrée", src: "images/stickers/meat-entree.webp" },
    { id: "vegetarian-entree", label: "Vegetarian entrée", src: "images/stickers/vegetarian-entree.webp" },
    { id: "side", label: "Side", src: "images/stickers/side.webp" },
    { id: "side-salad", label: "Side salad", src: "images/stickers/side-salad.webp" },
    { id: "snack", label: "Snack", src: "images/stickers/snack.webp" },
    { id: "soup", label: "Soup", src: "images/stickers/soup.webp" },
    { id: "sauce", label: "Sauce", src: "images/stickers/sauce.webp" }
  ];
  const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
  const catLabel = (r) => (CAT[r.category] || {}).label || r.course || "From the recipe box";
  // a first guess from the title; people can change it
  const GUESS = [
    ["cheese-board", /cheese board|charcuterie|grazing/], ["cocktail", /cocktail|martini|negroni|spritz|margarita|old fashioned|daiquiri|punch/],
    ["coffee", /coffee|latte|espresso|cappuccino|cold brew/], ["drink", /lemonade|iced tea|\btea\b|smoothie|soda|agua fresca|cider/],
    ["soup", /soup|stew|chowder|bisque|chili|broth|gazpacho/], ["side-salad", /salad|slaw/], ["bread", /bread|loaf|focaccia|roll|biscuit|sourdough|cornbread|baguette/],
    ["breakfast", /pancake|waffle|french toast|granola|frittata|omelet|breakfast|scone|muffin|oatmeal/], ["dessert", /pie|cake|cookie|tart|brownie|pudding|crumble|cobbler|ice cream|torte|dessert/],
    ["sauce", /sauce|gravy|pesto|aioli|vinaigrette|dressing|salsa/], ["condiment", /mustard|jam|chutney|relish|pickle|compote|butter\b/],
    ["fish-entree", /salmon|fish|cod|halibut|shrimp|scallop|tuna|trout|seafood|crab|lobster/],
    ["meat-entree", /turkey|chicken|beef|steak|pork|lamb|ham|brisket|duck|meatball|sausage|ribs/],
    ["appetizer", /dip|deviled|crostini|bruschetta|tartlet|canap|appetizer|stuffed mushroom/], ["snack", /popcorn|nuts|snack|cracker|chips|trail mix/],
    ["side", /potato|gratin|mash|stuffing|casserole|roasted|green beans|carrot|brussels|squash|rice|beans/],
    ["pasta", /pasta|rigatoni|spaghetti|linguine|fettuccine|penne|orecchiette|bucatini|tagliatelle|pappardelle|lasagna|gnocchi|ravioli|tortellini|carbonara|cacio e pepe|bolognese|mac and cheese|macaroni|noodle|orzo/],
    ["vegetarian-entree", /risotto|curry|tofu|eggplant|vegetarian|veggie|quiche/]
  ];
  // the dish is usually the last thing named before "with": "chicken soup" → soup, "maple glazed turkey with gravy" → turkey
  function bestGuess(list, title) {
    const t = String(title || "").toLowerCase().split(/\s+with\s+|\s+and\s+|,/)[0];
    let best = "", at = -1;
    list.forEach(([id, re]) => { const g = new RegExp(re.source, "g"); let m; while ((m = g.exec(t))) { const end = m.index + m[0].length; if (end > at) { at = end; best = id; } if (!m[0].length) g.lastIndex++; } });
    if (best) return best;
    // nothing in the first part: look at the whole title once
    const all = String(title || "").toLowerCase(); let at2 = -1;
    list.forEach(([id, re]) => { const g = new RegExp(re.source, "g"); let m; while ((m = g.exec(all))) { const end = m.index + m[0].length; if (end > at2) { at2 = end; best = id; } if (!m[0].length) g.lastIndex++; } });
    return best;
  }
  const guessCategory = (title) => bestGuess(GUESS, title);

  /** the picture on a recipe card: your photo from when you made it, otherwise the category sticker */
  function recipeMedia(path, r, fallbackPhoto) {
    const photo = r.image || fallbackPhoto || "";
    const cat = CAT[r.category];
    const row = (tag) => '<div class="ph-row"><span class="badge">' + esc(catLabel(r)) + "</span>" + (tag || "") + "</div>";
    if (photo || !cat) return GC.slot(path, photo, r.tint, r.icon || "asterisk").replace(/<\/div>$/, row() + "</div>");
    return '<div class="ph sticker-ph tint-' + esc(r.tint || "butter") + '"><img class="sticker" src="' + cat.src + '" alt="' + esc(cat.label) + '">' +
      row(editing ? '<button type="button" class="made-it" data-path="' + esc(path) + '" data-name="' + esc(r.title) + '">Made it? Add your photo</button>' : "") +
      GC.pencil(path, r.title) + "</div>";
  }

  const ACTIVITY_TYPES = [
    { id: "puzzle", label: "Puzzle", src: "images/activities/puzzle.webp" },
    { id: "adventure", label: "Adventure", src: "images/activities/adventure.webp" },
    { id: "movie", label: "Movie", src: "images/activities/movie.webp" },
    { id: "performance", label: "Performance", src: "images/activities/performance.webp" },
    { id: "flowers", label: "Flowers", src: "images/activities/flowers.webp" },
    { id: "music", label: "Music", src: "images/activities/music.webp" },
    { id: "craft", label: "Craft", src: "images/activities/craft.webp" },
    { id: "game", label: "Game", src: "images/activities/game.webp" }
  ];
  const ACT = Object.fromEntries(ACTIVITY_TYPES.map((c) => [c.id, c]));
  const actLabel = (a) => (ACT[a.category] || {}).label || "An activity";
  const ACT_GUESS = [
    ["puzzle", /puzzle|jigsaw|crossword|riddle/], ["movie", /movie|film|screening|cinema|watch/],
    ["performance", /karaoke|talent|perform|skit|play\b|open mic|toast|speech|poem|reading/], ["flowers", /flower|bouquet|garden|arrang|centerpiece|wreath/],
    ["music", /music|playlist|record|vinyl|dance|concert|sing|band/], ["game", /game|cards|trivia|charades|bingo|poker|dominoes|scrabble|pictionary/],
    ["craft", /craft|journal|collage|paint|draw|card making|knit|clay|place card|ornament|make/],
    ["adventure", /walk|hike|explore|scavenger|trip|bike|swim|picnic|tour|outside|adventure/]
  ];
  const guessActivity = (title) => bestGuess(ACT_GUESS, title);
  /** activity card picture: your photo from doing it, otherwise the activity sticker */
  function activityMedia(path, a) {
    const t = ACT[a.category];
    const row = (tag) => '<div class="ph-row"><span class="badge">' + esc(actLabel(a)) + "</span>" + (tag || "") + "</div>";
    if (a.image || !t) return GC.slot(path, a.image, a.tint, "arrow").replace(/<\/div>$/, row() + "</div>");
    return '<div class="ph sticker-ph tint-' + esc(a.tint || "ice") + '"><img class="sticker" src="' + t.src + '" alt="' + esc(t.label) + '">' +
      row(editing ? '<button type="button" class="made-it" data-path="' + esc(path) + '" data-name="' + esc(a.title) + '">Did it? Add your photo</button>' : "") +
      GC.pencil(path, a.title) + "</div>";
  }

  /* ---------- recipe pieces ---------- */
  const RECIPE_FIELDS = [
    { k: "title", label: "Title" },
    { k: "category", label: "Category · picks the sticker on the card", type: "select", opts: [["", "choose one"]].concat(CATEGORIES.map((c) => [c.id, c.label])), preview: CAT, guess: (t) => guessCategory(t), guessFrom: "title", fallback: "side" },
    { k: "note", label: "A note about it", type: "area" },
    { k: "serves", label: "Serves (how many people the recipe makes)", type: "number" },
    { k: "source", label: "Source link · optional", ph: "paste a recipe link" },
    { k: "ingredients", label: "Ingredients · one per line", type: "lines", ph: "2 large eggs\n1/2 cup maple syrup" },
    { k: "steps", label: "Instructions · one step per line", type: "lines", ph: "Write durations and oven temps in the steps, like:\nLet the dough sit at room temperature for 2 hours.\nBake at 375 for 1 hour." }
  ];

  function recipeBody(r, adj) {
    const ing = (r.ingredients || []).length
      ? '<ul class="r-list">' + r.ingredients.map((i) => "<li>" + esc(i) + "</li>").join("") + "</ul>"
      : '<p class="empty">no ingredients yet' + (editing ? " (edit to paste them in)" : "") + "</p>";
    const st = (r.steps || []).length
      ? '<ol class="r-steps">' + r.steps.map((s, i) => {
          const info = (adj && adj[i]) || K.stepInfo(s);
          const tags = [info.known || info.was ? (info.was ? "~" : "") + K.fmtDur(info.minutes) : "", info.passive ? "hands off" : "", info.temp ? info.temp + "°" : ""].filter(Boolean);
          return "<li>" + esc(s) + (tags.length ? ' <span class="tags">' + tags.map((t) => "<i>" + esc(t) + "</i>").join("") + "</span>" : "") + (info.note ? '<em class="adj">' + esc(info.note) + "</em>" : "") + "</li>";
        }).join("") + "</ol>"
      : '<p class="empty">no steps yet</p>';
    return '<div class="r-detail">' +
      (r.image ? '<div class="r-photo" style="background-image:url(\'' + esc(img(r.image)) + '\')"></div>' : CAT[r.category] ? '<img class="r-sticker" src="' + CAT[r.category].src + '" alt="">' : "") +
      (r.note ? '<p class="lede" style="margin:0 0 18px">' + esc(r.note) + "</p>" : "") +
      (r.source ? '<p><a class="arrow-link" href="' + esc(r.source) + '" target="_blank" rel="noopener">open the original ' + icons.ne + "</a></p>" : "") +
      '<h3 class="r-h">ingredients</h3>' + ing + '<h3 class="r-h">the steps</h3>' + st + "</div>";
  }

  /** gatherings where this library recipe was made, with their review */
  function madeFor(libId) {
    const out = [];
    (data.gatherings || []).forEach((g) => (g.recipes || []).forEach((r) => { if (r.fromLibrary === libId) out.push({ g, r }); }));
    return out;
  }

  /* ---------- paste a link → scraped draft → form ---------- */
  function pasteLink({ onSaved, intro }) {
    open(top("The Recipe Box", "paste a link") +
      '<p class="hint">' + esc(intro || "Paste a recipe link and Good Company will pull the title, photo, ingredients and steps. Most recipe sites work. Instagram and some paywalled sites don't share theirs, so for those you can paste the ingredients in by hand.") + "</p>" +
      '<form class="scrape"><div class="field"><label>Recipe link</label><input name="url" type="url" required placeholder="https://"></div>' +
      '<div class="field"><label>What kind of dish? · picks the sticker</label><div class="pick-row"><select name="category"><option value="">we\'ll guess from the recipe</option>' +
      CATEGORIES.map((c) => '<option value="' + c.id + '">' + esc(c.label) + "</option>").join("") + '</select><img class="pick-preview empty" data-for="category" src="" alt=""></div></div>' +
      '<div class="modal-actions"><button class="btn" type="submit">fetch it</button><button class="btn ghost" type="button" data-blank>start blank</button></div>' +
      '<p class="scrape-status hint"></p></form>', (m) => {
      const st = m.querySelector(".scrape-status");
      const sel = m.querySelector("[name=category]"), im = m.querySelector(".pick-preview"), urlIn = m.querySelector("[name=url]");
      const show = () => { const pv = CAT[sel.value]; im.src = pv ? pv.src : ""; im.classList.toggle("empty", !pv); };
      sel.addEventListener("change", () => { sel.dataset.touched = sel.value ? "1" : ""; show(); });
      // guess from the words in the link itself ("…/maple-glazed-turkey…")
      urlIn.addEventListener("input", () => { if (sel.dataset.touched) return; const words = urlIn.value.replace(/^https?:\/\/[^/]+/, "").replace(/[-_/.?=&]+/g, " "); sel.value = guessCategory(words); show(); });
      m.querySelector("[data-blank]").addEventListener("click", () => recipeForm({ category: sel.value || "" }, onSaved, true));
      m.querySelector("form").addEventListener("submit", async (e) => {
        e.preventDefault();
        const url = m.querySelector("[name=url]").value.trim();
        st.textContent = "reading the recipe…"; m.querySelector(".btn").disabled = true;
        try {
          const r = await K.scrapeRecipe(url);
          delete r.image; // the card waits for your own photo from when you make it
          r.category = sel.value || guessCategory(r.title) || guessCategory(url.replace(/[-_/.]+/g, " ")) || "side";
          GC.toast(r.ingredients.length ? "Found " + r.ingredients.length + " ingredients. Look it over, then save." : "Got the page but no ingredient list. Paste those in.");
          recipeForm(r, onSaved, true);
        } catch (err) {
          GC.toast("Couldn't read that page. Fill it in by hand.");
          recipeForm({ source: url, category: sel.value || guessCategory(url.replace(/[-_/.]+/g, " ")) || "side" }, onSaved, true);
        }
      });
    });
  }
  function recipeForm(values, onSave, isNew, onDelete) {
    if (!values.category) values = { ...values, category: guessCategory(values.title) };
    editForm({
      eyebrow: "Good Company", title: "make it yours",
      hint: (isNew ? "Saved recipes go into your Recipe Box. Add them to a gathering from there." : "Changes here only change this copy.") + " The card shows its category sticker until you add a photo from when you made it.",
      fields: RECIPE_FIELDS, values, onSave, onDelete
    });
  }

  /* ---------- type panel ---------- */
  const TYPE = [
    ["Headlines"],
    ["hed-scale", "Size", 0.6, 1.4, 0.02, 1, (v) => Math.round(v * 100) + "%"],
    ["hed-track", "Tracking", -0.06, 0.16, 0.005, 0.01, (v) => v.toFixed(3) + "em"],
    ["hed-lead", "Line spacing", 0.75, 1.5, 0.01, 1.02, (v) => v.toFixed(2)],
    ["eyebrow-gap", "Space above headlines", 0, 60, 1, 20, (v) => v + "px"],
    ["Small labels"],
    ["label-track", "Tracking (labels, menu, tabs)", 0, 0.4, 0.005, 0.18, (v) => v.toFixed(3) + "em"],
    ["Body text"],
    ["body-size", "Size", 13, 21, 0.5, 16, (v) => v + "px"],
    ["body-lead", "Line spacing", 1.1, 2.1, 0.02, 1.5, (v) => v.toFixed(2)],
    ["body-track", "Tracking", -0.03, 0.1, 0.0025, 0, (v) => v.toFixed(3) + "em"]
  ];
  function typePanel() {
    data.site = data.site || {};
    const before = JSON.parse(JSON.stringify(data.site.type || {}));
    const cur = Object.assign({}, before);
    const rows = TYPE.map((r) => {
      if (r.length === 1) return '<div class="type-group">' + esc(r[0]) + "</div>";
      const [k, label, min, max, step, def, f] = r; const v = cur[k] != null ? cur[k] : def;
      return '<div class="type-row"><label for="t-' + k + '">' + esc(label) + '</label><output id="o-' + k + '">' + f(v) + '</output><input id="t-' + k + '" type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" data-k="' + k + '"></div>';
    }).join("");
    open(top("Edit mode", "type & spacing") + '<p class="hint">Drag to adjust. The page updates as you go. Saved settings ship with your content when you export.</p>' + rows +
      '<div class="modal-actions"><button class="btn" data-t="save">save it</button><button class="btn ghost" data-t="cancel">cancel</button><button class="del" data-t="reset">back to defaults</button></div>', (m) => {
      m.addEventListener("input", (e) => {
        const k = e.target.dataset.k; if (!k) return;
        const r = TYPE.find((x) => x[0] === k); cur[k] = +e.target.value;
        m.querySelector("#o-" + k).textContent = r[6](cur[k]); GC.applyType(cur);
      });
      m.addEventListener("click", (e) => {
        const a = e.target.dataset && e.target.dataset.t; if (!a) return;
        if (a === "save") { data.site.type = cur; close(); GC.save("Type saved."); }
        if (a === "cancel") { GC.applyType(before); close(); }
        if (a === "reset") { delete data.site.type; GC.applyType({}); close(); GC.save("Back to the defaults."); }
      });
    });
  }

  window.UI = { typePanel, ACTIVITY_TYPES, actLabel, guessActivity, activityMedia, ACT, CATEGORIES, catLabel, guessCategory, recipeMedia, open, close, top, form, read, editForm, stars, bindStars, recipeBody, madeFor, pasteLink, recipeForm, RECIPE_FIELDS };
})();
