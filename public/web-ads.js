// Load AdSense only on the public GitHub Pages app.
(() => {
  // 웹 버전은 nogari.dev로 옮겨졌습니다. 예전 GitHub Pages 주소로 들어오면 새 주소로 이동합니다.
  if (window.location.hostname === "v2gundam.github.io") {
    window.location.replace("https://nogari.dev/apps/o-ring/" + window.location.search + window.location.hash);
    return;
  }

  if (window.location.protocol !== "https:" ||
      window.location.hostname !== "v2gundam.github.io" ||
      !window.location.pathname.startsWith("/o-ring-fit/")) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6207625854271970";
  script.crossOrigin = "anonymous";
  // Google's supported setting for regular, bottom-only anchor ads.
  script.setAttribute("data-overlays", "collapsed-bottom");
  document.head.append(script);
})();
