/* ==================================================================
   GOOD COMPANY — the main Recipe Box (recipes.html)
================================================================== */
(function () {
  const { esc, icons, slot, data, editing, save, uid } = GC;
  data.recipes = data.recipes || [];

  function avg(list) { const r = list.filter((x) => x.r.review && x.r.review.rating); return r.length ? r.reduce((s, x) => s + x.r.review.rating, 0) / r.length : 0; }

  const inGatherings = (r) => data.gatherings.filter((g) => (g.recipes || []).some((c) => c.fromLibrary === r.id));
  function gatheringMenu(r, open) {
    const inG = inGatherings(r);
    if (!editing) {
      return inG.length ? '<div class="g-chips">' + inG.map((g) => '<a href="gathering.html?g=' + esc(g.id) + '#recipes">' + esc(g.title) + "</a>").join("") + "</div>" : "";
    }
    const label = inG.length ? inG.map((g) => g.title).join(", ") : "add to a gathering";
    return '<details class="g-menu"' + (open ? " open" : "") + ' data-menu="' + esc(r.id) + '"><summary><span class="g-menu-lbl">' + (inG.length ? "in " : "") + esc(label) + '</span><span class="caret">▾</span></summary><div class="g-menu-list">' +
      '<p class="eyebrow">Add to or remove from</p>' +
      data.gatherings.map((g) => '<label><input type="checkbox" data-assign="' + esc(g.id) + '" data-rid="' + esc(r.id) + '"' + (inG.includes(g) ? " checked" : "") + "><span><b>" + esc(g.title) + "</b><small>" + esc(g.dates) + "</small></span></label>").join("") +
      "</div></details>";
  }
  function assign(rid, gid, on) {
    const r = data.recipes.find((x) => x.id === rid); const g = data.gatherings.find((x) => x.id === gid);
    if (on) {
      if (g.recipes.some((c) => c.fromLibrary === rid)) return true;
      const c = JSON.parse(JSON.stringify(r)); c.fromLibrary = r.id; c.id = r.id + "-" + uid(); c.review = { rating: 0, notes: "" };
      g.recipes.push(c); save(r.title + " added to " + g.title + ". Its ingredients are on that market list.");
      return true;
    }
    const copies = g.recipes.filter((c) => c.fromLibrary === rid);
    const hasNotes = copies.some((c) => (c.review && (c.review.rating || c.review.notes)) || c.serve);
    if (hasNotes && !confirm("Remove " + r.title + " from " + g.title + "? Its serve time, rating and notes for that gathering go with it. It stays in the Recipe Box.")) return false;
    g.recipes = g.recipes.filter((c) => c.fromLibrary !== rid);
    save(r.title + " removed from " + g.title + " and its market list. Still in the Recipe Box.");
    return true;
  }

  function card(r, i) {
    const made = UI.madeFor(r.id); const a = avg(made);
    return '<article class="card" data-lib="' + i + '" id="' + esc(r.id) + '" data-search="' + esc((r.title + " " + (r.note || "") + " " + (r.ingredients || []).join(" ")).toLowerCase()) + '">' +
      '<div class="media">' + UI.recipeMedia("recipes." + i + ".image", r, (made.filter((x) => x.r.image).pop() || { r: {} }).r.image) + "</div>" +
      '<div class="body">' + (r.source ? '<a class="src" href="' + esc(r.source) + '" target="_blank" rel="noopener">' + esc(GC.host(r.source)) + " " + icons.ext + "</a>" : '<span class="src">a good company original</span>') +
      '<h3 class="hed">' + esc(r.title) + "</h3><p>" + esc(r.note || "") + "</p>" +
      '<div class="foot"><span>' + (r.ingredients || []).length + " ingredients</span>" + (a ? UI.stars(Math.round(a)) : "") + "</div>" + gatheringMenu(r, openMenu === r.id) + "</div></article>";
  }

  let openMenu = null;
  function render() {
    const list = data.recipes;
    document.querySelector("#box").innerHTML =
      '<div class="wrap"><div class="page-head"><div><p class="eyebrow">Something to pass around</p><h1 class="hed">The recipe box</h1>' +
      '<p class="lede">Every recipe worth making twice. Paste a link to add one. Add it to a gathering and it gets its own copy there, with a rating and notes on how it went.</p></div>' +
      '<button class="btn edit-only" data-paste><span class="plus">+</span> paste a link</button></div>' +
      '<div class="toolbar"><label class="search">' + icons.search + '<input placeholder="search the recipe box" id="q"></label><span class="count-note">' + list.length + " recipes</span></div>" +
      '<div class="cards">' + list.map(card).join("") + "</div>" +
      (editing ? "" : '<p class="hint" style="margin-top:40px;color:var(--muted)">Adding recipes happens in edit mode.</p>') + "</div>";
  }

  function openLib(i) {
    const r = data.recipes[i]; const made = UI.madeFor(r.id);
    const history = '<h3 class="r-h">made for</h3>' + (made.length
      ? '<ul class="history">' + made.map(({ g, r: c }) => '<li><a href="gathering.html?g=' + esc(g.id) + '#recipes"><b>' + esc(g.title) + "</b><small>" + esc(g.dates) + "</small></a>" +
        (c.review && c.review.rating ? UI.stars(c.review.rating) : '<span class="count-note">not rated yet</span>') + (c.review && c.review.notes ? "<p>" + esc(c.review.notes) + "</p>" : "") + "</li>").join("") + "</ul>"
      : '<p class="empty">not made for a gathering yet</p>');
    const actions = editing
      ? '<div class="r-box"><h3 class="r-h" style="margin-top:0">in these gatherings</h3><div class="g-check">' +
        data.gatherings.map((g) => '<label><input type="checkbox" data-assign="' + esc(g.id) + '" data-rid="' + esc(r.id) + '"' + (made.some((x) => x.g === g) ? " checked" : "") + "><span><b>" + esc(g.title) + "</b><small>" + esc(g.dates) + "</small></span></label>").join("") +
        '</div></div><div class="modal-actions"><button class="btn ghost" data-act="edit">edit recipe</button><button class="del" data-act="delete">delete from recipe box</button></div>'
      : "";
    UI.open(UI.top(UI.catLabel(r), r.title) + actions + history + UI.recipeBody(r), (m) => {
      m.addEventListener("click", (e) => {
        const act = e.target.dataset && e.target.dataset.act; if (!act) return;
        if (act === "edit") UI.recipeForm(r, (v) => { Object.assign(r, v); save("Saved. (Copies already in gatherings keep their own version.)"); }, false);
        if (act === "delete" && confirm("Delete " + r.title + " from the Recipe Box? Copies in gatherings stay.")) { data.recipes.splice(i, 1); UI.close(); save("Deleted."); }
      });
    });
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest(".pencil, .made-it, a.src, .g-menu, .g-chips, .g-check")) return;
    if (e.target.closest("[data-paste]")) return UI.pasteLink({ onSaved: (v) => { data.recipes.unshift({ id: GC.slug(v.title) + "-" + uid(), tint: ["ice", "tan", "orange", "butter"][data.recipes.length % 4], icon: "asterisk", ...v }); save("Added to the Recipe Box."); } });
    const c = e.target.closest("[data-lib]"); if (c) openLib(+c.dataset.lib);
  });
  document.addEventListener("change", (e) => {
    const cb = e.target.closest("[data-assign]"); if (!cb) return;
    const inDrawer = !!cb.closest(".modal");
    openMenu = inDrawer ? null : cb.dataset.rid;
    if (!assign(cb.dataset.rid, cb.dataset.assign, cb.checked)) cb.checked = !cb.checked;
    if (inDrawer) { const i = data.recipes.findIndex((r) => r.id === cb.dataset.rid); render(); openLib(i); }
  });
  document.addEventListener("click", (e) => { // close an open dropdown when clicking elsewhere
    document.querySelectorAll("details.g-menu[open]").forEach((d) => { if (!d.contains(e.target)) { d.open = false; if (openMenu === d.dataset.menu) openMenu = null; } });
  });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "q") return; const q = e.target.value.toLowerCase();
    document.querySelectorAll(".card").forEach((c) => (c.style.display = !q || c.dataset.search.includes(q) ? "" : "none"));
  });

  GC.onChange = render;
  GC.ready.then(() => {
    render();
    const id = location.hash.slice(1); const i = data.recipes.findIndex((r) => r.id === id);
    if (i > -1) openLib(i);
  });
})();
