// Initialise Mermaid with a dark-first theme that harmonises with the
// MkDocs Material slate scheme. Re-runs on every page navigation so
// instant-navigation doesn't leave diagrams blank.
document$.subscribe(() => {
  if (typeof mermaid === "undefined") return;
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    themeVariables: {
      background: "#0f0f12",
      primaryColor: "#1c1c22",
      primaryTextColor: "#f1efe7",
      primaryBorderColor: "#3a3a43",
      lineColor: "#7a7a86",
      secondaryColor: "#26262d",
      tertiaryColor: "#1a1a1f",
      fontFamily: "Geist, system-ui, sans-serif",
      fontSize: "14px",
    },
    flowchart: { curve: "basis", htmlLabels: true, padding: 12 },
    sequence: { mirrorActors: false, actorMargin: 60 },
  });
  mermaid.run({ querySelector: ".mermaid" });
});
