/* ==================================================================
   GOOD COMPANY — home: two choices
================================================================== */
(function () {
  const me = window.Auth && Auth.me(); if (!me) return;
  const hi = document.querySelector("#hi");
  if (hi) hi.textContent = "Hi, " + me.name.split(" ")[0];
})();
