/**
 * Jolly Farmer Trade Show schedule embed loader.
 *
 * WordPress:
 *   <!-- Jolly Farmer Trade Shows -->
 *   <script src="https://YOUR-DEPLOY.vercel.app/embed.js" async></script>
 *   <div class="jf-trade-shows" data-jf-lazy></div>
 */
(function () {
  var SCRIPT = document.currentScript;
  var ORIGIN = "";
  if (SCRIPT && SCRIPT.src) {
    ORIGIN = SCRIPT.src.replace(/\/embed\.js(?:\?.*)?$/i, "");
  }

  function mount(el) {
    if (el.getAttribute("data-jf-mounted") === "1") return;
    el.setAttribute("data-jf-mounted", "1");

    var iframe = document.createElement("iframe");
    iframe.src = ORIGIN + "/embed.html";
    iframe.title = "Jolly Farmer Trade Shows";
    iframe.loading = "lazy";
    iframe.setAttribute("scrolling", "no");
    iframe.style.cssText =
      "width:100%;border:0;display:block;background:transparent;overflow:hidden;min-height:420px;";

    el.innerHTML = "";
    el.appendChild(iframe);

    function onMessage(event) {
      if (!event || !event.data || event.data.type !== "jf-trade-shows-resize") return;
      if (event.source !== iframe.contentWindow) return;
      var height = Number(event.data.height);
      if (!height || height < 100) return;
      iframe.style.height = height + "px";
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
