"use client";

import { useRef, useState } from "react";
import { Download, Maximize2, X } from "lucide-react";
import { Card, Heading } from "@/components/ui";
import { C } from "@/lib/utils/tokens";

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
  /** Min pixel width of the chart inside the expanded modal — controls horizontal scroll.
   *  Default 900. Pass a larger value for charts with many bars (e.g. one per digester). */
  expandedMinWidth?: number;
}

const btnBase: React.CSSProperties = {
  background: "none",
  border: `1px solid ${C.border}`,
  borderRadius: 6,
  padding: "4px 9px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 5,
  fontSize: 11,
  color: C.muted,
  fontFamily: C.mono,
  flexShrink: 0,
  transition: "border-color 0.15s, color 0.15s",
};

export function ChartCard({
  title,
  children,
  style,
  expandedMinWidth = 900,
}: ChartCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const dlBtnRef = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);

  const handleDownload = async () => {
    const node = cardRef.current;
    const btn = dlBtnRef.current;
    if (!node) return;
    if (btn) btn.style.visibility = "hidden";
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(node, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
    });
    if (btn) btn.style.visibility = "visible";
    const link = document.createElement("a");
    link.download = `${title.replace(/[^a-z0-9]/gi, "_")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const hoverOn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = C.primary;
    e.currentTarget.style.color = C.primary;
  };
  const hoverOff = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.borderColor = C.border;
    e.currentTarget.style.color = C.muted;
  };

  return (
    <>
      <Card style={style} ref={cardRef}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <Heading size="sm" style={{ margin: 0 }}>
            {title}
          </Heading>
          <div style={{ display: "flex", gap: 6 }}>
            {/* Expand */}
            <button
              onClick={() => setExpanded(true)}
              title="Expand chart"
              style={btnBase}
              onMouseEnter={hoverOn}
              onMouseLeave={hoverOff}
            >
              <Maximize2 size={12} />
              Expand
            </button>

            {/* Download PNG */}
            <button
              ref={dlBtnRef}
              onClick={handleDownload}
              title="Download as PNG"
              style={btnBase}
              onMouseEnter={hoverOn}
              onMouseLeave={hoverOff}
            >
              <Download size={12} />
              PNG
            </button>
          </div>
        </div>
        <div>{children}</div>
      </Card>

      {/* ── Expanded modal ── */}
      {expanded && (
        <div
          onClick={() => setExpanded(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 28,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: "22px 26px 26px",
              width: "92vw",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 24px 64px rgba(0,0,0,0.28)",
            }}
          >
            {/* Modal header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
                flexShrink: 0,
              }}
            >
              <Heading size="lg">{title}</Heading>
              <button
                onClick={() => setExpanded(false)}
                style={{
                  background: C.bg,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  width: 34,
                  height: 34,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: C.muted,
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable chart area */}
            <div
              style={{
                overflowX: "auto",
                overflowY: "auto",
                flex: 1,
                paddingBottom: 8,
              }}
            >
              {/* min-width spreads bars out when there are many data points */}
              <div style={{ minWidth: expandedMinWidth, paddingBottom: 12 }}>
                {children}
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                fontSize: 11,
                color: C.muted,
                fontFamily: C.mono,
                flexShrink: 0,
                textAlign: "right",
              }}
            >
              Scroll horizontally to see all data · Click outside to close
            </div>
          </div>
        </div>
      )}
    </>
  );
}
