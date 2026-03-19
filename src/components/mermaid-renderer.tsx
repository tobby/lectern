"use client";

import { useEffect } from "react";

interface MermaidRendererProps {
  dependencies?: unknown[];
}

export default function MermaidRenderer({ dependencies = [] }: MermaidRendererProps) {
  useEffect(() => {
    async function render() {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          fontFamily: "inherit",
          securityLevel: "loose",
        });
        // Remove any previously rendered SVGs to re-render
        document.querySelectorAll(".mermaid[data-processed]").forEach((el) => {
          el.removeAttribute("data-processed");
        });
        await mermaid.run({ querySelector: ".mermaid" });
      } catch (err) {
        console.warn("Mermaid rendering error:", err);
      }
    }
    // Small delay to ensure DOM is updated
    const timeout = setTimeout(render, 100);
    return () => clearTimeout(timeout);
  }, dependencies);

  return null;
}
