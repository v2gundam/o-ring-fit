// Load AdSense only on the public GitHub Pages app.
(() => {
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
