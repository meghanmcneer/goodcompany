/* ==================================================================
   GOOD COMPANY — welcome: create an account, log in, reset a password,
   or edit your profile
================================================================== */
(function () {
  const { esc, toast } = GC;
  const A = window.Auth, C = window.Cloud;
  const root = document.querySelector("#welcome");
  const params = new URLSearchParams(location.search);
  const recovering = params.get("reset") === "1" || /type=recovery/.test(location.hash);

  let mode = "create", photo = "", current = null, notice = null;

  const eye = '<button type="button" class="pw-eye" data-eye aria-label="show password">show</button>';
  const pwField = (name, label, auto) => '<div class="field"><label>' + label + '</label><div class="pw-wrap"><input name="' + name + '" type="password" minlength="8" autocomplete="' + auto + '">' + eye + "</div></div>";

  function profileFields(p) {
    p = p || {};
    return '<label class="photo-drop' + (photo ? " has-photo" : "") + '" style="' + (photo ? "background-image:url('" + esc(photo) + "')" : "") + '">' +
      '<input type="file" accept="image/*" hidden><span class="photo-hint">' + (photo ? "change photo" : "+ add a photo of you") + "</span></label>" +
      '<div class="field"><label>Your name</label><input name="name" autocomplete="name" value="' + esc(p.name || "") + '" placeholder="Meghan"></div>' +
      (mode === "create" ? '<div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" placeholder="you@example.com"></div>' + pwField("password", "Password · at least 8 characters", "new-password") : "") +
      '<div class="field"><label>Your guest archetype</label><div class="arch-grid">' +
      A.ARCHETYPES.map(([id, l, line]) => '<label class="arch"><input type="radio" name="archetype" value="' + id + '"' + (p.archetype === id ? " checked" : "") + '><span><b>' + esc(l) + "</b><small>" + esc(line) + "</small></span></label>").join("") +
      "</div></div>" +
      '<div class="field"><label>A sentence about your favorite things</label><textarea name="favorites" rows="3" placeholder="cold martinis, a long walk after dinner, anything with tomatoes">' + esc(p.favorites || "") + "</textarea></div>" +
      '<div class="field"><label>Allergies</label><input name="allergies" value="' + esc(p.allergies || "") + '" placeholder="shellfish, tree nuts, or none"></div>';
  }

  const VIEWS = {
    create: () => '<form class="pf-form" data-form="create" novalidate>' + profileFields() + '<div class="modal-actions"><button class="btn" type="submit">pull up a chair</button></div></form>',
    login: () => '<form data-form="login" novalidate><div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" placeholder="you@example.com"></div>' + pwField("password", "Password", "current-password") +
      '<div class="modal-actions"><button class="btn" type="submit">log in</button><button type="button" class="text-btn" data-mode="forgot">forgot your password?</button></div></form>',
    forgot: () => '<form data-form="forgot" novalidate><p class="hint">Type your email and we\'ll send a link to choose a new password.</p><div class="field"><label>Email</label><input name="email" type="email" autocomplete="email"></div>' +
      '<div class="modal-actions"><button class="btn" type="submit">send the link</button><button type="button" class="text-btn" data-mode="login">back to log in</button></div></form>',
    reset: () => '<form data-form="reset" novalidate><p class="hint">Choose a new password for your account.</p>' + pwField("password", "New password · at least 8 characters", "new-password") +
      '<div class="modal-actions"><button class="btn" type="submit">save my new password</button></div></form>',
    edit: () => '<form class="pf-form" data-form="edit" novalidate>' + profileFields(current) +
      '<div class="modal-actions"><button class="btn" type="submit">save my profile</button><a class="btn ghost" href="home.html">cancel</a><button class="del" type="button" data-logout>log out</button></div></form>',
    sent: () => '<div class="sent"><p class="hed">check your email</p><p>' + esc(notice || "") + '</p><button type="button" class="text-btn" data-mode="login">back to log in</button></div>'
  };
  const LEDE = {
    create: "Pull up a chair. Make an account so friends can find you and add you to their gatherings.",
    login: "Welcome back. Log in to see your gatherings.",
    forgot: "It happens to the best hosts.", reset: "Almost back to the table.",
    edit: "Your profile. Friends see this when they add you to a gathering.", sent: ""
  };

  function render() {
    const tabs = mode === "create" || mode === "login";
    root.innerHTML = '<div class="welcome-card"><div class="welcome-mark"><img class="fork" src="images/fork.png" alt=""><h1 class="hed">Good Company</h1></div>' +
      (LEDE[mode] ? '<p class="lede">' + LEDE[mode] + "</p>" : "") +
      (tabs ? '<div class="seg"><button type="button" data-mode="create" class="' + (mode === "create" ? "on" : "") + '">create an account</button><button type="button" data-mode="login" class="' + (mode === "login" ? "on" : "") + '">log in</button></div>' : "") +
      VIEWS[mode]() + "</div>";
  }
  const busy = (form, on) => { const b = form.querySelector('[type="submit"]'); if (b) { b.disabled = on; b.style.opacity = on ? 0.6 : ""; } };
  function goOn() {
    let to = "home.html";
    try { const r = localStorage.getItem("gc-return"); if (r && r.startsWith(C.base)) to = r; localStorage.removeItem("gc-return"); } catch (e) {}
    location.href = to;
  }
  const niceError = (err) => {
    const m = String((err && err.message) || "");
    if (/invalid login/i.test(m)) return "That email and password don't match. Try again or reset your password.";
    if (/not confirmed/i.test(m)) return "Confirm your email first: check your inbox for the link from Good Company.";
    if (/already registered|already exists/i.test(m)) return "There's already an account with that email. Log in instead.";
    if (/rate limit|too many/i.test(m)) return "Too many tries for now. Wait a few minutes and try again.";
    if (/password/i.test(m)) return m;
    return m || "Something went wrong. Check your connection and try again.";
  };

  root.addEventListener("click", (e) => {
    const m = e.target.closest("[data-mode]"); if (m) { mode = m.dataset.mode; render(); return; }
    if (e.target.closest("[data-logout]")) return A.logout();
    const eyeBtn = e.target.closest("[data-eye]");
    if (eyeBtn) { const i = eyeBtn.previousElementSibling; const show = i.type === "password"; i.type = show ? "text" : "password"; eyeBtn.textContent = show ? "hide" : "show"; }
  });
  root.addEventListener("change", async (e) => {
    if (e.target.type !== "file") return;
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      photo = await A.photoToDataURL(f);
      const drop = root.querySelector(".photo-drop");
      drop.style.backgroundImage = "url('" + photo + "')"; drop.classList.add("has-photo");
      drop.querySelector(".photo-hint").textContent = "change photo";
    } catch (err) { toast("That file didn't load as a photo. Try a JPG or PNG."); }
  });
  root.addEventListener("submit", async (e) => {
    e.preventDefault(); const f = e.target; const kind = f.dataset.form;
    const val = (n) => ((f.querySelector('[name="' + n + '"]') || {}).value || "").trim();
    const arch = f.querySelector('[name="archetype"]:checked');
    const profile = () => ({ name: val("name"), archetype: arch ? arch.value : "", favorites: val("favorites"), allergies: val("allergies"), photo,
      color: (current && current.color) || ["tan", "ice", "orange", "butter"][Math.floor(Math.random() * 4)] });
    busy(f, true);
    try {
      if (kind === "login") {
        if (!val("email") || !val("password")) throw new Error("Add your email and password.");
        await C.signIn(val("email"), val("password")); return goOn();
      }
      if (kind === "forgot") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val("email"))) throw new Error("That email doesn't look quite right.");
        await C.forgot(val("email")); notice = "If there's an account for " + val("email") + ", a link to choose a new password is on its way."; mode = "sent"; return render();
      }
      if (kind === "reset") {
        if (val("password").length < 8) throw new Error("Make it at least 8 characters.");
        await C.setPassword(val("password")); toast("New password saved."); return goOn();
      }
      const p = profile();
      if (!p.name) throw new Error("Add your name first.");
      if (!p.archetype) throw new Error("Pick your guest archetype.");
      if (kind === "edit") { await A.saveProfile(p); toast("Saved."); location.href = "home.html"; return; }
      // create
      const email = val("email").toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("That email doesn't look quite right.");
      if (val("password").length < 8) throw new Error("Make your password at least 8 characters.");
      const r = await C.signUp({ email, password: val("password"), profile: p });
      if (r.needsConfirm) { notice = "We sent a link to " + email + ". Tap it to confirm your email, and you're in."; mode = "sent"; return render(); }
      return goOn();
    } catch (err) { toast(niceError(err)); }
    finally { busy(f, false); }
  });

  async function start() {
    if (!C) { root.innerHTML = '<div class="welcome-card"><p class="lede">Good Company couldn\'t load. Check your connection and refresh.</p></div>'; return; }
    C.client.auth.onAuthStateChange((evt) => { if (evt === "PASSWORD_RECOVERY") { mode = "reset"; render(); } });
    const user = await C.currentUser();
    if (user && recovering) { mode = "reset"; return render(); }
    if (user && location.hash === "#edit") {
      await GC.ready; current = A.me(); photo = (current && current.photo) || ""; mode = "edit"; return render();
    }
    if (user) { await GC.ready; return goOn(); }
    if (recovering) { notice = "That reset link has expired. Ask for a new one."; mode = "forgot"; }
    render();
  }
  start();
})();
