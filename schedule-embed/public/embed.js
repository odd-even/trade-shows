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

    var modalOpen = false;
    var saved = {
      cssText: IFRAME_BASE,
      height: "",
      bodyOverflow: "",
      htmlOverflow: "",
      elMinHeight: "",
      scrollX: 0,
      scrollY: 0,
    };

    function setModal(open) {
      if (open === modalOpen) return;
      modalOpen = open;

      if (open) {
        saved.cssText = iframe.style.cssText || IFRAME_BASE;
        saved.height = iframe.style.height;
        saved.bodyOverflow = document.body.style.overflow;
        saved.htmlOverflow = document.documentElement.style.overflow;
        saved.elMinHeight = el.style.minHeight;
        saved.scrollX = window.scrollX || window.pageXOffset || 0;
        saved.scrollY = window.scrollY || window.pageYOffset || 0;

        // Keep original page height — fixed iframe leaves document flow otherwise
        var layoutHeight =
          Math.ceil(iframe.getBoundingClientRect().height) ||
          parseInt(iframe.style.height, 10) ||
          Math.ceil(el.getBoundingClientRect().height) ||
          420;
        el.style.minHeight = layoutHeight + "px";

        // Reparent to body so theme transforms / stacking contexts can't trap it
        // under header/footer
        document.body.appendChild(iframe);
        iframe.style.cssText =
          "position:fixed !important;top:0 !important;right:0 !important;bottom:0 !important;left:0 !important;" +
          "width:100vw !important;height:100vh !important;max-width:none !important;border:0 !important;" +
          "display:block !important;background:transparent !important;overflow:hidden !important;" +
          "z-index:2147483647 !important;margin:0 !important;padding:0 !important;";

        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
      } else {
        el.appendChild(iframe);
        iframe.style.cssText = saved.cssText || IFRAME_BASE;
        if (saved.height) iframe.style.height = saved.height;
        el.style.minHeight = saved.elMinHeight || "";
        document.body.style.overflow = saved.bodyOverflow || "";
        document.documentElement.style.overflow = saved.htmlOverflow || "";
        window.scrollTo(saved.scrollX, saved.scrollY);
      }
    }

    function onMessage(event) {
      if (!event || !event.data) return;
      if (ORIGIN && event.origin && event.origin !== ORIGIN) return;
      if (event.source !== iframe.contentWindow) return;

      if (event.data.type === "jf-trade-shows-modal") {
        setModal(Boolean(event.data.open));
        return;
      }

      if (event.data.type === "jf-trade-shows-resize") {
        if (modalOpen) return;
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
