/* ==================================================================
   GOOD COMPANY — the shared online layer (Supabase)
   Accounts, profiles, gatherings, the company, libraries and photos.
   Everything people change saves here, so every device and every
   person in a gathering's company sees the same thing.
================================================================== */
(function () {
  const CONFIG = {
    url: "https://vtilfhqkizmtqjncmquj.supabase.co",
    key: "sb_publishable_TcpxQCodGQOJICq7quNesg_U01Xg0yB"
  };
  if (!window.supabase || !window.supabase.createClient) return; // library didn't load: stay local

  const REF = new URL(CONFIG.url).hostname.split(".")[0];
  const STORE_KEY = "sb-" + REF + "-auth-token";
  const client = window.supabase.createClient(CONFIG.url, CONFIG.key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: STORE_KEY }
  });
  const base = location.href.split(/[?#]/)[0].replace(/[^/]*$/, ""); // …/goodcompany/
  const PROFILE_COLS = "id,name,archetype,favorites,allergies,photo,color";
  const G_COLS = "id,owner,is_public,data,updated_at,updated_by";

  const state = { user: null, me: null, profiles: [], member: new Set(), lastG: new Map(), lastLib: null, readonly: new Set() };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const strip = (g) => { const c = clone(g); Object.keys(c).forEach((k) => { if (k[0] === "_") delete c[k]; }); return c; };

  function hasSession() {
    try { const s = JSON.parse(localStorage.getItem(STORE_KEY) || "null"); return !!(s && (s.access_token || (s.currentSession && s.currentSession.access_token))); } catch (e) { return false; }
  }

  /* ---------------- accounts ---------------- */
  async function signUp({ email, password, profile }) {
    // the photo waits on this device until the email is confirmed (it's too big for the sign-up itself)
    const pending = { ...profile, email: email.toLowerCase() };
    try { localStorage.setItem("gc-pending-profile", JSON.stringify(pending)); } catch (e) { delete pending.photo; try { localStorage.setItem("gc-pending-profile", JSON.stringify(pending)); } catch (e2) {} }
    const meta = { name: profile.name, archetype: profile.archetype, favorites: profile.favorites, allergies: profile.allergies, color: profile.color };
    const { data, error } = await client.auth.signUp({ email, password, options: { data: meta, emailRedirectTo: base + "index.html" } });
    if (error) throw error;
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const e = new Error("There's already an account with that email. Log in instead."); e.code = "exists"; throw e;
    }
    return { needsConfirm: !data.session };
  }
  async function signIn(email, password) {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  async function forgot(email) {
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: base + "index.html?reset=1" });
    if (error) throw error;
  }
  async function setPassword(password) {
    const { error } = await client.auth.updateUser({ password });
    if (error) throw error;
  }
  async function signOut() { try { await client.auth.signOut(); } catch (e) {} location.href = "index.html"; }
  async function currentUser() { const { data } = await client.auth.getSession(); return data.session ? data.session.user : null; }

  /* ---------------- profiles ---------------- */
  async function ensureProfile(user) {
    let { data: row } = await client.from("profiles").select(PROFILE_COLS).eq("id", user.id).maybeSingle();
    if (row) return row;
    const meta = user.user_metadata || {};
    let pend = null; try { pend = JSON.parse(localStorage.getItem("gc-pending-profile") || "null"); } catch (e) {}
    if (pend && pend.email !== (user.email || "").toLowerCase()) pend = null;
    const p = { id: user.id, name: meta.name || (pend && pend.name) || (user.email || "").split("@")[0], archetype: meta.archetype || "", favorites: meta.favorites || "",
      allergies: meta.allergies || "", color: meta.color || "tan", photo: "" };
    if (pend && pend.photo) p.photo = await uploadDataURL(pend.photo, "profiles/" + user.id + "-" + Date.now() + ".jpg").catch(() => "");
    await client.from("profiles").upsert(p);
    localStorage.removeItem("gc-pending-profile");
    return p;
  }
  async function saveProfile(p) {
    if (p.photo && p.photo.startsWith("data:")) p.photo = await uploadDataURL(p.photo, "profiles/" + state.user.id + "-" + Date.now() + ".jpg");
    const row = { id: state.user.id, name: p.name, archetype: p.archetype, favorites: p.favorites, allergies: p.allergies, color: p.color || "tan", photo: p.photo || "", updated_at: new Date().toISOString() };
    const { error } = await client.from("profiles").upsert(row);
    if (error) throw error;
    state.me = row;
    const i = state.profiles.findIndex((x) => x.id === row.id); if (i > -1) state.profiles[i] = row; else state.profiles.push(row);
    return row;
  }

  /* ---------------- photos ---------------- */
  async function uploadBlob(blob, path) {
    const { error } = await client.storage.from("photos").upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: true });
    if (error) throw error;
    return client.storage.from("photos").getPublicUrl(path).data.publicUrl;
  }
  async function uploadDataURL(dataUrl, path) { const b = await (await fetch(dataUrl)).blob(); return uploadBlob(b, path); }
  const photoPath = (name) => (state.user ? state.user.id : "anon") + "/" + String(name || "photo").toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40) + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5) + ".jpg";

  /* ---------------- loading everything into GC.data ---------------- */
  function legacyLocal() { // what this device had before the site went online
    let draft = null; try { draft = JSON.parse(localStorage.getItem("gc-draft-v1") || "null"); } catch (e) {}
    const usedBefore = draft || localStorage.getItem("gc-profiles-v1") || localStorage.getItem("gc-session");
    if (!usedBefore || localStorage.getItem("gc-imported")) return null;
    return draft || clone(window.GOOD_COMPANY || {});
  }

  async function load(data) {
    const user = await currentUser();
    state.user = user;
    const empty = { site: {}, recipes: [], activities: [], moodboard: [], gatherings: [], profiles: [] };
    Object.keys(data).forEach((k) => delete data[k]); Object.assign(data, empty);

    if (!user) { // someone with a link to a public gathering, not signed in
      const gid = new URLSearchParams(location.search).get("g");
      if (gid) {
        const { data: row } = await client.from("gatherings").select(G_COLS).eq("id", gid).maybeSingle();
        if (row) { data.gatherings.push({ ...row.data, id: row.id, _owner: row.owner, _public: row.is_public, _readonly: true }); state.readonly.add(row.id); }
      }
      return { user: null };
    }

    state.me = await ensureProfile(user);
    const [profiles, lib, members, gs] = await Promise.all([
      client.from("profiles").select(PROFILE_COLS).order("name"),
      client.from("libraries").select("data").eq("user_id", user.id).maybeSingle(),
      client.from("gathering_members").select("gathering_id").eq("user_id", user.id),
      client.from("gatherings").select(G_COLS).order("updated_at", { ascending: true })
    ]);
    state.profiles = profiles.data || [];
    state.member = new Set((members.data || []).map((m) => m.gathering_id));
    const L = (lib.data && lib.data.data) || {};
    data.site = L.site || {}; data.recipes = L.recipes || []; data.activities = L.activities || []; data.moodboard = L.moodboard || [];
    const linkGid = new URLSearchParams(location.search).get("g");
    (gs.data || []).forEach((row) => {
      const mine = row.owner === user.id || state.member.has(row.id);
      if (!mine && row.id !== linkGid) return; // public gatherings only show when you open their link
      data.gatherings.push({ ...row.data, id: row.id, _owner: row.owner, _public: row.is_public, _readonly: !mine });
      if (!mine) state.readonly.add(row.id);
    });

    // first visit on a device that used the old version: bring those plans online
    const old = legacyLocal();
    if (old) await importLegacy(data, old, user);

    state.lastLib = JSON.stringify(libOf(data));
    data.gatherings.forEach((g) => state.lastG.set(g.id, JSON.stringify(strip(g))));
    subscribe(data);
    return { user, me: state.me };
  }

  async function importLegacy(data, old, user) {
    const addAll = (key) => (old[key] || []).forEach((x) => { if (!data[key].some((y) => y.id === x.id)) data[key].push(x); });
    addAll("recipes"); addAll("activities"); addAll("moodboard");
    if (old.site && !Object.keys(data.site).length) data.site = old.site;
    for (const g of old.gatherings || []) {
      if (data.gatherings.some((x) => x.id === g.id || x.title === g.title)) continue;
      const c = clone(g); delete c.scrapbook;
      (c.guests || []).forEach((p) => { if (p.profileId && !state.profiles.some((x) => x.id === p.profileId)) delete p.profileId; });
      let id = c.id, tries = 0, ok = false;
      while (!ok && tries < 3) {
        const { error } = await client.from("gatherings").insert({ id, owner: user.id, data: { ...c, id } });
        if (!error) ok = true; else { id = c.id + "-" + Math.random().toString(36).slice(2, 6); tries++; }
      }
      if (ok) { c.id = id; data.gatherings.push({ ...c, _owner: user.id, _public: false, _readonly: false }); state.lastG.set(id, JSON.stringify(strip({ ...c }))); }
    }
    await client.from("libraries").upsert({ user_id: user.id, data: libOf(data), updated_at: new Date().toISOString() });
    localStorage.setItem("gc-imported", "1");
  }

  const libOf = (data) => ({ site: data.site || {}, recipes: data.recipes || [], activities: data.activities || [], moodboard: data.moodboard || [] });

  /* ---------------- saving (debounced, only what changed) ---------------- */
  let timer = null, saving = Promise.resolve(), dirty = false;
  function persist(data) {
    if (!state.user) return;
    dirty = true; status("saving");
    clearTimeout(timer);
    timer = setTimeout(() => { saving = saving.then(() => flush(data)); }, 500);
  }
  async function flush(data) {
    dirty = false;
    const now = new Date().toISOString(); const uid = state.user.id; let failed = false;
    try {
      const lib = JSON.stringify(libOf(data));
      if (lib !== state.lastLib) {
        const { error } = await client.from("libraries").upsert({ user_id: uid, data: libOf(data), updated_at: now });
        if (error) failed = true; else state.lastLib = lib;
      }
      const seen = new Set();
      for (const g of data.gatherings) {
        seen.add(g.id);
        if (g._readonly) continue;
        const s = JSON.stringify(strip(g));
        if (!state.lastG.has(g.id)) {
          const { error } = await client.from("gatherings").insert({ id: g.id, owner: uid, data: strip(g), updated_by: uid });
          if (error) failed = true; else { state.lastG.set(g.id, s); g._owner = uid; g._public = false; }
        } else if (state.lastG.get(g.id) !== s) {
          const { error } = await client.from("gatherings").update({ data: strip(g), updated_at: now, updated_by: uid }).eq("id", g.id);
          if (error) failed = true; else state.lastG.set(g.id, s);
        }
      }
      for (const id of [...state.lastG.keys()]) {
        if (seen.has(id)) continue;
        const { error } = await client.from("gatherings").delete().eq("id", id);
        if (!error) state.lastG.delete(id); else failed = true;
      }
    } catch (e) { failed = true; }
    status(failed ? "error" : dirty ? "saving" : "saved");
  }
  function status(s) {
    let el = document.querySelector(".cloud-status");
    if (!el) { el = document.createElement("div"); el.className = "cloud-status"; document.body.appendChild(el); }
    el.dataset.state = s;
    el.textContent = s === "saving" ? "saving…" : s === "error" ? "couldn't save · check your connection" : "saved";
    clearTimeout(el._t); if (s === "saved") el._t = setTimeout(() => (el.dataset.state = ""), 1600);
  }
  window.addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------------- live updates from the rest of the company ---------------- */
  let onRemote = () => {};
  function subscribe(data) {
    try {
      client.channel("gatherings-live").on("postgres_changes", { event: "UPDATE", schema: "public", table: "gatherings" }, (p) => {
        const row = p.new; if (!row || row.updated_by === state.user.id) return;
        const i = data.gatherings.findIndex((g) => g.id === row.id); if (i < 0) return;
        const apply = () => {
          const a = document.activeElement;
          if (dirty || (a && (a.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(a.tagName)))) return setTimeout(apply, 1500);
          client.from("gatherings").select(G_COLS).eq("id", row.id).maybeSingle().then(({ data: fresh }) => {
            if (!fresh) return;
            const old = data.gatherings[i];
            data.gatherings[i] = { ...fresh.data, id: fresh.id, _owner: fresh.owner, _public: fresh.is_public, _readonly: old._readonly };
            state.lastG.set(fresh.id, JSON.stringify(strip(data.gatherings[i])));
            onRemote(fresh.id);
          });
        };
        apply();
      }).subscribe();
    } catch (e) {}
  }

  /* ---------------- the company ---------------- */
  async function addMember(gid, userId) {
    const { error } = await client.from("gathering_members").insert({ gathering_id: gid, user_id: userId });
    if (error && !/duplicate/i.test(error.message)) throw error;
  }
  async function removeMember(gid, userId) { await client.from("gathering_members").delete().eq("gathering_id", gid).eq("user_id", userId); }
  async function inviteLink(gid) {
    const { data, error } = await client.rpc("invite_code_for", { gid });
    if (error || !data) throw error || new Error("no code");
    return base + "gathering.html?g=" + encodeURIComponent(gid) + "&join=" + data;
  }
  async function join(gid, code) { const { data, error } = await client.rpc("join_gathering", { gid, code }); if (error) throw error; return !!data; }
  async function setPublic(gid, on) { const { error } = await client.from("gatherings").update({ is_public: on }).eq("id", gid); if (error) throw error; }
  async function flushNow(data) { clearTimeout(timer); await (saving = saving.then(() => flush(data))); }

  window.Cloud = {
    client, base, hasSession, signUp, signIn, forgot, setPassword, signOut, currentUser, load, persist, flushNow,
    saveProfile, uploadBlob, photoPath, addMember, removeMember, inviteLink, join, setPublic,
    get me() { return state.me; }, get user() { return state.user; }, get profiles() { return state.profiles; },
    isOwner: (g) => !!(state.user && g && g._owner === state.user.id),
    set onRemote(fn) { onRemote = fn; }
  };
})();
