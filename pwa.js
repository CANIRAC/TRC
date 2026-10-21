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

  // ---------- 2) Mini tutorial "Cómo instalar la app" ----------
  // Cualquier elemento con [data-pwa-install] abre el tutorial (catálogo y panel).
  var deferred = null;
  var standalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  var ua = navigator.userAgent;
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  var isAndroid = /android/i.test(ua);
  var isAdmin = /admin(\.html)?$/i.test(location.pathname);
  var APP = isAdmin ? "el Panel de administración" : "el Catálogo de Proveedores";

  var IC = {
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/></svg>',
    dots: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
    install: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="13" rx="2"/><path d="M12 7v6M9 10l3 3 3-3M8 21h8"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };
  function ic(n) { return '<span class="inst-ic">' + IC[n] + "</span>"; }
  var GUIDES = {
    ios: {
      tab: "iPhone / iPad",
      steps: [
        "Abre esta página en <b>Safari</b>.",
        "Toca el botón <b>Compartir</b> " + ic("share") + " (abajo en iPhone, arriba en iPad).",
        "Desliza hacia abajo y elige <b>“Agregar a pantalla de inicio”</b> " + ic("plus") + ".",
        "Toca <b>Agregar</b>. Abre la app desde el ícono de CANIRAC en tu pantalla de inicio."
      ],
      note: "En iPhone, los avisos (notificaciones) solo funcionan si abres la app desde ese ícono."
    },
    android: {
      tab: "Android",
      steps: [
        "Abre esta página en <b>Chrome</b>.",
        "Toca <b>“Instalar ahora”</b> (abajo) o el menú " + ic("dots") + " arriba a la derecha.",
        "Elige <b>“Instalar app”</b> o <b>“Agregar a la pantalla principal”</b>.",
        "Confirma con <b>Instalar</b>. La app aparecerá con tus demás aplicaciones."
      ],
      note: "Si no ves la opción, actualiza Chrome desde la Play Store."
    },
    pc: {
      tab: "Computadora",
      steps: [
        "Abre esta página en <b>Google Chrome</b> o <b>Microsoft Edge</b>.",
        "Haz clic en <b>“Instalar ahora”</b> (abajo) o en el ícono " + ic("install") + " a la derecha de la barra de direcciones.",
        "Confirma con <b>Instalar</b>.",
        "La app se abre en su propia ventana y queda en el menú Inicio / escritorio (o en el Dock en Mac)."
      ],
      note: "En Mac con Safari: menú <b>Archivo → Agregar al Dock</b>."
    }
  };

  var modal = null, current = isIOS ? "ios" : isAndroid ? "android" : "pc";
  function paint() {
    var g = GUIDES[current];
    var body = modal.querySelector(".modal-body");
    var html = "";
    if (standalone) html += '<div class="inst-done">✓ Ya estás usando la app instalada.</div>';
    html += '<div class="inst-tabs">' + Object.keys(GUIDES).map(function (k) {
      return '<button type="button" class="inst-tab' + (k === current ? " active" : "") + '" data-k="' + k + '">' + GUIDES[k].tab + "</button>";
    }).join("") + "</div>";
    html += '<ol class="inst-steps">' + g.steps.map(function (s) { return "<li><span>" + s + "</span></li>"; }).join("") + "</ol>";
    if (deferred && current !== "ios") html += '<button type="button" class="btn-primary inst-now">Instalar ahora</button>';
    html += '<div class="inst-note">' + g.note + (isAdmin ? "<br>El panel se instala como una app distinta del catálogo." : "") + "</div>";
    body.innerHTML = html;
    body.querySelectorAll(".inst-tab").forEach(function (b) { b.onclick = function () { current = b.getAttribute("data-k"); paint(); }; });
    var now = body.querySelector(".inst-now");
    if (now) now.onclick = function () {
      deferred.prompt();
      deferred.userChoice.finally(function () { deferred = null; close(); });
    };
  }
  function open() {
    if (!modal) {
      modal = document.createElement("div");
      modal.className = "modal-overlay inst-modal";
      modal.innerHTML = '<div class="modal" style="max-width:480px" role="dialog" aria-modal="true" aria-label="Cómo instalar la app">' +
        '<div class="modal-head" style="background:var(--grad)"><button class="m-close" type="button" aria-label="Cerrar">' + IC.close + "</button>" +
        '<div class="mh-cat">Mini tutorial</div><h3>Instala ' + APP + "</h3></div>" +
        '<div class="modal-body"></div></div>';
      document.body.appendChild(modal);
      modal.addEventListener("click", function (e) { if (e.target === modal || e.target.closest(".m-close")) close(); });
    }
    paint();
    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function close() {
    if (!modal) return;
    modal.classList.remove("open");
    if (!document.querySelector(".modal-overlay.open,.drawer.open")) document.body.style.overflow = "";
  }
  window.caniracInstallHelp = open;

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    if (modal && modal.classList.contains("open")) paint();
  });
  window.addEventListener("appinstalled", function () { deferred = null; close(); });
  window.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal && modal.classList.contains("open")) close(); });

  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-pwa-install]");
    if (!b) return;
    e.preventDefault();
    open();
  });

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
