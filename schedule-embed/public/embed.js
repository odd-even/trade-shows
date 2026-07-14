/**
 * Jolly Farmer schedule embed loader (trade shows + EOD).
 *
 * WordPress:
 *   <script src="https://jf-trade-shows.vercel.app/embed.js" async></script>
 *   <div class="jf-trade-shows" data-jf-lazy data-jf-view="all"></div>
 *
 * Optional starting tab:
 *   data-jf-view="all" | "trade-shows" | "discount"
 */
(function () {
  var SCRIPT = document.currentScript;
  var ORIGIN = "";
  if (SCRIPT && SCRIPT.src) {
    ORIGIN = SCRIPT.src.replace(/\/embed\.js(?:\?.*)?$/i, "");
  }

  var IFRAME_BASE =
    "width:100%;max-width:none;border:0;display:block;background:transparent;overflow:hidden;min-height:420px;";

  var IFRAME_OVERLAY =
    "position:fixed !important;top:0 !important;right:0 !important;bottom:0 !important;left:0 !important;" +
    "width:100vw !important;height:100vh !important;max-width:none !important;border:0 !important;" +
    "display:block !important;background:transparent !important;overflow:hidden !important;" +
    "z-index:2147483647 !important;margin:0 !important;padding:0 !important;";

  function mount(el) {
    if (el.getAttribute("data-jf-mounted") === "1") return;
    el.setAttribute("data-jf-mounted", "1");

    var view = el.getAttribute("data-jf-view") || "";
    var src = ORIGIN + "/embed.html";
    if (view) src += "?view=" + encodeURIComponent(view);

    el.style.width = "100%";
    el.style.maxWidth = "none";
    el.style.display = "block";

    var iframe = document.createElement("iframe");
    iframe.src = src;
    iframe.title = "Jolly Farmer Schedule";
    iframe.loading = "lazy";
    iframe.setAttribute("scrolling", "no");
    iframe.allow = "clipboard-write";
    iframe.style.cssText = IFRAME_BASE;

    el.innerHTML = "";
    el.appendChild(iframe);

    var overlay = null;
    var modalOpen = false;
    var saved = {
      bodyOverflow: "",
      htmlOverflow: "",
      scrollX: 0,
      scrollY: 0,
    };

    function isTrustedSource(source) {
      if (source === iframe.contentWindow) return true;
      if (overlay && source === overlay.contentWindow) return true;
      return false;
    }

    function closeOverlay() {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay = null;
      modalOpen = false;
      document.body.style.overflow = saved.bodyOverflow || "";
      document.documentElement.style.overflow = saved.htmlOverflow || "";
      window.scrollTo(saved.scrollX, saved.scrollY);
    }

    function openOverlay(id) {
      if (!id) return;

      if (!modalOpen) {
        saved.bodyOverflow = document.body.style.overflow;
        saved.htmlOverflow = document.documentElement.style.overflow;
        saved.scrollX = window.scrollX || window.pageXOffset || 0;
        saved.scrollY = window.scrollY || window.pageYOffset || 0;
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
      }

      var overlaySrc = ORIGIN + "/embed.html?modal=" + encodeURIComponent(id);
      if (overlay) {
        if (overlay.getAttribute("data-jf-modal-id") === id) {
          modalOpen = true;
          return;
        }
        overlay.setAttribute("data-jf-modal-id", id);
        overlay.src = overlaySrc;
        modalOpen = true;
        return;
      }

      overlay = document.createElement("iframe");
      overlay.src = overlaySrc;
      overlay.title = "Event details";
      overlay.allow = "clipboard-write";
      overlay.setAttribute("data-jf-modal-id", id);
      overlay.setAttribute("scrolling", "no");
      overlay.style.cssText = IFRAME_OVERLAY;
      document.body.appendChild(overlay);
      modalOpen = true;
    }

    function setModal(open, id) {
      if (open) openOverlay(id || "");
      else closeOverlay();
    }

    function onMessage(event) {
      if (!event || !event.data) return;
      if (ORIGIN && event.origin && event.origin !== ORIGIN) return;
      if (!isTrustedSource(event.source)) return;

      if (event.data.type === "jf-trade-shows-modal") {
        setModal(Boolean(event.data.open), event.data.id || "");
        return;
      }

      if (event.data.type === "jf-trade-shows-resize") {
        if (event.source !== iframe.contentWindow) return;
        var height = Number(event.data.height);
        if (!height || height < 100) return;
        iframe.style.height = height + "px";
      }
    }

    window.addEventListener("message", onMessage);
  }

  function scan() {
    var nodes = document.querySelectorAll(".jf-trade-shows, [data-jf-schedule], [data-jf-lazy]");
    for (var i = 0; i < nodes.length; i++) mount(nodes[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }

  if (typeof MutationObserver !== "undefined") {
    var obs = new MutationObserver(function () {
      scan();
    });
    obs.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
