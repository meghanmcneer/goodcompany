/* ==================================================================
   GOOD COMPANY — core
   - Edit mode: add ?edit to the URL (stays on until you click "exit").
   - Pencils swap images. Swapped images are kept in this browser
     until you "export for GitHub", which downloads a zip with
     the updated content.js + new images, in the same folders as
     the repo. Upload that zip's contents to GitHub and it's live.
================================================================== */
(function () {
  const BASE = window.GOOD_COMPANY;
  const DRAFT_KEY = "gc-draft-v1";
  const EDIT_KEY = "gc-edit";

  // ---------- edit mode switch ----------
  const qs = new URLSearchParams(location.search);
  if (qs.has("edit")) {
    if (qs.get("edit") === "off") localStorage.removeItem(EDIT_KEY);
    else localStorage.setItem(EDIT_KEY, "1");
  }
  // everything is always editable (except the sign-up screen) — no view mode
  const editing = !document.body.classList.contains("welcome");

  const clone = (o) => JSON.parse(JSON.stringify(o));
  let draft = null;
  try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); } catch (e) {}
  const data = editing && draft ? draft : clone(BASE);

  // links and screenshots used to live inside each gathering; they belong to the mood board now
  (function moveScrapbooks() {
    let moved = false; data.moodboard = data.moodboard || [];
    (data.gatherings || []).forEach((g) => {
      if (Array.isArray(g.scrapbook)) {
        g.scrapbook.forEach((s) => { if (!data.moodboard.some((m) => m.id === s.id)) data.moodboard.push({ ...s, from: g.title }); });
        delete g.scrapbook; moved = true;
      }
      g.photos = g.photos || [];
      // activities made inside a gathering before Activity Ideas existed join the library
      data.activities = data.activities || [];
      (g.activities || []).forEach((a) => {
        if (a.fromLibrary) return;
        if (!data.activities.some((x) => x.id === a.id)) { const c = JSON.parse(JSON.stringify(a)); delete c.day; data.activities.push(c); }
        a.fromLibrary = a.id; moved = true;
      });
    });
    if (moved && editing && draft) { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch (e) {} }
  })();

  // ---------- type settings (tracking, spacing, sizes) ----------
  function applyType(t) {
    const r = document.documentElement.style; t = t || {};
    const units = { "hed-track": "em", "label-track": "em", "body-track": "em", "eyebrow-gap": "px", "body-size": "px" };
    Object.keys(units).concat(["hed-scale", "hed-lead", "body-lead"]).forEach((k) => {
      if (t[k] == null) r.removeProperty("--" + k); else r.setProperty("--" + k, t[k] + (units[k] || ""));
    });
  }
  applyType((data.site || {}).type);

  // ---------- tiny helpers ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const host = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; } };
  const slug = (s) => String(s || "item").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "item";
  const uid = () => Math.random().toString(36).slice(2, 8);

  function getPath(obj, path) { return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj); }
  function setPath(obj, path, val) {
    const keys = path.split("."); const last = keys.pop();
    const target = keys.reduce((o, k) => o[k], obj); target[last] = val;
  }

  // ---------- icons ----------
  const icons = {
    pencil: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/><path d="M14.5 5.5l3 3"/></svg>',
    asterisk: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M50 12v76M17 31l66 38M17 69l66-38M30 16l40 68M70 16L30 84"/></svg>',
    arrow: '<svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><path d="M22 88L74 18M50 22l26-5 3 27"/></svg>',
    ne: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 17L17 7M9 7h8v8"/></svg>',
    ext: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/></svg>',
    bag: '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 7h14l-1 13H6z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/></svg>',
    squiggle: '<svg viewBox="0 0 260 18" class="squiggle" fill="none" stroke="#FF5A12" stroke-width="5" stroke-linecap="round"><path d="M4 12C30 2 46 16 70 8s42 6 66-2 44 8 66 0 34 4 50-2"/></svg>',
    swoosh: '<svg viewBox="0 0 300 20" class="swoosh"><path d="M6 14C80 4 190 2 294 7" fill="none" stroke="#FF5A12" stroke-width="7" stroke-linecap="round"/></svg>'
  };

  // ---------- image store (IndexedDB) ----------
  const blobs = new Map(); // path -> objectURL
  let db = null;
  function openDB() {
    return new Promise((res) => {
      if (!("indexedDB" in window)) return res(null);
      const req = indexedDB.open("good-company", 1);
      req.onupgradeneeded = () => req.result.createObjectStore("images");
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(null);
    });
  }
  function idb(mode, fn) {
    return new Promise((res, rej) => {
      if (!db) return res(null);
      const tx = db.transaction("images", mode); const st = tx.objectStore("images");
      const r = fn(st); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error);
    });
  }
  async function loadImages() {
    if (!editing) return;
    db = await openDB(); if (!db) return;
    await new Promise((res) => {
      const tx = db.transaction("images", "readonly"); const st = tx.objectStore("images");
      const req = st.openCursor();
      req.onsuccess = () => { const c = req.result; if (c) { blobs.set(c.key, URL.createObjectURL(c.value)); c.continue(); } else res(); };
      req.onerror = () => res();
    });
  }
  const EMBED = window.GC_EMBED || {};
  const img = (path) => (path ? blobs.get(path) || EMBED[path] || path : "");

  function resizeToBlob(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => {
        const max = 2000; let { width: w, height: h } = im;
        const k = Math.min(1, max / Math.max(w, h)); w = Math.round(w * k); h = Math.round(h * k);
        const c = document.createElement("canvas"); c.width = w; c.height = h;
        const ctx = c.getContext("2d"); ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(im, 0, 0, w, h);
        c.toBlob((b) => { URL.revokeObjectURL(url); b ? resolve(b) : reject(); }, "image/jpeg", 0.86);
      };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("not an image")); };
      im.src = url;
    });
  }

  function pickImage(nameHint) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/*";
      input.onchange = async () => {
        const f = input.files && input.files[0]; if (!f) return resolve(null);
        try {
          const blob = await resizeToBlob(f);
          const path = "images/" + slug(nameHint) + "-" + Date.now().toString(36) + ".jpg";
          if (!db) db = await openDB();
          await idb("readwrite", (st) => st.put(blob, path));
          blobs.set(path, URL.createObjectURL(blob));
          resolve(path);
        } catch (e) { toast("That file didn't load as an image. Try a JPG or PNG."); resolve(null); }
      };
      input.click();
    });
  }

  // several at once (the event scrapbook)
  function pickImages(nameHint) {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file"; input.accept = "image/*"; input.multiple = true;
      input.onchange = async () => {
        const files = [...(input.files || [])]; const out = [];
        if (!db) db = await openDB();
        for (const f of files) {
          try {
            const blob = await resizeToBlob(f);
            const path = "images/" + slug(nameHint) + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + ".jpg";
            await idb("readwrite", (st) => st.put(blob, path)); blobs.set(path, URL.createObjectURL(blob)); out.push(path);
          } catch (e) { /* skip anything that isn't a photo */ }
        }
        if (files.length && !out.length) toast("Those didn't load as photos. Try JPGs or PNGs.");
        resolve(out);
      };
      input.click();
    });
  }

  // ---------- saving ----------
  let onChange = () => {};
  function save(msg) {
    if (!editing) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
    updateBar();
    if (msg) toast(msg);
    onChange();
  }
  const PUB_KEY = "gc-exported";
  function changedCount() {
    const a = JSON.stringify(BASE), b = JSON.stringify(data);
    if (a === b) return 0;
    try { if (localStorage.getItem(PUB_KEY) === b) return 0; } catch (e) {} // already exported, waiting on GitHub
    return [...blobs.keys()].filter((p) => b.includes(p)).length || 1;
  }

  // ---------- zip (store only, no library) ----------
  const crcTable = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = crcTable[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function makeZip(files) {
    const enc = new TextEncoder(); const parts = []; const central = []; let offset = 0;
    const d = new Date(); const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    for (const f of files) {
      const name = enc.encode(f.name); const crc = crc32(f.data); const size = f.data.length;
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
      lh.setUint32(18, size, true); lh.setUint32(22, size, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, f.data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true);
      ch.setUint16(10, 0, true); ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
      ch.setUint32(20, size, true); ch.setUint32(24, size, true); ch.setUint16(28, name.length, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), name);
      offset += 30 + name.length + size;
    }
    const cdSize = central.reduce((s, p) => s + p.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/zip" });
  }

  async function exportForGitHub() {
    const enc = new TextEncoder();
    const json = JSON.stringify(data, null, 2);
    const js = "/* GOOD COMPANY — site content. Exported " + new Date().toLocaleString() + " */\nwindow.GOOD_COMPANY = " + json + ";\n";
    const files = [{ name: "assets/js/content.js", data: enc.encode(js) }];
    for (const path of blobs.keys()) {
      if (!json.includes('"' + path + '"')) continue;
      const blob = await idb("readonly", (st) => st.get(path));
      if (blob) files.push({ name: path, data: new Uint8Array(await blob.arrayBuffer()) });
    }
    const readme = [
      "GOOD COMPANY — update",
      "",
      "1. Unzip this.",
      "2. On GitHub, open your good-company repo > Add file > Upload files.",
      "3. Drag in the 'assets' and 'images' folders from this zip.",
      "4. Commit. GitHub Pages refreshes in a minute or two.",
      "",
      "(content.js replaces the old one; the new images are added alongside the old ones.)"
    ].join("\n");
    files.push({ name: "HOW-TO-UPLOAD.txt", data: enc.encode(readme) });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(makeZip(files));
    a.download = "good-company-update.zip";
    document.body.appendChild(a); a.click(); a.remove();
    try { localStorage.setItem(PUB_KEY, JSON.stringify(data)); } catch (e) {}
    updateBar();
    toast("Downloaded. Drag its folders into your GitHub repo to publish.");
  }

  async function discardDraft() {
    if (!confirmInline("Discard all unpublished edits in this browser?")) return;
    localStorage.removeItem(DRAFT_KEY);
    if (!db) db = await openDB();
    await idb("readwrite", (st) => st.clear());
    location.reload();
  }
  // a non-blocking-friendly confirm (native confirm is fine for a person, it's just one click)
  function confirmInline(msg) { return window.confirm(msg); }

  // ---------- toast ----------
  let tt;
  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) { el = document.createElement("div"); el.className = "toast"; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add("show"); clearTimeout(tt);
    tt = setTimeout(() => el.classList.remove("show"), 3400);
  }

  // ---------- edit bar ----------
  function buildBar() {
    if (!editing) return;
    document.body.classList.add("editing");
    const bar = document.createElement("div");
    bar.className = "editbar";
    bar.innerHTML = '<span class="lbl">your changes</span><span class="status"></span>' +
      '<button class="go" data-act="export">export for GitHub</button>' +
      '<button data-act="type">type</button>' +
      '<button data-act="discard">discard edits</button>';
    bar.addEventListener("click", (e) => {
      const act = e.target.dataset.act;
      if (act === "export") exportForGitHub();
      if (act === "type" && window.UI) UI.typePanel();
      if (act === "discard") discardDraft();
      if (act === "exit") setEditing(false);
    });
    document.body.appendChild(bar);
    updateBar();
  }
  function updateBar() {
    const s = document.querySelector(".editbar .status"); if (!s) return;
    const n = changedCount();
    s.textContent = n ? "saved on this device · not on the live site yet" : "";
    document.body.classList.toggle("has-changes", !!n);
  }

  // ---------- pencils: any button.pencil[data-path] ----------
  document.addEventListener("click", async (e) => {
    const p = e.target.closest(".pencil[data-path], .made-it[data-path]");
    if (!p || !editing) return;
    e.preventDefault(); e.stopPropagation();
    const path = await pickImage(p.dataset.name || p.dataset.path);
    if (!path) return;
    setPath(data, p.dataset.path, path);
    save(p.classList.contains("made-it") ? "Looks delicious. Your photo is on the card." : "Image swapped. Export when you're ready to publish.");
  });

  const pencil = (path, name) => '<button class="pencil" type="button" title="swap image" data-path="' + esc(path) + '" data-name="' + esc(name || "") + '">' + icons.pencil + "</button>";

  // image slot with placeholder + pencil
  function slot(path, value, tint, icon, label) {
    const src = img(value);
    const style = src ? ' style="background-image:url(\'' + esc(src) + '\')"' : "";
    return '<div class="ph tint-' + (tint || "ice") + (src ? " has-img" : "") + '"' + style + ">" +
      (icon ? icons[icon] : "") + (label ? '<span class="ph-label">' + esc(label) + "</span>" : "") +
      pencil(path, path.split(".").slice(-2).join("-")) + "</div>";
  }

  // ---------- getting into edit mode ----------
  function setEditing(on) {
    if (on) localStorage.setItem(EDIT_KEY, "1"); else localStorage.removeItem(EDIT_KEY);
    const u = new URL(location.href); u.searchParams.delete("edit");
    if (u.toString() === location.href) location.reload(); else location.href = u.toString();
  }
  // a visible button when you're running the beta file from your computer
  function editToggle() {
    if (editing || document.body.classList.contains("welcome")) return;
    const b = document.createElement("button");
    b.className = "edit-toggle"; b.type = "button";
    b.innerHTML = icons.pencil + "<span>edit photos &amp; details</span>";
    b.addEventListener("click", () => setEditing(true));
    document.body.appendChild(b);
  }
  // while editing, clicking anywhere on a photo opens the upload
  document.addEventListener("click", (e) => {
    if (!editing || e.target.closest(".pencil, .made-it, a, button, [data-field], [contenteditable]")) return;
    const ph = e.target.closest(".ph, .g-hero, .g-card .img");
    if (!ph) return;
    const p = ph.querySelector(":scope > .pencil"); if (!p) return;
    e.preventDefault(); e.stopPropagation(); p.click();
  }, true);

  window.GC = {
    data, base: BASE, editing, applyType, esc, host, slug, uid, icons, img, slot, pencil, save, toast,
    getPath, setPath, pickImage, pickImages, ready: null,
    set onChange(fn) { onChange = fn; }
  };
  document.addEventListener("click", (e) => { if (e.target.closest("[data-start-edit]")) { e.preventDefault(); setEditing(true); } });
  window.GC.ready = loadImages().then(buildBar);
})();
