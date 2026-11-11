/* ==================================================================
   GOOD COMPANY — Activity Ideas: every activity worth doing twice
   Adding one to a gathering makes a copy inside that gathering.
================================================================== */
(function () {
  const { esc, icons, data, editing, save, uid } = GC;
  data.activities = data.activities || [];
  const tints = ["ice", "tan", "butter", "orange"];

  const inGatherings = (a) => data.gatherings.filter((g) => (g.activities || []).some((c) => c.fromLibrary === a.id));
  function gatheringMenu(a, open) {
    const inG = inGatherings(a);
    if (!editing) return inG.length ? '<div class="g-chips">' + inG.map((g) => '<a href="gathering.html?g=' + esc(g.id) + '#activities">' + esc(g.title) + "</a>").join("") + "</div>" : "";
    const label = inG.length ? inG.map((g) => g.title).join(", ") : "add to a gathering";
    return '<details class="g-menu"' + (open ? " open" : "") + ' data-menu="' + esc(a.id) + '"><summary><span class="g-menu-lbl">' + (inG.length ? "in " : "") + esc(label) + '</span><span class="caret">▾</span></summary><div class="g-menu-list">' +
      '<p class="eyebrow">Add to or remove from</p>' +
      data.gatherings.map((g) => '<label><input type="checkbox" data-assign="' + esc(g.id) + '" data-aid="' + esc(a.id) + '"' + (inG.includes(g) ? " checked" : "") + "><span><b>" + esc(g.title) + "</b><small>" + esc(g.dates) + "</small></span></label>").join("") +
      "</div></details>";
  }
  function assign(aid, gid, on) {
    const a = data.activities.find((x) => x.id === aid); const g = data.gatherings.find((x) => x.id === gid);
    g.activities = g.activities || [];
    if (on) {
      if (g.activities.some((c) => c.fromLibrary === aid)) return true;
      const c = JSON.parse(JSON.stringify(a)); c.fromLibrary = a.id; c.id = a.id + "-" + uid(); delete c.day;
      g.activities.push(c); save(a.title + " added to " + g.title + ". Pick a day for it there.");
      return true;
    }
    const scheduled = g.activities.some((c) => c.fromLibrary === aid && c.day);
    if (scheduled && !confirm("Take " + a.title + " out of " + g.title + "? It's on the itinerary there. It stays in Activity Ideas.")) return false;
    g.activities = g.activities.filter((c) => c.fromLibrary !== aid);
    save(a.title + " removed from " + g.title + ". Still in Activity Ideas.");
    return true;
  }

  function card(a, i) {
    const done = inGatherings(a);
    return '<article class="card" data-idea="' + i + '" id="' + esc(a.id) + '" data-search="' + esc((a.title + " " + (a.note || "") + " " + UI.actLabel(a) + " " + (a.supplies || []).join(" ")).toLowerCase()) + '">' +
      '<div class="media">' + UI.activityMedia("activities." + i + ".image", a) + "</div>" +
      '<div class="body">' + (a.source ? '<a class="src" href="' + esc(a.source) + '" target="_blank" rel="noopener">' + esc(GC.host(a.source)) + " " + icons.ext + "</a>" : '<span class="src">a good company original</span>') +
      '<h3 class="hed">' + esc(a.title) + "</h3><p>" + esc(a.note || "") + "</p>" +
      '<div class="foot"><span>' + (a.supplies || []).length + " supplies</span><span>" + (done.length ? "in " + done.length + (done.length === 1 ? " gathering" : " gatherings") : "not planned yet") + "</span></div>" +
      gatheringMenu(a, openMenu === a.id) + "</div></article>";
  }
  let openMenu = null;
  function render() {
    const list = data.activities;
    document.querySelector("#ideas").innerHTML =
      '<div class="wrap"><div class="page-head"><div><p class="eyebrow">Things to do between courses</p><h1 class="hed">Activity ideas</h1>' +
      '<p class="lede">Crafts, walks, games, grand plans. Keep every good idea here, then add it to a gathering when the moment is right.</p></div>' +
      (editing ? '<button class="btn" data-new-idea><span class="plus">+</span> add an idea</button>' : "") + "</div>" +
      '<div class="toolbar"><label class="search">' + icons.search + '<input placeholder="search activity ideas" id="q"></label><span class="count-note">' + list.length + (list.length === 1 ? " idea" : " ideas") + "</span></div>" +
      (list.length ? '<div class="cards">' + list.map(card).join("") + "</div>" : '<p class="empty">No ideas yet.' + "" + "</p>") +
      (editing ? "" : '<p class="edit-nudge"><button type="button" class="btn ghost" data-start-edit>+ add an idea</button><span>opens edit mode, where you can add ideas, photos and plans</span></p>') + "</div>";
  }

  const FIELDS = () => [
    { k: "title", label: "Title" },
    { k: "category", label: "Kind of activity · picks the sticker on the card", type: "select", opts: [["", "choose one"]].concat(UI.ACTIVITY_TYPES.map((t) => [t.id, t.label])), preview: UI.ACT, guess: (t) => UI.guessActivity(t), guessFrom: "title", fallback: "craft" },
    { k: "source", label: "Link · optional", ph: "an Instagram, a how-to, a ticket page" },
    { k: "note", label: "A note about it", type: "area" },
    { k: "supplies", label: "Supplies · one per line", type: "lines" },
    { k: "steps", label: "How it goes · one step per line", type: "lines" }
  ];
  function edit(i) {
    const isNew = i == null; const item = isNew ? {} : data.activities[i];
    UI.editForm({
      eyebrow: "Activity ideas", title: isNew ? "a new idea" : "make it yours", fields: FIELDS(), values: item,
      hint: "The card shows its sticker until you add a photo from doing it." + (isNew ? "" : " Copies already in gatherings keep their own version."),
      onSave: (v) => { if (isNew) data.activities.unshift({ id: GC.slug(v.title) + "-" + uid(), image: "", tint: tints[data.activities.length % 4], ...v }); else Object.assign(item, v); save(isNew ? "Added to Activity Ideas." : "Saved."); },
      onDelete: isNew ? null : () => { data.activities.splice(i, 1); save("Removed. Copies in gatherings stay."); }
    });
  }
  function view(i) {
    const a = data.activities[i];
    UI.open(UI.top(UI.actLabel(a), a.title) +
      (a.image ? '<div class="r-photo" style="background-image:url(\'' + esc(GC.img(a.image)) + '\')"></div>' : UI.ACT[a.category] ? '<img class="r-sticker" src="' + UI.ACT[a.category].src + '" alt="">' : "") +
      (a.note ? '<p class="lede" style="margin:0 0 18px">' + esc(a.note) + "</p>" : "") +
      (a.source ? '<p><a class="arrow-link" href="' + esc(a.source) + '" target="_blank" rel="noopener">open the link ' + icons.ne + "</a></p>" : "") +
      '<h3 class="r-h">supplies</h3>' + ((a.supplies || []).length ? '<ul class="r-list">' + a.supplies.map((s) => "<li>" + esc(s) + "</li>").join("") + "</ul>" : '<p class="empty">none listed</p>') +
      '<h3 class="r-h">how it goes</h3>' + ((a.steps || []).length ? '<ol class="r-steps">' + a.steps.map((s) => "<li>" + esc(s) + "</li>").join("") + "</ol>" : '<p class="empty">no steps yet</p>') +
      (editing ? '<div class="modal-actions"><button class="btn ghost" data-edit-idea="' + i + '">edit idea</button></div>' : ""));
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-new-idea]")) return edit(null);
    const ei = e.target.closest("[data-edit-idea]"); if (ei) return edit(+ei.dataset.editIdea);
    if (e.target.closest(".pencil, .made-it, a.src, .g-menu, .g-chips")) return;
    const c = e.target.closest("[data-idea]"); if (c) view(+c.dataset.idea);
  });
  document.addEventListener("change", (e) => {
    const cb = e.target.closest("[data-assign][data-aid]"); if (!cb) return;
    openMenu = cb.dataset.aid;
    if (!assign(cb.dataset.aid, cb.dataset.assign, cb.checked)) cb.checked = !cb.checked;
  });
  document.addEventListener("click", (e) => {
    document.querySelectorAll("details.g-menu[open]").forEach((d) => { if (!d.contains(e.target)) { d.open = false; if (openMenu === d.dataset.menu) openMenu = null; } });
  });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "q") return; const q = e.target.value.toLowerCase();
    document.querySelectorAll(".card").forEach((c) => (c.style.display = !q || c.dataset.search.includes(q) ? "" : "none"));
  });

  GC.onChange = render;
  GC.ready.then(() => { render(); const i = data.activities.findIndex((a) => a.id === location.hash.slice(1)); if (i > -1) view(i); });
})();
