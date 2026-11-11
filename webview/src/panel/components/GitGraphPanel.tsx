import { useEffect, useRef, useState } from "react";
import { usePanelStore } from "../../shared/store/panel-store";
import { CommitList } from "./CommitList";
import { GitGraphSvg } from "./GitGraphSvg";

export function GitGraphPanel() {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    ro.observe(node);
    setContainerHeight(node.clientHeight);

    return () => ro.disconnect();
  }, []);

  const svgHeight = containerHeight;

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        minHeight: 0,
      }}
    >
      <CommitList onScroll={setScrollTop} onHorizontalScroll={setScrollLeft} />
      <GitGraphSvg
        scrollTop={scrollTop}
        scrollLeft={scrollLeft}
        height={svgHeight > 0 ? svgHeight : 0}
        topOffset={0}
        onToggleSequence={(id, intermediates) =>
          usePanelStore.getState().toggleSequenceCollapse(id, intermediates)
        }
      />
    </div>
  );
}
