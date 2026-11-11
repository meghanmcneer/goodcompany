/* ==================================================================
   GOOD COMPANY — profiles
   Online (cloud.js): real accounts with passwords, profiles everyone in
   Good Company can find. Offline fallback: profiles live in this browser.
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

  const C = window.Cloud || null; // online accounts (Supabase); the local versions below are the offline fallback

  /* ---------- store ---------- */
  const seed = (window.GOOD_COMPANY.profiles || []).map((p) => ({ ...p, sample: true }));
  function local() { try { return JSON.parse(localStorage.getItem(PKEY) || "[]"); } catch (e) { return []; } }
  function all() { if (C) return C.profiles; const l = local(); const ids = new Set(l.map((p) => p.id)); return l.concat(seed.filter((p) => !ids.has(p.id))); }
  function saveProfile(p) {
    if (C) return C.saveProfile(p);
    const l = local(); const i = l.findIndex((x) => x.id === p.id);
    if (i > -1) l[i] = p; else l.push(p);
    try { localStorage.setItem(PKEY, JSON.stringify(l)); return true; }
    catch (e) { toast("That photo is too big to save here. Try a smaller one."); return false; }
  }
  const byEmail = (email) => local().find((p) => (p.email || "").toLowerCase() === String(email || "").trim().toLowerCase()) || null;

  /* ---------- session ---------- */
  const me = () => { if (C) return C.me; const id = localStorage.getItem(SKEY); return id ? all().find((p) => p.id === id) || null : null; };
  const login = (id) => localStorage.setItem(SKEY, id);
  function logout() { if (C) return C.signOut(); localStorage.removeItem(SKEY); location.href = "index.html"; }

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
  if (C) {
    const params = new URLSearchParams(location.search);
    const publicLink = document.body.classList.contains("gathering") && params.get("g") && !params.get("join");
    if (!isWelcome && !C.hasSession() && !publicLink) {
      try { localStorage.setItem("gc-return", location.href); } catch (e) {}
      location.replace("index.html");
    }
  } else if (!isWelcome && !me()) location.replace("index.html");

  /* ---------- header: your avatar + a little menu ---------- */
  function header() {
    const hr = document.querySelector(".head-right"); const m = me();
    if (hr && !m && C) { hr.innerHTML = '<a class="btn ghost" href="index.html">log in</a>'; return; }
    if (!hr || !m) return;
    hr.innerHTML = '<button class="me-btn" type="button" aria-label="your profile">' + avatar(m, "sm") + '</button>' +
      '<div class="me-menu" hidden><div class="me-top">' + avatar(m, "md") + "<div><b>" + esc(m.name) + "</b><small>" + esc(archLabel(m.archetype)) + "</small></div></div>" +
      '<a href="index.html#edit">edit my profile</a>' + (C ? '<button type="button" data-password>change password</button>' : "") +
      '<button type="button" data-type>type &amp; spacing</button><a href="home.html">home</a><button type="button" data-logout class="out">log out</button></div>';
    const menu = hr.querySelector(".me-menu");
    hr.querySelector(".me-btn").addEventListener("click", (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
    document.addEventListener("click", (e) => { if (!hr.contains(e.target)) menu.hidden = true; });
    hr.querySelector("[data-logout]").addEventListener("click", logout);
    hr.querySelector("[data-type]").addEventListener("click", () => { menu.hidden = true; if (window.UI) UI.typePanel(); });
    const pw = hr.querySelector("[data-password]");
    if (pw) pw.addEventListener("click", () => {
      menu.hidden = true;
      UI.open(UI.top("Your account", "change password") + '<form class="pw-form"><div class="field"><label>New password · at least 8 characters</label><input name="pw" type="password" minlength="8" autocomplete="new-password" required></div>' +
        '<div class="modal-actions"><button class="btn" type="submit">save it</button><button class="btn ghost" type="button" data-close>cancel</button></div></form>', (mm) => {
        mm.querySelector("form").addEventListener("submit", async (e) => {
          e.preventDefault(); const v = mm.querySelector("[name=pw]").value;
          if (v.length < 8) return toast("Make it at least 8 characters.");
          try { await C.setPassword(v); UI.close(); toast("Password changed."); } catch (err) { toast(err.message || "Couldn't change it. Try again."); }
        });
      });
    });
  }

  window.Auth = { ARCHETYPES, archLabel, archLine, all, me, login, logout, saveProfile, byEmail, search, photoToDataURL, avatar };
  GC.ready.then(header);
})();
