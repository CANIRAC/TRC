/* Registro del Service Worker + aviso de nueva versión (CANIRAC Laguna) */
(function () {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").then(function (reg) {
      // Detecta cuando hay una nueva versión lista
      reg.addEventListener("updatefound", function () {
        var nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", function () {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateBanner(nw);
          }
        });
      });
      // Busca actualizaciones cada vez que se abre
      reg.update && reg.update();
    }).catch(function () {});

    // Recarga solo cuando se aplica una ACTUALIZACIÓN (no en la primera instalación)
    var refreshing = false;
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (!hadController) { hadController = true; return; } // primera instalación: no recargar
      if (refreshing) return;
      refreshing = true;
      location.reload();
    });
  });

  function showUpdateBanner(worker) {
    if (document.getElementById("pwa-update")) return;
    var b = document.createElement("div");
    b.id = "pwa-update";
    b.innerHTML = '<span>Hay una nueva versión disponible</span><button type="button">Actualizar</button>';
    document.body.appendChild(b);
    b.querySelector("button").addEventListener("click", function () {
      worker.postMessage("skipWaiting");
      b.remove();
    });
  }
})();
