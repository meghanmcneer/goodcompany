/* ==================================================================
   GOOD COMPANY — welcome: create a profile, log in, or edit yours
================================================================== */
(function () {
  const { esc, toast, uid } = GC;
  const A = window.Auth;
  const root = document.querySelector("#welcome");

  const current = A.me();
  const editing = location.hash === "#edit" && current;
  if (current && !editing) { location.replace("home.html"); return; }

  let mode = editing ? "edit" : "create";
  let photo = editing ? current.photo || "" : "";

  function profileForm(p) {
    p = p || {};
    return '<form class="pf-form" novalidate>' +
      '<label class="photo-drop' + (photo ? " has-photo" : "") + '" style="' + (photo ? "background-image:url('" + esc(photo) + "')" : "") + '">' +
      '<input type="file" accept="image/*" hidden><span class="photo-hint">' + (photo ? "change photo" : "+ add a photo of you") + "</span></label>" +
      '<div class="field"><label>Your name</label><input name="name" autocomplete="name" value="' + esc(p.name || "") + '" placeholder="Meghan"></div>' +
      '<div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" value="' + esc(p.email || "") + '" placeholder="you@example.com"></div>' +
      '<div class="field"><label>Your guest archetype</label><div class="arch-grid">' +
      A.ARCHETYPES.map(([id, l, line]) => '<label class="arch"><input type="radio" name="archetype" value="' + id + '"' + (p.archetype === id ? " checked" : "") + '><span><b>' + esc(l) + "</b><small>" + esc(line) + "</small></span></label>").join("") +
      "</div></div>" +
      '<div class="field"><label>A sentence about your favorite things</label><textarea name="favorites" rows="3" placeholder="cold martinis, a long walk after dinner, anything with tomatoes">' + esc(p.favorites || "") + "</textarea></div>" +
      '<div class="field"><label>Allergies</label><input name="allergies" value="' + esc(p.allergies || "") + '" placeholder="shellfish, tree nuts, or none"></div>' +
      '<div class="modal-actions"><button class="btn" type="submit">' + (mode === "edit" ? "save my profile" : "pull up a chair") + "</button>" +
      (mode === "edit" ? '<a class="btn ghost" href="home.html">cancel</a><button class="del" type="button" data-logout>log out</button>' : "") + "</div></form>";
  }
  const loginForm = () =>
    '<form class="login-form" novalidate><div class="field"><label>Email</label><input name="email" type="email" autocomplete="email" placeholder="you@example.com"></div>' +
    '<div class="modal-actions"><button class="btn" type="submit">log in</button></div><p class="hint" data-msg></p></form>';

  function render() {
    root.innerHTML =
      '<div class="welcome-card">' +
      '<div class="welcome-mark"><img class="fork" src="images/fork.png" alt=""><h1 class="hed">Good Company</h1></div>' +
      '<p class="lede">' + (mode === "edit" ? "Your profile. Friends see this when they add you to a gathering." : "Pull up a chair. Make a profile so friends can find you and add you to their gatherings.") + "</p>" +
      (mode === "edit" ? "" : '<div class="seg"><button type="button" data-mode="create" class="' + (mode === "create" ? "on" : "") + '">create a profile</button><button type="button" data-mode="login" class="' + (mode === "login" ? "on" : "") + '">log in</button></div>') +
      (mode === "login" ? loginForm() : profileForm(mode === "edit" ? current : {})) +
      "</div>";
  }

  root.addEventListener("click", (e) => {
    const m = e.target.closest("[data-mode]"); if (m) { mode = m.dataset.mode; render(); return; }
    if (e.target.closest("[data-logout]")) A.logout();
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
  root.addEventListener("submit", (e) => {
    e.preventDefault(); const f = e.target;
    const val = (n) => ((f.querySelector('[name="' + n + '"]') || {}).value || "").trim();
    if (f.classList.contains("login-form")) {
      const p = A.byEmail(val("email"));
      if (!p) { f.querySelector("[data-msg]").textContent = "No profile with that email on this device yet. Create one instead?"; return; }
      A.login(p.id); location.href = "home.html"; return;
    }
    const arch = f.querySelector('[name="archetype"]:checked');
    const p = {
      id: mode === "edit" ? current.id : "p-" + uid() + uid(),
      name: val("name"), email: val("email").toLowerCase(), archetype: arch ? arch.value : "",
      favorites: val("favorites"), allergies: val("allergies"), photo,
      color: mode === "edit" ? current.color : ["tan", "ice", "orange", "butter"][Math.floor(Math.random() * 4)]
    };
    if (!p.name) return toast("Add your name first.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) return toast("That email doesn't look quite right.");
    if (!p.archetype) return toast("Pick your guest archetype.");
    const clash = A.byEmail(p.email); if (clash && clash.id !== p.id) return toast("There's already a profile with that email. Log in instead.");
    if (!A.saveProfile(p)) return;
    A.login(p.id);
    location.href = "home.html";
  });

  render();
})();
