/* ==================================================================
   GOOD COMPANY — profiles
   PROTOTYPE: profiles and the login live in this browser (localStorage).
   Friends you can search = any profile made on this device. Swap the four "store" functions below for a real
   backend (Supabase, Firebase) to share profiles between people.
   Profiles are never included in "export for GitHub" (emails stay private).
================================================================== */
(function () {
  const PKEY = "gc-profiles-v1", SKEY = "gc-session";
  const { esc, toast } = GC;

  const ARCHETYPES = [
    ["host-energy", "Host energy", "sets the table, sets the tone"],
    ["chatty", "The chatty one", "never met a lull they couldn't fill"],
    ["closer", "The closer", "last one out, lights off"],
    ["dish-washer", "Dish washer extraordinaire", "sleeves up before dessert"],
    ["toast-giver", "The toast giver", "glass raised, speech ready"],
    ["playlist", "Playlist keeper", "the aux cord is theirs"],
    ["cheese-board", "Cheese board architect", "a wedge for every mood"],
    ["early-arriver", "The early arriver", "here to help with the ice"],
    ["snack-scout", "Snack scout", "knows where the good chips are"],
    ["wildcard", "The plus-one wildcard", "brings a story and a stranger"]
  ];
  const archLabel = (id) => (ARCHETYPES.find((a) => a[0] === id) || [, id || ""])[1];
  const archLine = (id) => (ARCHETYPES.find((a) => a[0] === id) || [, , ""])[2];

  /* ---------- store (swap these for a backend later) ---------- */
  const seed = (window.GOOD_COMPANY.profiles || []).map((p) => ({ ...p, sample: true }));
  function local() { try { return JSON.parse(localStorage.getItem(PKEY) || "[]"); } catch (e) { return []; } }
  function all() { const l = local(); const ids = new Set(l.map((p) => p.id)); return l.concat(seed.filter((p) => !ids.has(p.id))); }
  function saveProfile(p) {
    const l = local(); const i = l.findIndex((x) => x.id === p.id);
    if (i > -1) l[i] = p; else l.push(p);
    try { localStorage.setItem(PKEY, JSON.stringify(l)); return true; }
    catch (e) { toast("That photo is too big to save here. Try a smaller one."); return false; }
  }
  const byEmail = (email) => local().find((p) => (p.email || "").toLowerCase() === String(email || "").trim().toLowerCase()) || null;

  /* ---------- session ---------- */
  const me = () => { const id = localStorage.getItem(SKEY); return id ? all().find((p) => p.id === id) || null : null; };
  const login = (id) => localStorage.setItem(SKEY, id);
  function logout() { localStorage.removeItem(SKEY); location.href = "index.html"; }

  function search(q) {
    q = String(q || "").toLowerCase().trim();
    return all().filter((p) => !q || [p.name, p.email, archLabel(p.archetype), p.favorites].join(" ").toLowerCase().includes(q))
      .sort((a, b) => (a.sample === b.sample ? a.name.localeCompare(b.name) : a.sample ? 1 : -1));
  }

  /* ---------- photos: squared + shrunk so they fit in the browser ---------- */
  function photoToDataURL(file, size = 360) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file); const im = new Image();
      im.onload = () => {
        const s = Math.min(im.width, im.height); const c = document.createElement("canvas"); c.width = c.height = size;
        c.getContext("2d").drawImage(im, (im.width - s) / 2, (im.height - s) / 2, s, s, 0, 0, size, size);
        URL.revokeObjectURL(url); resolve(c.toDataURL("image/jpeg", 0.82));
      };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error("not an image")); };
      im.src = url;
    });
  }
  const TONES = ["tan", "ice", "orange", "butter"];
  function avatar(p, cls) {
    if (!p) return '<span class="pf ' + (cls || "") + '">?</span>';
    const tone = p.color || TONES[(p.name || "").length % TONES.length];
    return p.photo
      ? '<span class="pf has-photo ' + (cls || "") + '" style="background-image:url(\'' + esc(p.photo) + '\')"></span>'
      : '<span class="pf tone-' + tone + " " + (cls || "") + '">' + esc((p.name || "?").trim()[0] || "?") + "</span>";
  }

  /* ---------- the gate: every page but the welcome screen needs a profile ---------- */
  const isWelcome = document.body.classList.contains("welcome");
  if (!isWelcome && !me()) location.replace("index.html");

  /* ---------- header: your avatar + a little menu ---------- */
  function header() {
    const hr = document.querySelector(".head-right"); const m = me(); if (!hr || !m) return;
    hr.innerHTML = '<button class="me-btn" type="button" aria-label="your profile">' + avatar(m, "sm") + '</button>' +
      '<div class="me-menu" hidden><div class="me-top">' + avatar(m, "md") + "<div><b>" + esc(m.name) + "</b><small>" + esc(archLabel(m.archetype)) + "</small></div></div>" +
      '<a href="index.html#edit">edit my profile</a><a href="home.html">home</a><button type="button" data-logout>log out</button></div>';
    const menu = hr.querySelector(".me-menu");
    hr.querySelector(".me-btn").addEventListener("click", (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
    document.addEventListener("click", (e) => { if (!hr.contains(e.target)) menu.hidden = true; });
    hr.querySelector("[data-logout]").addEventListener("click", logout);
  }

  window.Auth = { ARCHETYPES, archLabel, archLine, all, me, login, logout, saveProfile, byEmail, search, photoToDataURL, avatar };
  GC.ready.then(header);
})();
