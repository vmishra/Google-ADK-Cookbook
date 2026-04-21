// Initialise Mermaid with a theme that harmonises with the editorial
// surface. Re-runs on every navigation so instant-loading doesn't leave
// diagrams blank.
(function () {
  const theme = () =>
    document.body.getAttribute("data-md-color-scheme") === "slate"
      ? "dark" : "light";

  const init = () => {
    if (typeof mermaid === "undefined") return;
    const dark = theme() === "dark";
    mermaid.initialize({
      startOnLoad: false,
      theme: "base",
      fontFamily: "Geist, system-ui, sans-serif",
      themeVariables: dark ? {
        background:          "#16161c",
        primaryColor:        "#1e1e25",
        primaryTextColor:    "#f1efe7",
        primaryBorderColor:  "#3a3a43",
        lineColor:           "#7a7a86",
        secondaryColor:      "#26262d",
        tertiaryColor:       "#1c1c22",
        nodeBorder:          "#3a3a43",
        clusterBkg:          "#1a1a1f",
        clusterBorder:       "#3a3a43",
        edgeLabelBackground: "#16161c",
        fontSize:            "14px",
      } : {
        background:          "#fafaf5",
        primaryColor:        "#ffffff",
        primaryTextColor:    "#1a1a1f",
        primaryBorderColor:  "#d8d5cc",
        lineColor:           "#8a8a8a",
        secondaryColor:      "#f1efe7",
        tertiaryColor:       "#fafaf5",
        nodeBorder:          "#d8d5cc",
        clusterBkg:          "#f5f3ea",
        clusterBorder:       "#d8d5cc",
        edgeLabelBackground: "#fafaf5",
        fontSize:            "14px",
      },
      flowchart: { curve: "basis", htmlLabels: true, padding: 14, useMaxWidth: true },
      sequence:  { mirrorActors: false, actorMargin: 60, useMaxWidth: true },
      themeCSS:  ".edgeLabel { background-color: transparent !important; }",
    });
    // Reset and re-run
    document.querySelectorAll(".mermaid").forEach(el => {
      if (el.dataset.processed) {
        el.removeAttribute("data-processed");
        el.innerHTML = el.dataset.source || el.textContent;
      } else {
        el.dataset.source = el.textContent;
      }
    });
    mermaid.run({ querySelector: ".mermaid" });
  };

  if (typeof document$ !== "undefined" && document$.subscribe) {
    document$.subscribe(init);
  } else {
    document.addEventListener("DOMContentLoaded", init);
  }
})();
