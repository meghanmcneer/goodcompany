/* ==================================================================
   GOOD COMPANY — the mood board: links, screenshots and notes,
   kept outside any one gathering
================================================================== */
(function () {
  const { esc, icons, slot, data, editing, save, uid } = GC;
  data.moodboard = data.moodboard || [];
  const FIELDS = [
    { k: "title", label: "Title" },
    { k: "note", label: "What you love about it", type: "area" },
    { k: "source", label: "Link · Instagram, Pinterest, a recipe, anything" }
  ];
  const tints = ["ice", "tan", "butter", "orange"];

  function render() {
    const list = data.moodboard;
    document.querySelector("#board").innerHTML =
      '<div class="wrap"><div class="page-head"><div><p class="eyebrow">Screenshots, pins, links, tiny obsessions</p><h1 class="hed">The mood board</h1>' +
      '<p class="lede">Paste an Instagram, Pinterest, recipe or other link. Add a screenshot and a note if the internet leaves out the good part. It all lives here, ready for whatever you plan next.</p></div>' +
      (editing ? '<button class="btn" data-add-pin><span class="plus">+</span> paste a link</button>' : "") + "</div>" +
      '<div class="note-band slim">' + icons.link + "<span><b>link it, then tell us what you love.</b> Instagram and Pinterest may keep their photos to themselves. Use the pencil to drop in a screenshot.</span></div>" +
      '<div class="toolbar"><label class="search">' + icons.search + '<input placeholder="search the mood board" id="q"></label><span class="count-note">' + list.length + (list.length === 1 ? " thing" : " things") + "</span></div>" +
      (list.length
        ? '<div class="cards board">' + list.map((s, i) => '<article class="card' + (editing ? " editable" : "") + '" data-pin="' + i + '" data-search="' + esc((s.title + " " + (s.note || "") + " " + (s.source || "")).toLowerCase()) + '">' +
            '<div class="media">' + slot("moodboard." + i + ".image", s.image, s.tint || tints[i % 4], "arrow", "saved for later") + "</div>" +
            '<div class="body">' + (s.source ? '<a class="src" href="' + esc(s.source) + '" target="_blank" rel="noopener">' + esc(GC.host(s.source)) + " " + icons.ext + "</a>" : "") +
            '<h3 class="hed">' + esc(s.title) + "</h3><p>" + esc(s.note || "") + "</p>" +
            '<div class="foot">' + (s.source ? '<a class="arrow-link" href="' + esc(s.source) + '" target="_blank" rel="noopener" style="margin-left:0">open the original ' + icons.ne + "</a>" : "") +
            (s.from ? '<span class="serve-chip ice" style="margin-left:auto">' + esc(s.from) + "</span>" : "") + "</div></div></article>").join("") + "</div>"
        : '<p class="empty">Nothing pinned yet.' + (editing ? "" : " Turn on edit mode to add things.") + "</p>") +
      "</div>";
  }

  function edit(i) {
    const isNew = i == null; const item = isNew ? {} : data.moodboard[i];
    UI.editForm({
      eyebrow: "The mood board", title: isNew ? "pin something" : "make it yours", fields: FIELDS, values: item,
      hint: "Add a screenshot afterward with the pencil on the card.",
      onSave: (v) => { if (isNew) data.moodboard.unshift({ id: uid(), image: "", tint: tints[data.moodboard.length % 4], ...v }); else Object.assign(item, v); save(isNew ? "Pinned." : "Saved."); },
      onDelete: isNew ? null : () => { data.moodboard.splice(i, 1); save("Removed."); }
    });
  }

  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-add-pin]")) return edit(null);
    if (!editing || e.target.closest(".pencil, a")) return;
    const c = e.target.closest("[data-pin]"); if (c) edit(+c.dataset.pin);
  });
  document.addEventListener("input", (e) => {
    if (e.target.id !== "q") return; const q = e.target.value.toLowerCase();
    document.querySelectorAll(".card").forEach((c) => (c.style.display = !q || c.dataset.search.includes(q) ? "" : "none"));
  });

  GC.onChange = render;
  GC.ready.then(render);
})();
