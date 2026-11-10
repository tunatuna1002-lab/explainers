// 위젯 높이를 글 페이지에 알려 iframe 높이를 내용에 맞춘다.
(function () {
  var name = location.pathname.split("/").pop().replace(/\.html$/, "");
  var last = 0;
  function send() {
    var h = Math.ceil(document.body.getBoundingClientRect().height);
    if (h !== last) {
      last = h;
      try { parent.postMessage({ type: "vae-widget-height", name: name, h: h }, "*"); } catch (e) {}
    }
  }
  window.addEventListener("message", function (e) {
    if (e.data && e.data.type === "vae-widget-ping") { last = 0; send(); }
  });
  if (window.ResizeObserver) new ResizeObserver(send).observe(document.body);
  window.addEventListener("load", send);
  setTimeout(send, 300);
  send();
})();
