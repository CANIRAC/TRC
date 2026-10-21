/* CANIRAC Laguna — App web (PWA): service worker, instalación y bloqueo de zoom.
   Lo usan index.html (catálogo) y admin.html (panel). */
(function () {

  // ---------- 1) Sin zoom manual (pellizco, doble toque, Ctrl + rueda / Ctrl +/-) ----------
  // El viewport ya pide user-scalable=no; iPhone lo ignora, por eso se bloquea aquí.
  var block = function (e) { e.preventDefault(); };
  document.addEventListener("gesturestart", block, { passive: false });
  document.addEventListener("gesturechange", block, { passive: false });
  document.addEventListener("gestureend", block, { passive: false });
  document.addEventListener("touchmove", function (e) {
    if ((e.touches && e.touches.length > 1) || (typeof e.scale === "number" && e.scale !== 1)) e.preventDefault();
  }, { passive: false });
  window.addEventListener("wheel", function (e) { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  window.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "_", "0"].indexOf(e.key) >= 0) e.preventDefault();
  });

  // ---------- 2) Botón "Instalar app" ----------
  // Cualquier elemento con [data-pwa-install] se muestra cuando se puede instalar.
  var deferred = null;
  var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  function buttons() { return document.querySelectorAll("[data-pwa-install]"); }
  function showButtons(on) { buttons().forEach(function (b) { b.hidden = !on; }); }

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    showButtons(true);
  });
  window.addEventListener("appinstalled", function () { deferred = null; showButtons(false); });

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-pwa-install]");
    if (!b) return;
    e.preventDefault();
    if (deferred) {
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; showButtons(false); });
    } else if (isIOS) {
      alert("Para instalar la app en tu iPhone:\n\n1. Toca el botón Compartir (el cuadro con la flecha ↑) de Safari.\n2. Elige “Agregar a pantalla de inicio”.\n3. Abre la app desde el ícono nuevo.");
    }
  });
  // En iPhone no existe beforeinstallprompt: mostramos el botón con instrucciones.
  if (isIOS && !standalone) {
    document.addEventListener("DOMContentLoaded", function () { showButtons(true); });
  }

  // ---------- 3) Service worker (funciona sin conexión y es instalable) ----------
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").then(function (reg) {
      // Busca actualizaciones cada vez que se abre. El código se descarga siempre
      // de la red cuando hay internet (ver sw.js), así que no hace falta recargar.
      reg.update && reg.update();
    }).catch(function () {});
  });
})();
