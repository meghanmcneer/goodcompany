/* ==================================================================
   GOOD COMPANY — a gathering (gathering.html?g=<id>)
================================================================== */
(function () {
  const { esc, icons, img, slot, data, editing, save, toast, uid } = GC;
  const K = window.Kitchen;
  const qs = new URLSearchParams(location.search);
  const gIndex = Math.max(0, data.gatherings.findIndex((x) => x.id === qs.get("g")));
  const P = "gatherings." + gIndex; // data path prefix for pencils
  let g = data.gatherings[gIndex];

  const TABS = [["overview", "Overview"], ["itinerary", "Itinerary"], ["kitchen", "Kitchen"], ["recipes", "Recipes"], ["activities", "Activities"], ["market", "Market list"], ["guests", "The Company"], ["scrapbook", "Scrapbook"]];
  if (window.GC_ONLY) { const keep = TABS.filter(([id]) => window.GC_ONLY.includes(id)); TABS.length = 0; keep.forEach((t) => TABS.push(t)); }
  const dayOpts = () => [["", "not scheduled"]].concat(g.days.map((d) => [d.id, d.dow + ", " + d.date]));
  const dayById = (id) => g.days.find((d) => d.id === id);
  const plus = '<span class="plus">+</span>';
  const addBtn = (label, act) => '<button class="btn edit-only" data-add="' + act + '">' + plus + " " + esc(label) + "</button>";
  const two = (n) => String(n).padStart(2, "0");

  /* ---------- meals anchor the cooking ----------
     A meal lives on the itinerary (kind "meal", with a time). Recipes point at a meal
     with recipe.meal; their countdown works backward from that meal's time. */
  const hhmm = (t) => /^\d{1,2}:\d{2}$/.test(t || "");
  function meals() {
    const out = [];
    g.days.forEach((d) => (d.items || []).forEach((m, idx) => {
      if (m.kind !== "meal") return;
      if (!m.id) m.id = GC.slug(m.title) + "-" + uid();
      out.push({ m, day: d, idx, at: hhmm(m.time) ? new Date(d.iso + "T" + m.time.padStart(5, "0") + ":00") : null });
    }));
    return out.sort((a, b) => (a.day.iso + (a.m.time || "99")).localeCompare(b.day.iso + (b.m.time || "99")));
  }
  const mealOf = (r) => meals().find((x) => x.m.id === r.meal) || null;
  const dishesOf = (mealId) => g.recipes.map((r, ri) => ({ r, ri })).filter((x) => x.r.meal === mealId);
  function withServe(r) {
    const ml = mealOf(r); const c = { ...r, scale: K.scaleOf(r) }; delete c.serve;
    if (ml && hhmm(ml.m.time)) c.serve = { day: ml.day.id, time: ml.m.time.padStart(5, "0") };
    return c;
  }
  const cooked = () => g.recipes.map(withServe);
  const mealLabel = (x) => x.day.short + " · " + x.m.title + (x.at ? " (" + K.clock(x.at) + ")" : "");

  /* ---------- derived: the run of show, oven plan ---------- */
  function derived() {
    const byDate = {}; const push = (iso, ev) => (byDate[iso] = byDate[iso] || []).push(ev);
    g.days.forEach((d) => (d.items || []).forEach((it, i) => {
      const at = hhmm(it.time) ? new Date(d.iso + "T" + it.time.padStart(5, "0") + ":00") : null;
      push(d.iso, { at, kind: it.kind || "agenda", text: it.title, time: it.time, dayId: d.id, idx: i, mealId: it.kind === "meal" ? it.id : null });
    }));
    g.activities.forEach((a) => {
      if (!a.day) return; const d = dayById(a.day); if (!d) return;
      push(d.iso, { at: null, kind: "activity", text: a.title, activity: a.id });
    });
    Object.values(byDate).forEach((list) => list.sort((a, b) => (a.at ? a.at.getTime() : 9e15) - (b.at ? b.at.getTime() : 9e15)));
    return { byDate, oven: K.ovenPlan(cooked(), g.days) };
  }

  /* ---------- shell ---------- */
  function shell() {
    document.title = g.title + " · Good Company";
    document.querySelector("#crumbs").innerHTML =
      '<div class="wrap"><div class="crumbs"><a href="plan.html#gatherings">gatherings</a><span class="sep">/</span><strong>' + esc(g.title) + "</strong></div>" +
      '<span class="saved">' + (editing ? "editing in this browser" : "all changes saved") + "</span>" +
      '<button class="btn ghost" id="share">' + icons.share + " share plan</button>" +
      '<div class="avatars">' + g.guests.slice(0, 4).map((p) => { const pr = p.profileId && window.Auth ? Auth.all().find((x) => x.id === p.profileId) : null; return window.Auth ? Auth.avatar(pr || p, "sm stack") : ""; }).join("") + '<a class="avatar plus" href="#guests">+</a></div></div>';
    document.querySelector("#tabs").innerHTML = '<div class="wrap">' + TABS.map(([id, l]) => '<a class="tab" href="#' + id + '" data-tab="' + id + '">' + l + "</a>").join("") + "</div>";
    document.querySelector("#share").addEventListener("click", () => {
      const u = new URL(location.href); u.searchParams.delete("edit"); u.searchParams.set("g", g.id); u.hash = ""; const url = u.toString();
      (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => toast("Link copied. Anyone with it can see the plan."), () => toast(url));
    });
  }

  const scaledIngredients = (r) => (r.ingredients || []).map((l) => K.scaleLine(l, K.scaleOf(r)));
  const peopleCount = () => Math.max(g.guests.length, +g.people || 0);

  /* ---------- hero line: anyone can rewrite it ----------
     In edit mode it changes the plan itself (and ships with "export for GitHub").
     Otherwise it's saved on this device, until shared profiles exist. */
  const CAP_KEY = "gc-caption-" + g.id;
  function heroCaption() {
    if (editing) return g.heroCaption || "";
    const mine = localStorage.getItem(CAP_KEY);
    return mine != null ? mine : g.heroCaption || "";
  }

  /* ---------- OVERVIEW ---------- */
  function overview(D) {
    const feat = g.days.find((d) => d.feature) || g.days[0];
    const featRecipes = g.recipes.filter((r) => { const ml = mealOf(r); return ml && ml.day.id === feat.id; }).slice(0, 2);
    const shown = featRecipes.length ? featRecipes : g.recipes.slice(0, 2);
    const market = marketData();
    const counts = (d) => (D.byDate[d.iso] || []).length;
    return '<div class="wrap">' +
      '<section class="g-hero" style="background-image:url(\'' + esc(img(g.heroImage)) + '\')">' + GC.pencil(P + ".heroImage", "hero") +
      '<div class="g-hero-inner"><p class="eyebrow">Gathering No. ' + esc(g.number) + ' <i class=ast></i></p>' +
      '<h1 class="hed">' + esc(g.title) + "</h1>" + icons.swoosh +
      '<div class="facts"><span>' + esc(g.dates) + '</span><span class="dot">·</span><span>' + esc(g.people) + ' people</span><span class="dot">·</span><span>' + esc(g.status) + "</span></div></div>" +
      '<div class="caption" contenteditable="plaintext-only" spellcheck="false" data-caption data-ph="write a line about it" title="click to change">' + esc(heroCaption()) + "</div></section>" +

      '<div class="glance"><div class="glance-title"><p class="eyebrow">The plan at a glance</p><h2 class="hed">' + g.days.length + (g.days.length === 1 ? " day, " : " days, ") + '<em>' + field(P + ".glanceLine", g.glanceLine == null ? "one good idea." : g.glanceLine, "one good idea.") + "</em></h2>" +
      '<div class="day-tiles">' + g.days.map((d) => '<a class="day-tile' + (d.feature ? " feature" : "") + '" href="#itinerary" data-jump="day-' + d.id + '"><span class="count">' + counts(d) + '</span><div class="dow">' + esc(d.short.toUpperCase()) + '</div><div class="num">' + esc(d.num) + "</div><div>" + esc(d.label) + "</div></a>").join("") + "</div></div>" +
      '<div><div class="sticky-scrawl">save room for dessert ↘</div><div class="sticky"><span class="tape"></span><h3 class="hed">the big picture</h3><ul class="checklist">' +
      g.bigPicture.map((b, i) => '<li class="big-item' + (b.done ? " done" : "") + '"><button class="check' + (b.done ? " on" : "") + '" data-big="' + i + '" aria-label="check off"></button>' + field(P + ".bigPicture." + i + ".text", b.text, "something to do") + '<button type="button" class="big-x" data-big-remove="' + i + '" aria-label="remove">×</button></li>').join("") +
      '</ul><button type="button" class="text-btn big-add" data-big-add>+ add to the big picture</button></div></div></div>' +

      kitchenTeaser(D) +

      '<div class="trio">' +
      '<div class="box"><div class="box-head"><div><p class="eyebrow">The next few days</p><h3 class="hed">the itinerary</h3></div><a class="arrow-link" href="#itinerary">see all ' + icons.ne + '</a></div><div class="mini-days">' +
      g.days.map((d) => '<a href="#itinerary" data-jump="day-' + d.id + '" class="' + (d.feature ? "feature" : "") + '"><span class="d"><small>' + esc(d.short) + "</small><b>" + esc(d.num) + '</b></span><span class="t"><b>' + esc(d.title) + "</b><span>" + esc(d.note) + '</span></span><span class="ne">' + icons.ne + "</span></a>").join("") + "</div></div>" +
      '<div class="box"><div class="box-head"><div><p class="eyebrow">' + esc(feat.dow + ", " + feat.date) + '</p><h3 class="hed">the recipes</h3></div><a class="arrow-link" href="#recipes">all recipes ' + icons.ne + '</a></div>' + (g.recipes.length ? "" : emptyRecipes(false)) + '<div class="mini-recipes">' +
      shown.map((r) => { const ri = g.recipes.indexOf(r); return '<div class="mini-recipe" data-recipe="' + ri + '"><div class="ph-wrap" style="position:relative;aspect-ratio:4/3">' + UI.recipeMedia(P + ".recipes." + ri + ".image", r) + '</div><p class="eyebrow orange" style="margin-top:12px">' + esc(UI.catLabel(r)) + '</p><h4 class="hed">' + esc(r.title) + "</h4>" +
        ((r.ingredients || []).length ? "<ul>" + scaledIngredients(r).slice(0, 3).map((i) => '<li><span class="check"></span>' + esc(i) + "</li>").join("") + "</ul>" : "") +
        (mealOf(r) ? '<p class="serve-note">for ' + esc(mealOf(r).m.title) + "</p>" : "") + "</div>"; }).join("") + "</div></div>" +
      '<div class="box ice"><div class="box-head"><div><p class="eyebrow ice">The shared shop</p><h3 class="hed">market list</h3></div><a class="arrow-link" href="#market">open list ' + icons.ne + '</a></div><ul class="checklist market-mini">' +
      market.all.slice(0, 6).map((m) => '<li><button class="check' + (market.checks[m.key] ? " on" : "") + '" data-check="' + esc(m.key) + '"></button>' + esc((m.amount ? m.amount + " " : "") + m.name) + "</li>").join("") +
      '</ul><p style="margin-top:14px"><a class="arrow-link" href="#market" style="color:var(--ice-deep)">+ ' + Math.max(0, market.all.length - 6) + " more on the list</a></p></div></div>" +

      '<div class="activity-band"><div><p class="eyebrow">Something between courses</p><h3 class="hed">The activities</h3><p style="color:var(--muted)">Little plans make the best stories. Save the supplies, then drop an activity into a day when it feels right.</p><a class="arrow-link" href="#activities">look inside ' + icons.ne + "</a></div>" +
      g.activities.slice(0, 2).map((a) => '<div class="idea-card"><p class="eyebrow orange"><i class=ast></i> ' + esc(a.category ? UI.actLabel(a) : "A good idea") + '</p><h4 class="hed">' + esc(a.title) + "</h4><small>" + a.supplies.length + " supplies · " + (a.day ? "on " + esc(dayById(a.day).short) : "add to a day") + "</small></div>").join("") + "</div></div>";
  }

  function kitchenTeaser(D) {
    const ms = meals().filter((x) => dishesOf(x.m.id).length);
    if (!ms.length) return "";
    const first = cooked().map((r) => K.timeline(r, g.days)).filter(Boolean).flatMap((t) => t.events).filter((e) => e.kind !== "serve").sort((a, b) => a.at - b.at)[0];
    return '<a class="kitchen-teaser" href="#kitchen"><span class="oven-icon">♨</span><span><p class="eyebrow orange">The kitchen</p><b>' +
      ms.length + (ms.length === 1 ? " meal" : " meals") + " · " + g.recipes.filter((r) => r.meal).length + " dishes" + (first ? " · first step " + esc(first.at.toLocaleDateString(undefined, { weekday: "short" })) + " " + esc(K.clock(first.at)) : "") +
      (D.oven.clashes.length ? ' · <span class="warn">' + D.oven.clashes.length + " oven conflict" + (D.oven.clashes.length > 1 ? "s" : "") + "</span>" : "") + '</b></span><span class="ne">' + icons.ne + "</span></a>";
  }

  /* ---------- ITINERARY: the run of show ---------- */
  const KIND = { agenda: ["On the agenda", "ice"], travel: ["Travel", "ice"], meal: ["A meal", "orange"], table: ["At the table", "orange"], activity: ["An activity", "orange"] };
  function runRow(e) {
    const [label, tone] = KIND[e.kind] || KIND.agenda;
    const time = e.at ? K.clock(e.at) : e.kind === "activity" ? "anytime" : "TBD";
    let sub = "";
    if (e.kind === "meal") {
      const ds = dishesOf(e.mealId);
      const tl = cooked().filter((r) => r.meal === e.mealId).map((r) => K.timeline(r, g.days)).filter(Boolean).flatMap((t) => t.events).filter((x) => x.kind !== "serve").sort((a, b) => a.at - b.at);
      sub = '<p class="run-sub">' + (ds.length ? esc(ds.length + (ds.length === 1 ? " dish: " : " dishes: ") + ds.map((x) => x.r.title.toLowerCase()).join(", ")) : "no dishes yet") + "</p>" +
        (tl.length ? '<a class="run-link" href="#kitchen" data-jump="meal-' + esc(e.mealId) + '">kitchen starts ' + esc(tl[0].at.toLocaleDateString(undefined, { weekday: "short" })) + " " + esc(K.clock(tl[0].at)) + " " + icons.ne + "</a>"
          : ds.length && !e.at ? '<span class="run-link muted">give this meal a time to build the kitchen countdown</span>' : "");
    }
    const attrs = e.idx != null ? ' data-agenda="' + e.dayId + ":" + e.idx + '"' : e.activity ? ' data-activity-id="' + esc(e.activity) + '"' : "";
    const x = e.idx != null ? '<button type="button" class="row-x" data-remove-item="' + e.dayId + ":" + e.idx + '" title="remove">×</button>' : e.activity ? '<button type="button" class="row-x" data-unschedule="' + esc(e.activity) + '" title="take off this day">×</button>' : "";
    return '<div class="run-row tone-' + tone + " k-" + e.kind + (e.idx != null ? " editable" : "") + '"' + attrs + '><div class="run-time">' + esc(time) + '</div><div class="run-body"><p class="eyebrow">' + esc(label) + '</p><h4 class="hed">' + esc(e.text) + "</h4>" + sub + "</div>" + x + "</div>";
  }
  function itinerary(D) {
    return '<div class="wrap"><div class="page-head"><div><p class="eyebrow">' + esc(g.place) + ' <span style="color:var(--neon)">·</span> ' + esc(g.datesLong) + '</p><h1 class="hed">' + esc(g.title) + '</h1><p class="lede">' + esc(g.subtitle) + "</p></div>" +
      '<button class="btn ghost edit-only" data-add="gathering">edit gathering</button></div>' +
      '<div class="page-head" style="border-top:1px solid var(--line);padding-top:36px"><div><p class="eyebrow">' + g.days.length + ' days, loosely held</p><h2 style="font-size:40px;font-weight:400;margin:0">The Itinerary</h2>' +
      '<p class="lede" style="font-size:16px">The run of show: arrivals, meals, plans. The cooking lives in <a href="#kitchen">the Kitchen</a>.</p></div>' + addBtn("add to the plan", "agenda") + "</div>" +
      '<div class="run"><button type="button" class="add-day" data-add-day="before">+ add a day before</button>' + g.days.map((d, i) => {
        const list = D.byDate[d.iso] || [];
        return '<section class="run-day' + (d.feature ? " feature" : "") + '" id="day-' + d.id + '"><header class="run-day-head"><span class="pin">' + two(i + 1) + '</span><div><p class="eyebrow">' + esc(d.dow) + '</p><h3 class="hed">' + esc(d.date) + "</h3></div>" + (d.note ? '<span class="note">' + esc(d.note) + "</span>" : "") + '<button type="button" class="day-x" data-remove-day="' + esc(d.id) + '" title="remove this day">×</button></header>' +
          (list.length ? list.map(runRow).join("") : '<p class="empty">nothing planned, which is also a plan</p>') +
          '<button type="button" class="add-to-day" data-add-to-day="' + esc(d.id) + '">+ add to ' + esc(d.dow) + "</button></section>";
      }).join("") + '<button type="button" class="add-day" data-add-day="after">+ add a day after</button></div></div>';
  }

  /* ---------- days: add before/after, remove; keep the date labels in sync ---------- */
  function dayFrom(d, idx) {
    return { id: "d" + uid(), iso: d.toISOString().slice(0, 10), dow: d.toLocaleDateString("en-US", { weekday: "long" }), short: d.toLocaleDateString("en-US", { weekday: "short" }),
      date: d.toLocaleDateString("en-US", { month: "long", day: "numeric" }), num: String(d.getDate()), title: "Day " + (idx + 1), label: "", note: "", items: [] };
  }
  function syncDates() {
    if (!g.days.length) return;
    const s = new Date(g.days[0].iso + "T12:00:00"), e = new Date(g.days[g.days.length - 1].iso + "T12:00:00");
    const md = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), long = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    const one = g.days.length === 1;
    g.dates = one ? md(s) + ", " + e.getFullYear() : md(s) + " — " + md(e) + ", " + e.getFullYear();
    g.datesLong = one ? long(s) + ", " + e.getFullYear() : long(s) + " — " + long(e) + ", " + e.getFullYear();
  }
  function addDay(where) {
    const ref = where === "before" ? g.days[0] : g.days[g.days.length - 1];
    const d = new Date(ref.iso + "T12:00:00"); d.setDate(d.getDate() + (where === "before" ? -1 : 1));
    const nd = dayFrom(d, g.days.length);
    if (where === "before") g.days.unshift(nd); else g.days.push(nd);
    syncDates(); save(nd.dow + ", " + nd.date + " added.");
    setTimeout(() => { const el = document.getElementById("day-" + nd.id); if (el) el.scrollIntoView({ behavior: "smooth", block: "center" }); }, 80);
  }
  function removeDay(id) {
    if (g.days.length === 1) return toast("A gathering needs at least one day.");
    const i = g.days.findIndex((d) => d.id === id); const d = g.days[i];
    const busy = (d.items || []).length + g.activities.filter((a) => a.day === id).length;
    if (!confirm("Remove " + d.dow + ", " + d.date + (busy ? "? Its " + busy + " plan" + (busy > 1 ? "s" : "") + " go with it." : "?"))) return;
    (d.items || []).forEach((it) => { if (it.kind === "meal" && it.id) g.recipes.forEach((r) => { if (r.meal === it.id) r.meal = ""; }); });
    g.activities.forEach((a) => { if (a.day === id) delete a.day; });
    g.days.splice(i, 1); syncDates(); save("Day removed.");
  }
  function removeGathering() {
    if (!confirm("Delete " + g.title + " entirely? Its itinerary, recipes, activities, people and photos go with it. Recipes and ideas stay in the Recipe Box and Activity Ideas.")) return;
    GC.onChange = () => {}; // nothing left to draw here
    data.gatherings.splice(gIndex, 1); save();
    location.href = "plan.html#gatherings";
  }

  /* ---------- KITCHEN: one countdown per meal ---------- */
  function kitchen(D) {
    const ms = meals(); const C = cooked();
    const oven = D.oven.clashes.length
      ? '<details class="oven-note"><summary><span class="oven-icon">♨</span><span><b>' + D.oven.clashes.length + " oven conflict" + (D.oven.clashes.length > 1 ? "s" : "") + "</b> · " +
        D.oven.clashes.map((c) => esc(c.from.toLocaleDateString(undefined, { weekday: "short" }) + " " + K.clock(c.from) + "–" + K.clock(c.to) + ": " + c.a.recipe.toLowerCase() + " (" + c.a.temp + "°) + " + c.b.recipe.toLowerCase() + " (" + c.b.temp + "°)")).join("; ") +
        '</span><span class="caret">see fixes ▾</span></summary>' +
        D.oven.clashes.map((c) => "<ol>" + c.ideas.map((i) => "<li>" + esc(i) + "</li>").join("") + "</ol>").join("") + "</details>"
      : "";
    const mealBlock = (x) => {
      const ds = dishesOf(x.m.id);
      const events = C.filter((r) => r.meal === x.m.id).map((r) => K.timeline(r, g.days)).filter(Boolean).flatMap((t) => t.events).filter((e) => e.kind !== "serve").sort((a, b) => a.at - b.at);
      let lastDay = "";
      const rows = events.map((e) => {
        const day = e.at.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
        const head = day !== lastDay ? '<li class="k-day">' + esc(day) + "</li>" : ""; lastDay = day;
        const meta = [e.recipe ? "for the " + e.recipe.toLowerCase() : "", e.dur, e.temp ? e.temp + "°" : "", e.note].filter(Boolean).join(" · ");
        return head + '<li class="k-row k-' + e.kind + '"><b>' + esc(K.clock(e.at)) + "</b><span>" + (e.kind === "flag" ? "⚑ " : "") + esc(e.kind === "start" ? e.text.replace(/^start the /, "start: ") : e.text) + (meta && e.kind !== "start" ? "<small>" + esc(meta) + "</small>" : "") + "</span></li>";
      }).join("");
      return '<section class="k-meal" id="meal-' + esc(x.m.id) + '"><div class="k-meal-head"><div><p class="eyebrow orange">' + esc(x.day.dow + ", " + x.day.date) + (x.at ? " · " + esc(K.clock(x.at)) : " · time TBD") + '</p><h2 class="hed">' + esc(x.m.title) + "</h2>" +
        '<div class="dish-chips">' + ds.map((d) => '<button type="button" data-recipe="' + d.ri + '">' + esc(d.r.title) + "</button>").join("") + (ds.length ? "" : '<span class="empty" style="padding:0">no dishes yet</span>') + "</div></div>" +
        '<button class="btn ghost edit-only" data-dishes="' + esc(x.m.id) + '">' + plus + " dishes</button></div>" +
        (rows ? '<ol class="k-list">' + rows + '<li class="k-row k-serve"><b>' + esc(x.at ? K.clock(x.at) : "") + "</b><span>" + esc(x.m.title.toLowerCase()) + ", on the table</span></li></ol>"
          : '<p class="empty">' + (ds.length && !x.at ? "Give this meal a time on the itinerary and the countdown builds itself." : ds.length ? "These dishes have no steps yet." : "Add dishes to this meal to build its countdown.") + "</p>") + "</section>";
    };
    const loose = g.recipes.map((r, ri) => ({ r, ri })).filter((x) => !mealOf(x.r));
    return '<div class="wrap"><div class="page-head"><div><p class="eyebrow">For whoever is cooking</p><h1 class="hed">The kitchen</h1><p class="lede">Every meal, counted backward from when it hits the table: when to start, what to take out of the fridge, and when the oven is busy.</p></div>' + addBtn("add a meal", "meal") + "</div>" +
      oven + (ms.length ? ms.map(mealBlock).join("") : '<p class="empty">No meals yet. Add one to the itinerary, then give it dishes.</p>') +
      (loose.length ? '<div class="k-loose"><p class="eyebrow">Not on a menu yet</p><div class="dish-chips">' + loose.map((x) => '<button type="button" data-recipe="' + x.ri + '">' + esc(x.r.title) + "</button>").join("") + "</div><small>Open one to choose its meal.</small></div>" : "") + "</div>";
  }

  /* ---------- nothing cooking yet ---------- */
  function emptyRecipes(big) {
    const pick = ["soup", "bread", "dessert"].map((id) => UI.CATEGORIES.find((c) => c.id === id)).filter(Boolean);
    return '<div class="empty-cook' + (big ? " big" : "") + '"><div class="empty-stickers">' + pick.map((c, i) => '<img src="' + c.src + '" alt="" style="--r:' + [-8, 4, 10][i] + 'deg">').join("") + "</div>" +
      '<p class="hed">nothing cooking yet</p><p>Add some recipes to start cooking. They fill in the market list and the kitchen countdown on their own.</p>' +
      (editing ? '<button type="button" class="btn" data-add="recipe">' + plus + " add recipes</button>" : big ? '<a class="arrow-link" href="recipes.html">browse the recipe box ' + icons.ne + "</a>" : '<a class="arrow-link" href="#recipes">add recipes ' + icons.ne + "</a>") + "</div>";
  }

  /* ---------- RECIPE BOX (this gathering's copies) ---------- */
  function recipeCard(r, ri) {
    const meta = [(r.ingredients || []).length + " ingredients", (r.steps || []).length + " steps"];
    return '<article class="card editable" data-recipe="' + ri + '" data-search="' + esc((r.title + " " + r.note + " " + (r.ingredients || []).join(" ")).toLowerCase()) + '">' +
      '<div class="media">' + UI.recipeMedia(P + ".recipes." + ri + ".image", r) + "</div>" +
      '<div class="body">' + (r.source ? '<a class="src" href="' + esc(r.source) + '" target="_blank" rel="noopener">' + esc(GC.host(r.source)) + " " + icons.ext + "</a>" : '<span class="src">a good company original</span>') +
      '<h3 class="hed">' + esc(r.title) + "</h3><p>" + esc(r.note) + "</p>" +
      '<div class="foot">' + meta.map((m) => "<span>" + m + "</span>").join("") +
      (r.review && r.review.rating ? UI.stars(r.review.rating) : "") +
      (K.scaleOf(r) !== 1 ? '<span class="serve-chip ice">for ' + esc(r.cookingFor) + "</span>" : "") +
      (mealOf(r) ? '<span class="serve-chip">' + esc(mealOf(r).day.short + " · " + mealOf(r).m.title) + "</span>" : "") +
      "</div></div></article>";
  }
  function recipes() {
    return '<div class="wrap"><div class="page-head"><div><p class="eyebrow">Something to pass around</p><h1 class="hed">Recipes</h1>' +
      '<p class="lede">The recipes for ' + esc(g.title) + '. Each one is a copy from <a href="recipes.html">your main Recipe Box</a>, so you can tweak it, rate it, and leave notes on how it went.</p></div>' + addBtn("add a recipe", "recipe") + "</div>" +
      '<div class="toolbar"><label class="search">' + icons.search + '<input placeholder="search the recipes" data-filter="recipes"></label><span class="count-note">' + g.recipes.length + (g.recipes.length === 1 ? " recipe" : " recipes") + "</span></div>" +
      (g.recipes.length ? '<div class="cards" id="recipe-cards">' + g.recipes.map(recipeCard).join("") + "</div>" : emptyRecipes(true)) + "</div>";
  }

  /* ---------- ACTIVITY BOOK ---------- */
  function activities() {
    return '<div class="wrap"><div class="page-head"><div><p class="eyebrow">Things to do between courses</p><h1 class="hed">Activities</h1><p class="lede">The activities for this gathering, copied from <a href="ideas.html">Activity Ideas</a>. Give each one a day and it shows up on the itinerary.</p></div>' + addBtn("add an activity", "activity") + "</div>" +
      '<div class="toolbar"><label class="search">' + icons.search + '<input placeholder="search the activities" data-filter="activities"></label><span class="count-note">' + g.activities.length + " ideas</span></div>" +
      '<div class="cards">' + g.activities.map((a, i) => '<article class="card editable" data-activity="' + i + '" data-search="' + esc((a.title + " " + a.note).toLowerCase()) + '"><div class="media">' + UI.activityMedia(P + ".activities." + i + ".image", a) + "</div>" +
        '<div class="body">' + (a.source ? '<a class="src" href="' + esc(a.source) + '" target="_blank" rel="noopener">' + esc(GC.host(a.source)) + " " + icons.ext + "</a>" : '<span class="src">A good company original</span>') + '<h3 class="hed">' + esc(a.title) + "</h3><p>" + esc(a.note) + '</p><div class="foot"><span>' + a.supplies.length + " supplies</span><span>" + a.steps.length + " steps</span>" + (a.day ? '<span class="serve-chip">' + esc(dayById(a.day).short) + "</span>" : "") + "</div></div></article>").join("") + "</div></div>";
  }

  /* ---------- SCRAPBOOK: photos from the gathering itself ---------- */
  function scrapbook() {
    g.photos = g.photos || [];
    const tilt = (i) => [-2.2, 1.6, -1, 2.4, -1.8, 0.8][i % 6];
    return '<div class="wrap"><div class="page-head"><div><p class="eyebrow">The good parts, kept</p><h1 class="hed">The scrapbook</h1><p class="lede">Photos from ' + esc(g.title) + ". The table before anyone sat down, the mess after, and everything in between.</p></div>" +
      (editing ? '<button class="btn" data-add-photos>' + plus + " add photos</button>" : "") + "</div>" +
      (g.photos.length
        ? '<div class="snaps">' + g.photos.map((ph, i) => '<figure class="snap" style="--r:' + tilt(i) + 'deg"><div class="snap-img" style="background-image:url(\'' + esc(img(ph.image)) + '\')"></div>' +
            "<figcaption>" + (editing ? '<span class="inline-edit" contenteditable="plaintext-only" spellcheck="false" data-field="' + esc(P + ".photos." + i + ".caption") + '" data-ph="add a caption">' + esc(ph.caption || "") + "</span>" : esc(ph.caption || "")) + "</figcaption>" +
            (editing ? '<button type="button" class="snap-x" data-photo-remove="' + i + '" aria-label="remove photo">×</button>' : "") + "</figure>").join("") +
          (editing ? '<button type="button" class="snap snap-add" data-add-photos><span>+</span>add more</button>' : "") + "</div>"
        : '<div class="snaps-empty"><p class="hed">nothing here yet</p><p>After the gathering, add the good ones here.' + "</p>" + (editing ? '<button class="btn" data-add-photos>' + plus + " add photos from the day</button>" : '<button class="btn" data-start-edit>' + plus + " add photos from the day</button>") + "</div>") +
      "</div>";
  }
  async function addPhotos() {
    const paths = await GC.pickImages(g.id + "-photo"); if (!paths.length) return;
    g.photos = g.photos || [];
    paths.forEach((p) => g.photos.push({ id: uid(), image: p, caption: "" }));
    save(paths.length === 1 ? "Photo added." : paths.length + " photos added.");
  }

  /* ---------- MARKET LIST ---------- */
  const CHECK_KEY = "gc-checks-" + g.id;
  const getChecks = () => { try { return JSON.parse(localStorage.getItem(CHECK_KEY) || "{}"); } catch (e) { return {}; } };
  function marketData() {
    const checks = getChecks();
    // the amount is part of the key, so a ticked item comes back if a recipe changes how much you need
    const fromRecipes = K.combine(g.recipes.map((r) => ({ title: r.title, ingredients: scaledIngredients(r) }))).map((m) => ({ ...m, key: "r:" + m.key + "@" + m.amount }));
    const supplies = K.combine(g.activities.filter((a) => a.day).map((a) => ({ title: a.title, ingredients: a.supplies }))).map((m) => ({ ...m, key: "a:" + m.key + "@" + m.amount }));
    const manual = (sec) => g.market.map((m, i) => ({ ...m, i })).filter((m) => (m.section || "rest") === sec).map((m) => ({ key: "m:" + m.id, name: m.name, amount: "", qty: m.qty, i: m.i, manual: true }));
    const table = manual("table"), rest = manual("rest");
    const all = [...fromRecipes, ...supplies, ...table, ...rest];
    return { checks, fromRecipes, supplies, table, rest, all };
  }
  function market() {
    const M = marketData();
    const left = M.all.filter((m) => !M.checks[m.key]).length;
    const li = (m) => '<li class="' + (M.checks[m.key] ? "done" : "") + (m.manual ? " editable" : "") + '"' + (m.manual ? ' data-market="' + m.i + '"' : "") + '><button class="check' + (M.checks[m.key] ? " on" : "") + '" data-check="' + esc(m.key) + '" aria-label="got it"></button><div><b>' +
      (m.amount ? '<span class="amt">' + esc(m.amount) + "</span> " : "") + esc(m.name) + "</b>" +
      "<small>" + esc(m.manual ? m.qty || "" : "for the " + m.from.map((f) => f.toLowerCase().replace(/^the /, "")).join(" + ")) + (m.loose && m.amount ? " · plus some to taste" : "") + "</small></div></li>";
    const group = (title, list) => '<div class="m-group"><h3>' + esc(title) + " <span>" + two(list.length) + "</span></h3><ul>" + (list.length ? list.map(li).join("") : '<li class="empty">nothing added here yet</li>') + "</ul></div>";
    return '<div class="wrap"><div class="page-head"><div><p class="eyebrow">One list, all the good ideas</p><h1 class="hed">The market list</h1><p class="lede">Every recipe in this gathering adds its ingredients here, and matching ones add up (2 eggs + 1 egg = 3 eggs). Scheduled activities add their supplies. Add the candles, tape, and other little things by hand.</p></div>' + addBtn("add an item", "market") + "</div>" +
      '<div class="tally"><span class="big">' + two(left) + '</span><p class="eyebrow">Things left to find</p><span class="why">' + icons.bag + " Built from your recipes, activities, and table plans. Check-offs save on this device.</span></div>" +
      '<div class="market-cols">' + group("From the recipe box", M.fromRecipes) + group("Activity supplies", M.supplies) + group("The table & extras", M.table) + group("The rest", M.rest) + "</div></div>";
  }

  /* ---------- THE COMPANY ---------- */
  // in edit mode every field is typed into directly; elsewhere it reads as plain text
  function field(path, value, ph, cls) {
    const v = value || "";
    if (!editing) return v ? '<span class="' + (cls || "") + '">' + esc(v) + "</span>" : "";
    return '<span class="inline-edit ' + (cls || "") + '" contenteditable="plaintext-only" spellcheck="false" data-field="' + esc(path) + '" data-ph="' + esc(ph) + '">' + esc(v) + "</span>";
  }
  function guests() {
    const A = window.Auth; const me = A && A.me();
    const prof = (p) => (p.profileId && A ? A.all().find((x) => x.id === p.profileId) : null);
    return '<div class="wrap"><div class="page-head"><div><p class="eyebrow">The people who make the plan</p><h1 class="hed">The company</h1><p class="lede">Everyone at the table and their piece of the gathering: a dish, a playlist, a grocery run, or simply the first toast.' +
      (editing ? " Search for friends below to add them." : "") + "</p></div></div>" +
      '<div class="note-band"><div class="seal">You<br>belong<br>here</div><div><p class="eyebrow">A note on assignments</p><h2 class="hed">Good plans have many hands.</h2><p>Assignments are a starting point, not a contract. Edit them, trade them, or show up with surprise flowers.</p></div></div>' +
      g.guests.map((p, i) => {
        const base = P + ".guests." + i + ".";
        const pr = prof(p);
        const name = pr ? pr.name : p.name;
        const face = pr ? A.avatar(pr, "lg") :
          '<div class="face ' + esc(p.color || "tan") + '">' + (p.photo ? '<div class="ph has-img" style="background-image:url(\'' + esc(img(p.photo)) + '\')"></div>' : esc((p.name || "?")[0])) + GC.pencil(P + ".guests." + i + ".photo", p.name) + "</div>";
        const facts = [];
        if (pr && pr.favorites) facts.push('<div class="fact wide"><p class="eyebrow">Favorite things</p><span>' + esc(pr.favorites) + "</span></div>");
        if (pr) facts.push('<div class="fact"><p class="eyebrow">Allergies</p><span class="' + (/^(none|no|n\/a)?$/i.test((pr.allergies || "").trim()) ? "" : "allergy") + '">' + esc(pr.allergies || "none listed") + "</span></div>");
        else if (editing || p.dietary) facts.push('<div class="fact"><p class="eyebrow">Food notes</p>' + field(base + "dietary", p.dietary, "no cilantro, loves pie") + "</div>");
        if (editing || p.arriving) facts.push('<div class="fact"><p class="eyebrow">Arriving</p>' + field(base + "arriving", p.arriving, "train Wed 12:50") + "</div>");
        return '<div class="guest person' + (pr ? " linked" : "") + '" data-guest="' + i + '"><div class="face-wrap">' + face + "</div>" +
          '<div><p class="eyebrow">' + esc(pr ? A.archLabel(pr.archetype) : "In the company") + (pr && me && pr.id === me.id ? " · you" : "") + '</p><h3 class="hed">' + (editing && !pr ? field(base + "name", p.name, "name") : esc(name)) + "</h3>" + field(base + "bringing", p.bringing, "a little note", "note") + "</div>" +
          '<div class="doing-col"><p class="eyebrow">Bringing / doing</p><div class="doing">' + field(base + "doing", p.doing, "host, dessert, the playlist...") + "</div>" + (facts.length ? '<div class="facts-row">' + facts.join("") + "</div>" : "") + "</div>" +
          '<button class="more edit-only" type="button" data-guest-remove="' + i + '" title="remove from this gathering">×</button></div>';
      }).join("") +
      (editing
        ? '<div class="find-friends"><p class="eyebrow">Add from your friends</p><label class="search">' + icons.search + '<input data-friend-search placeholder="search by name or archetype" autocomplete="off"></label>' +
          '<div class="friend-results">' + friendResults("") + '</div><button type="button" class="text-btn" data-new-person>+ add someone without a profile</button></div>'
        : "") + "</div>";
  }
  function friendResults(q) {
    const A = window.Auth; if (!A) return "";
    const me = A.me(); const added = new Set(g.guests.map((x) => x.profileId).filter(Boolean));
    const list = A.search(q);
    if (!list.length) return '<p class="empty">No one by that name yet. Friends show up here once they make a profile.</p>';
    return list.map((p) => '<div class="friend">' + A.avatar(p, "md") + '<div><b>' + esc(p.name) + (me && p.id === me.id ? " (you)" : "") + "</b><small>" + esc(A.archLabel(p.archetype)) + "" + "</small></div>" +
      (added.has(p.id) ? '<span class="count-note">in the company</span>' : '<button type="button" class="btn ghost" data-add-friend="' + esc(p.id) + '">add</button>') + "</div>").join("");
  }
  function addFriend(id) {
    const p = Auth.all().find((x) => x.id === id); if (!p) return;
    const same = g.guests.find((x) => !x.profileId && (x.name || "").trim().toLowerCase() === p.name.trim().toLowerCase());
    if (same) { same.profileId = p.id; same.name = p.name; return save(p.name + " is linked to their profile."); }
    g.guests.push({ id: uid(), profileId: p.id, name: p.name, doing: "", bringing: "", color: p.color || "tan" });
    if ((+g.people || 0) < g.guests.length) g.people = g.guests.length;
    save(p.name + " is in the company.");
  }
  function newPerson() {
    const colors = ["tan", "ice", "orange"];
    g.guests.push({ id: uid(), name: "", doing: "", bringing: "", color: colors[g.guests.length % 3] });
    if ((+g.people || 0) < g.guests.length) g.people = g.guests.length;
    save("Seat saved. Type their name.");
    setTimeout(() => {
      const f = document.querySelectorAll('#panel-guests [data-field$=".name"]'); const el = f[f.length - 1];
      if (el) { el.scrollIntoView({ block: "center", behavior: "smooth" }); el.focus(); }
    }, 60);
  }

  /* ---------- render ---------- */
  function render() {
    g = GC.data.gatherings[gIndex];
    // older drafts gave each recipe its own serve time: fold those into meals
    g.recipes.forEach((r) => {
      if (!r.serve || r.meal) return;
      const d = dayById(r.serve.day); if (!d) { delete r.serve; return; }
      d.items = d.items || [];
      let m = d.items.find((it) => it.kind === "meal" && (it.time || "").padStart(5, "0") === r.serve.time.padStart(5, "0"));
      if (!m) { const h = +r.serve.time.split(":")[0]; m = { kind: "meal", id: "meal-" + uid(), title: h < 11 ? "Breakfast" : h < 15 ? "Lunch" : "Dinner", time: r.serve.time }; d.items.push(m); }
      r.meal = m.id; delete r.serve;
    });
    const D = derived();
    const html = { overview: overview(D), itinerary: itinerary(D), kitchen: kitchen(D), recipes: recipes(), activities: activities(), scrapbook: scrapbook(), market: market(), guests: guests() };
    const main = document.querySelector("#panels");
    main.innerHTML = TABS.map(([id]) => '<section class="panel" id="panel-' + id + '">' + html[id] + "</section>").join("");
    showTab();
  }
  function showTab() {
    const id = (location.hash || "#overview").slice(1);
    const tab = TABS.some(([t]) => t === id) ? id : TABS[0][0];
    document.querySelectorAll(".panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + tab));
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === tab));
  }

  /* ---------- recipe drawer ---------- */
  function openRecipe(ri) {
    const r = g.recipes[ri]; const tl = K.timeline(withServe(r), g.days); const ms = meals();
    const f = K.scaleOf(r); const cf = r.cookingFor || r.serves || 0; const n = peopleCount();
    const servesBox = r.serves
      ? (editing
        ? '<div class="r-box serves"><h3 class="r-h" style="margin-top:0">cooking for</h3><div class="stepper"><button type="button" data-sv="-1" aria-label="fewer">−</button><b>' + cf + '</b><button type="button" data-sv="1" aria-label="more">+</button><span>people</span></div>' +
          "<p>The recipe makes " + r.serves + "." + (f !== 1 ? " Everything below is " + K.fmt(Math.round(f * 100) / 100) + "× — ingredients, the market list and the kitchen timing." : "") + "</p>" +
          (n && n !== cf ? '<button type="button" class="text-btn" data-sv="match">match the company (' + n + ")</button>" : "") + (f !== 1 ? ' <button type="button" class="text-btn" data-sv="reset">back to the original</button>' : "") + "</div>"
        : f !== 1 ? '<p class="serves-line">Cooking for ' + cf + " · the recipe makes " + r.serves + "</p>" : "")
      : editing ? '<div class="r-box serves"><h3 class="r-h" style="margin-top:0">cooking for</h3><p>How many people does this recipe make? Add it and you can scale it up or down.</p><div class="stepper"><input type="number" min="1" name="serves" placeholder="8"><button type="button" class="btn ghost" data-sv="set">set</button></div></div>' : "";
    r.review = r.review || { rating: 0, notes: "" };
    const sched = tl ? '<h3 class="r-h">the game plan</h3><ul class="plan">' + tl.events.map((e) => "<li><b>" + esc(e.at.toLocaleDateString(undefined, { weekday: "short" })) + " " + esc(K.clock(e.at)) + '</b><span class="k-' + e.kind + '">' + esc(e.text) + (e.dur ? " <i>" + esc(e.dur) + "</i>" : "") + "</span></li>").join("") + "</ul>" : "";
    const lib = r.fromLibrary ? (data.recipes || []).find((x) => x.id === r.fromLibrary) : null;
    const editBits = editing
      ? '<div class="r-box"><h3 class="r-h" style="margin-top:0">which meal is it for?</h3><div class="field" style="margin:0"><select name="meal"><option value="">not on a menu yet</option>' +
        ms.map((x) => '<option value="' + esc(x.m.id) + '"' + (r.meal === x.m.id ? " selected" : "") + ">" + esc(mealLabel(x)) + "</option>").join("") + "</select></div>" +
        (ms.length ? "" : '<p>Add a meal to the itinerary first.</p>') + "</div>" +
        '<div class="r-box"><h3 class="r-h" style="margin-top:0">how it went</h3>' +
        '<button type="button" class="btn ghost made-it-btn made-it" data-path="' + esc(P + ".recipes." + ri + ".image") + '" data-name="' + esc(r.title) + '">' + (r.image ? "swap your photo" : "📷 Made it? Add a photo from when you cooked it") + "</button>" +
        UI.stars(r.review.rating, true) + '<div class="field" style="margin-top:14px"><label>Notes on its success</label><textarea name="rnotes" placeholder="double the glaze. nobody touched the parsley.">' + esc(r.review.notes) + "</textarea></div></div>" +
        '<div class="modal-actions"><button class="btn" data-act="save">save it</button><button class="btn ghost" data-act="edit">edit recipe</button><button class="del" data-act="remove">remove from gathering</button></div>'
      : r.review.rating || r.review.notes ? '<div class="r-box"><h3 class="r-h" style="margin-top:0">how it went</h3>' + UI.stars(r.review.rating) + "<p>" + esc(r.review.notes) + "</p></div>" : "";
    UI.open(UI.top(UI.catLabel(r), r.title) + servesBox + editBits + sched + UI.recipeBody({ ...r, ingredients: scaledIngredients(r) }, K.adjustSteps({ ...r, scale: f })) +
      (lib ? '<p class="hint" style="margin-top:30px">A copy of <a href="recipes.html#' + esc(lib.id) + '">' + esc(lib.title) + "</a> from the Recipe Box.</p>" : ""), (m) => {
      UI.bindStars(m);
      m.addEventListener("click", (e) => {
        const sv = e.target.closest("[data-sv]");
        if (sv) {
          const v = sv.dataset.sv;
          if (v === "set") { const s = +m.querySelector("[name=serves]").value; if (!(s > 0)) return toast("How many people does it make?"); r.serves = s; r.cookingFor = s; }
          else if (v === "match") r.cookingFor = n;
          else if (v === "reset") r.cookingFor = r.serves;
          else r.cookingFor = Math.max(1, cf + +v);
          save(); openRecipe(ri); return;
        }
        const act = e.target.dataset && e.target.dataset.act; if (!act) return;
        if (act === "save") {
          r.meal = m.querySelector("[name=meal]").value || ""; delete r.serve;
          r.review = { rating: +m.querySelector(".stars").dataset.val || 0, notes: m.querySelector("[name=rnotes]").value.trim() };
          UI.close(); save("Saved. The kitchen countdown updated.");
        }
        if (act === "edit") UI.recipeForm(r, (v) => { Object.assign(r, v); save("Recipe updated."); });
        if (act === "remove" && confirm("Remove " + r.title + " from this gathering? (It stays in your Recipe Box.)")) { g.recipes.splice(ri, 1); UI.close(); save("Removed. The market list is updated."); }
      });
    });
  }

  function addRecipe() {
    const lib = data.recipes || [];
    const have = new Set(g.recipes.map((r) => r.fromLibrary));
    UI.open(UI.top("The Recipe Box", "add a recipe") +
      '<p class="hint">Pick from your Recipe Box. Each one is copied into this gathering, so changes and ratings here stay with ' + esc(g.title) + ".</p>" +
      '<div class="pick-list">' + lib.map((r) => '<div class="pick"><div><b>' + esc(r.title) + "</b><small>" + (r.ingredients || []).length + " ingredients" + " · " + esc(UI.catLabel(r)) + "</small></div>" +
        (have.has(r.id) ? '<span class="count-note">already here</span>' : '<button class="btn ghost" data-pick="' + esc(r.id) + '">add</button>') + "</div>").join("") + "</div>" +
      '<div class="modal-actions"><button class="btn" data-paste>' + plus + " paste a new link</button></div>", (m) => {
      m.addEventListener("click", (e) => {
        const id = e.target.dataset && e.target.dataset.pick;
        if (id) { copyIn(lib.find((r) => r.id === id)); UI.close(); }
        if (e.target.closest("[data-paste]")) UI.pasteLink({ onSaved: (v) => { const r = { id: GC.slug(v.title) + "-" + uid(), tint: "ice", icon: "asterisk", ...v }; data.recipes.push(r); copyIn(r); } });
      });
    });
  }
  function addActivity() {
    const lib = data.activities || []; const have = new Set(g.activities.map((a) => a.fromLibrary));
    UI.open(UI.top("Activity ideas", "add an activity") +
      '<p class="hint">Pick from your Activity Ideas. Each one is copied into this gathering, so you can give it a day here.</p>' +
      '<div class="pick-list">' + lib.map((a) => '<div class="pick"><img class="pick-preview" src="' + ((UI.ACT[a.category] || {}).src || "") + '" alt=""><div style="flex:1"><b>' + esc(a.title) + "</b><small>" + esc(UI.actLabel(a)) + "</small></div>" +
        (have.has(a.id) ? '<span class="count-note">already here</span>' : '<button class="btn ghost" data-pick-act="' + esc(a.id) + '">add</button>') + "</div>").join("") + "</div>" +
      '<div class="modal-actions"><button class="btn" data-new-act>' + plus + " a brand-new idea</button></div>", (m) => {
      m.addEventListener("click", (e) => {
        const id = e.target.dataset && e.target.dataset.pickAct;
        if (id) { const src = lib.find((a) => a.id === id); const c = JSON.parse(JSON.stringify(src)); c.fromLibrary = src.id; c.id = src.id + "-" + uid(); delete c.day; g.activities.push(c); UI.close(); save(src.title + " added. Open it to give it a day."); }
        if (e.target.closest("[data-new-act]")) {
          UI.close();
          const list = data.activities = data.activities || [];
          editThing("activity", list, null, (v) => { const lib2 = list[list.length - 1]; list.splice(list.length - 1, 1); list.unshift(lib2); const c = JSON.parse(JSON.stringify(lib2)); c.fromLibrary = lib2.id; c.id = lib2.id + "-" + uid(); g.activities.push(c); });
        }
      });
    });
  }
  function copyIn(src) {
    const c = JSON.parse(JSON.stringify(src));
    c.fromLibrary = src.id; c.id = src.id + "-" + uid(); c.review = { rating: 0, notes: "" };
    g.recipes.push(c); save(src.title + " added. Its ingredients are on the market list.");
    location.hash = "recipes";
  }

  /* ---------- simple editors ---------- */
  const F = {
    agenda: [{ k: "day", label: "Day", type: "select", opts: () => g.days.map((d) => [d.id, d.dow + ", " + d.date]) }, { k: "kind", label: "Kind", type: "select", opts: () => [["agenda", "On the agenda"], ["meal", "A meal"], ["travel", "Travel"]] }, { k: "title", label: "What's happening" }, { k: "time", label: "Time (leave blank for TBD)", type: "time" }],
    activity: [{ k: "title", label: "Title" }, { k: "category", label: "Kind of activity · picks the sticker on the card", type: "select", opts: () => [["", "choose one"]].concat(UI.ACTIVITY_TYPES.map((t) => [t.id, t.label])), preview: UI.ACT, guess: (t) => UI.guessActivity(t), guessFrom: "title", fallback: "craft" }, { k: "source", label: "Link · optional", ph: "an Instagram, a how-to, a ticket page" }, { k: "note", label: "A note about it", type: "area" }, { k: "day", label: "Add to a day", type: "select", opts: dayOpts }, { k: "supplies", label: "Supplies · one per line", type: "lines" }, { k: "steps", label: "Instructions · one step per line", type: "lines" }],
    market: [{ k: "name", label: "Item" }, { k: "qty", label: "How much" }, { k: "section", label: "Section", type: "select", opts: () => [["table", "The table & extras"], ["rest", "The rest"]] }],
    guest: [{ k: "name", label: "Name" }, { k: "doing", label: "Bringing / doing" }, { k: "bringing", label: "A little note" }, { k: "arriving", label: "Arriving" }, { k: "dietary", label: "Food notes" }, { k: "color", label: "Color", type: "select", opts: () => [["tan", "Tan"], ["ice", "Icy blue"], ["orange", "Orange"]] }],
    gathering: [{ k: "title", label: "Title" }, { k: "subtitle", label: "One line about it" }, { k: "place", label: "Place" }, { k: "dates", label: "Dates (short)" }, { k: "datesLong", label: "Dates (long)" }, { k: "people", label: "How many people", type: "number" }, { k: "status", label: "Status" }, { k: "heroCaption", label: "Hero caption" }]
  };
  const fields = (k) => F[k].map((f) => (typeof f.opts === "function" ? { ...f, opts: f.opts() } : f));
  function editThing(kind, list, i, after) {
    const isNew = i == null; const item = isNew ? {} : list[i];
    if (kind === "activity" && !item.category && item.title) item.category = UI.guessActivity(item.title) || "craft";
    UI.editForm({ eyebrow: "Good Company", title: "make it yours", hint: kind === "activity" ? "Saved ideas stay in their book until you add them to a day. The card shows its sticker until you add a photo from doing it." : "", fields: fields(kind), values: item,
      onSave: (v) => { if (isNew) list.push({ id: (kind === "activity" ? GC.slug(v.title) + "-" : "") + uid(), tint: ["ice", "tan", "butter", "orange"][list.length % 4], image: "", ...v }); else Object.assign(item, v); if (after) after(v); save(isNew && after ? "Added here and to Activity Ideas." : "Saved."); },
      onDelete: isNew ? null : () => { list.splice(i, 1); save("Removed."); } });
  }
  function editAgenda(dayId, idx) {
    const d = dayById(dayId); const it = idx == null ? {} : d.items[idx];
    UI.editForm({ eyebrow: "The itinerary", title: idx == null ? "add to the plan" : "edit the plan", fields: fields("agenda"), values: { day: dayId || g.days[0].id, kind: "agenda", ...it },
      onSave: (v) => {
        if (idx != null) d.items.splice(idx, 1);
        const nd = dayById(v.day); nd.items = nd.items || [];
        const item = { kind: v.kind, title: v.title, time: v.time || "time TBD" };
        if (v.kind === "meal") item.id = (it && it.id) || GC.slug(v.title) + "-" + uid();
        nd.items.push(item); save(v.kind === "meal" ? "Meal added. Give it dishes in the Kitchen." : "Added to the plan.");
      },
      onDelete: idx == null ? null : () => { const gone = d.items.splice(idx, 1)[0]; if (gone && gone.id) g.recipes.forEach((r) => { if (r.meal === gone.id) r.meal = ""; }); save("Removed."); } });
  }
  function pickDishes(mealId) {
    const x = meals().find((y) => y.m.id === mealId);
    UI.open(UI.top("The kitchen", "dishes for " + x.m.title.toLowerCase()) + '<p class="hint">Check what\'s being served. Recipes come from this gathering\'s Recipes tab.</p><div class="g-check">' +
      g.recipes.map((r, ri) => '<label><input type="checkbox" data-dish="' + ri + '"' + (r.meal === mealId ? " checked" : "") + "><span><b>" + esc(r.title) + "</b><small>" + esc(mealOf(r) && r.meal !== mealId ? "now: " + mealOf(r).m.title : r.course || "") + "</small></span></label>").join("") +
      '</div><div class="modal-actions"><button class="btn" data-close>done</button><button class="btn ghost" data-add="recipe">' + plus + " a recipe</button></div>", (m) => {
      m.addEventListener("change", (e) => { const ri = e.target.dataset.dish; if (ri == null) return; g.recipes[+ri].meal = e.target.checked ? mealId : ""; save(); });
    });
  }

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target;
    const jump = t.closest("[data-jump]");
    if (jump) { setTimeout(() => { const el = document.getElementById(jump.dataset.jump); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60); }
    const chk = t.closest("[data-check]");
    if (chk) { const c = getChecks(); c[chk.dataset.check] = !c[chk.dataset.check]; localStorage.setItem(CHECK_KEY, JSON.stringify(c)); render(); return; }
    const big = t.closest("[data-big]");
    if (big) { const b = g.bigPicture[+big.dataset.big]; b.done = !b.done; save(); return; }
    const bx = t.closest("[data-big-remove]"); if (bx) { g.bigPicture.splice(+bx.dataset.bigRemove, 1); save("Removed."); return; }
    if (t.closest("[data-big-add]")) { g.bigPicture.push({ text: "", done: false }); save();
      setTimeout(() => { const f = document.querySelectorAll('[data-field$=".text"][data-field*=".bigPicture."]'); const el = f[f.length - 1]; if (el) el.focus(); }, 60); return; }
    if (t.closest(".pencil, .made-it, a.src, a.arrow-link[target], [data-field]")) return;
    const ad = t.closest("[data-add-day]"); if (ad) return addDay(ad.dataset.addDay);
    const rd = t.closest("[data-remove-day]"); if (rd) return removeDay(rd.dataset.removeDay);
    const atd = t.closest("[data-add-to-day]"); if (atd) return editAgenda(atd.dataset.addToDay, null);
    const ri = t.closest("[data-remove-item]"); if (ri) { const [dId, idx] = ri.dataset.removeItem.split(":"); const d = dayById(dId); const it = d.items[+idx];
      if (confirm("Remove " + it.title + "?")) { const gone = d.items.splice(+idx, 1)[0]; if (gone && gone.id) g.recipes.forEach((r) => { if (r.meal === gone.id) r.meal = ""; }); save("Removed."); } return; }
    const un = t.closest("[data-unschedule]"); if (un) { const a = g.activities.find((x) => x.id === un.dataset.unschedule); if (a) { delete a.day; save(a.title + " is off the itinerary. It's still in Activities."); } return; }
    if (t.closest("[data-new-person]")) return newPerson();
    if (t.closest("[data-add-photos]")) return addPhotos();
    const pr = t.closest("[data-photo-remove]"); if (pr) { if (confirm("Remove this photo from the scrapbook?")) { g.photos.splice(+pr.dataset.photoRemove, 1); save("Removed."); } return; }
    const dp = t.closest("[data-dishes]"); if (dp) return pickDishes(dp.dataset.dishes);
    if (t.closest('a[href^="#"]')) return;
    const af = t.closest("[data-add-friend]"); if (af) return addFriend(af.dataset.addFriend);
    const gr = t.closest("[data-guest-remove]"); if (gr) { const p = g.guests[+gr.dataset.guestRemove]; if (confirm("Take " + (p.name || "this person") + " out of the company?")) { g.guests.splice(+gr.dataset.guestRemove, 1); save("Removed."); } return; }
    const add = t.closest("[data-add]");
    if (add) {
      const k = add.dataset.add;
      if (k === "recipe") return addRecipe();
      if (k === "agenda") return editAgenda(null, null);
      if (k === "meal") { editAgenda(null, null); const sel = document.querySelector('.modal [name="kind"]'); if (sel) sel.value = "meal"; return; }
      if (k === "guest") return newPerson();
      if (k === "gathering") return UI.editForm({ eyebrow: "Good Company", title: "edit gathering", hint: "Add or remove days on the Itinerary.", fields: fields("gathering").filter((f) => f.k !== "dates" && f.k !== "datesLong"), values: g, onSave: (v) => { Object.assign(g, v); save("Saved."); }, onDelete: removeGathering, deleteLabel: "delete this gathering" });
      if (k === "activity") return addActivity();
      const lists = { activity: g.activities, market: g.market, guest: g.guests };
      return editThing(k, lists[k], null);
    }
    const rc = t.closest("[data-recipe]"); if (rc) return openRecipe(+rc.dataset.recipe);
    if (!editing) {
      const ac = t.closest("[data-activity]");
      if (ac) { const a = g.activities[+ac.dataset.activity]; UI.open(UI.top(UI.actLabel(a), a.title) + (a.image ? '<div class="r-photo" style="background-image:url(\'' + esc(img(a.image)) + '\')"></div>' : UI.ACT[a.category] ? '<img class="r-sticker" src="' + UI.ACT[a.category].src + '" alt="">' : "") + '<p class="lede">' + esc(a.note) + '</p><h3 class="r-h">supplies</h3><ul class="r-list">' + a.supplies.map((s) => "<li>" + esc(s) + "</li>").join("") + '</ul><h3 class="r-h">how it goes</h3><ol class="r-steps">' + a.steps.map((s) => "<li>" + esc(s) + "</li>").join("") + "</ol>"); }
      return;
    }
    const ag = t.closest("[data-agenda]"); if (ag) { const [d, i] = ag.dataset.agenda.split(":"); return editAgenda(d, +i); }
    for (const [attr, kind, list] of [["activity", "activity", g.activities], ["market", "market", g.market]]) {
      const el = t.closest("[data-" + attr + "]"); if (el && !t.closest("[data-check]")) return editThing(kind, list, +el.dataset[attr]);
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.matches && e.target.matches("[data-friend-search]")) { e.target.closest(".find-friends").querySelector(".friend-results").innerHTML = friendResults(e.target.value); return; }
    const f = e.target.dataset && e.target.dataset.filter; if (!f) return;
    const q = e.target.value.toLowerCase();
    e.target.closest(".panel").querySelectorAll(".card").forEach((c) => (c.style.display = !q || (c.dataset.search || c.textContent.toLowerCase()).includes(q) ? "" : "none"));
  });
  document.addEventListener("keydown", (e) => {
    if (e.target.dataset && (e.target.dataset.field || e.target.dataset.caption != null) && e.key === "Enter") { e.preventDefault(); e.target.blur(); }
  });
  document.addEventListener("focusout", (e) => {
    if (!e.target.dataset || e.target.dataset.caption == null) return;
    const v = e.target.textContent.replace(/\s+/g, " ").trim();
    if (v === heroCaption()) return;
    if (editing) { g.heroCaption = v; save("Saved."); }
    else { localStorage.setItem(CAP_KEY, v); toast("Saved."); }
  });
  document.addEventListener("focusout", (e) => {
    const el = e.target; if (!el.dataset || !el.dataset.field) return;
    const v = el.textContent.replace(/\s+/g, " ").trim();
    if (v === (GC.getPath(GC.data, el.dataset.field) || "")) return;
    GC.setPath(GC.data, el.dataset.field, v); save("Saved.");
  });
  window.addEventListener("hashchange", () => { showTab(); window.scrollTo({ top: document.querySelector("#tabs").offsetTop - 0, behavior: "instant" }); });

  GC.onChange = render;
  GC.ready.then(() => { shell(); render(); });
})();
