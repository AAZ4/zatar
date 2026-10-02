/*
 * Ladebildschirm + Sprachauswahl (wird direkt nach dem Loader-HTML geladen)
 * - Fortschritt folgt dem echten Laden (HTML, Schriften, 3D-Modell)
 * - erster Besuch: mind. 0,9 s sichtbar (kein Aufblitzen), danach nur kurz
 * - spätestens nach 5 s ist das Laden "fertig"
 * - Beim allerersten Besuch (keine gespeicherte Sprache) verwandelt sich der
 *   Ladebildschirm in die Sprachauswahl Deutsch | العربية. Die Wahl wird gespeichert.
 */
(function () {
  "use strict";
  var root = document.documentElement;
  var el = document.getElementById("loader");
  var bar = document.getElementById("loaderBar");
  var pick = document.getElementById("langPick");
  var pageLang = root.lang === "ar" ? "ar" : "de";

  var store = {
    get: function (k, s) { try { return (s ? sessionStorage : localStorage).getItem(k); } catch (e) { return null; } },
    set: function (k, v, s) { try { (s ? sessionStorage : localStorage).setItem(k, v); } catch (e) {} }
  };
  var seen = store.get("zatarSeen", true) === "1";
  var chosen = store.get("zatarLang");
  var needChoice = !chosen && !!pick;

  root.classList.add("is-loading");
  var start = performance.now();
  var minTime = seen ? 250 : 900, maxTime = 5000;
  var progress = 0, target = 0.12, finished = false, resolveReady;
  window.zatarReady = new Promise(function (r) { resolveReady = r; });
  window.zatarProgress = function (p) { if (p > target) target = p; };

  (function tick() {
    progress += (target - progress) * 0.09;
    bar.style.transform = "scaleX(" + progress.toFixed(3) + ")";
    if (!finished) requestAnimationFrame(tick);
  })();

  // Vorhang hoch -> Seite zeigen
  function reveal() {
    root.classList.add("is-loaded");
    root.classList.remove("is-loading", "is-choosing");
    store.set("zatarSeen", "1", true);
    setTimeout(resolveReady, 250);                 // Inhalte starten, während der Vorhang hochgleitet
    setTimeout(function () { el.remove(); }, 1200);
  }

  // Sprachauswahl anzeigen (erster Besuch)
  function showPicker() {
    root.classList.add("is-choosing");
    el.removeAttribute("aria-hidden");
    pick.hidden = false;
    var langs = (navigator.languages || [navigator.language || ""]).join(",").toLowerCase();
    var suggested = /(^|,)ar/.test(langs) ? "ar" : pageLang;
    var options = pick.querySelectorAll("[data-lang]");
    var focusEl = null;
    for (var i = 0; i < options.length; i++) {
      var on = options[i].getAttribute("data-lang") === suggested;
      options[i].classList.toggle("is-suggested", on);
      if (on) focusEl = options[i];
    }
    setTimeout(function () { if (focusEl) focusEl.focus({ preventScroll: true }); }, 350);
  }

  if (pick) {
    pick.addEventListener("click", function (e) {
      var a = e.target.closest("[data-lang]");
      if (!a) return;
      var lang = a.getAttribute("data-lang");
      store.set("zatarLang", lang);
      store.set("zatarSeen", "1", true);            // nächster Ladebildschirm nur kurz
      if (lang === pageLang) { e.preventDefault(); reveal(); }
      // sonst: normaler Link zur anderen Sprachversion
    });
  }

  window.zatarLoaded = function () {
    if (finished) return;
    target = 1;
    var wait = Math.max(0, minTime - (performance.now() - start));
    setTimeout(function () {
      finished = true;
      bar.style.transform = "scaleX(1)";
      setTimeout(function () { needChoice ? showPicker() : reveal(); }, 180);
    }, wait);
  };
  setTimeout(window.zatarLoaded, maxTime);
  document.addEventListener("DOMContentLoaded", function () { window.zatarProgress(0.35); });
  if (document.fonts) document.fonts.ready.then(function () { window.zatarProgress(0.6); });
  window.addEventListener("load", function () {
    window.zatarProgress(0.8);
    // ohne 3D gibt es nichts mehr zu warten
    if (!root.classList.contains("will-3d")) window.zatarLoaded();
  });
})();
