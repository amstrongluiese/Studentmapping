import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { cn } from "@/lib/utils";
import { Minus, Hexagon, Circle, Square, MapPin, Undo2, Trash2, Highlighter, PenLine } from "lucide-react";

// Fix leaflet-draw strict-mode bug
(function patchLeafletDraw() {
  const G = (L as any).GeometryUtil;
  if (!G) return;
  G.readableArea = function (area: number, isMetric: boolean) {
    if (isMetric) return area >= 1000000 ? (area / 1000000).toFixed(2) + " km²" : area.toFixed(2) + " m²";
    const acres = area / 4047;
    return acres >= 640 ? (acres / 640).toFixed(2) + " mi²" : acres.toFixed(2) + " ac";
  };
})();

const LDraw = (L as any).Draw;

type ToolId = "freehand" | "line" | "polygon" | "circle" | "highlight" | "rectangle" | "marker";

const COLORS = [
  { hex: "#10d9a0", label: "Teal" },
  { hex: "#60a5fa", label: "Blue" },
  { hex: "#f87171", label: "Red" },
  { hex: "#fbbf24", label: "Amber" },
  { hex: "#a78bfa", label: "Purple" },
  { hex: "#f472b6", label: "Pink" },
  { hex: "#ffffff", label: "White" },
];

const TOOLS: { id: ToolId; icon: React.ReactNode; label: string }[] = [
  { id: "freehand",  icon: <PenLine className="w-3.5 h-3.5" />,    label: "Freehand Draw" },
  { id: "line",      icon: <Minus className="w-3.5 h-3.5" />,       label: "Line" },
  { id: "polygon",   icon: <Hexagon className="w-3.5 h-3.5" />,     label: "Polygon" },
  { id: "circle",    icon: <Circle className="w-3.5 h-3.5" />,      label: "Circle" },
  { id: "highlight", icon: <Highlighter className="w-3.5 h-3.5" />, label: "Highlight" },
  { id: "rectangle", icon: <Square className="w-3.5 h-3.5" />,      label: "Rectangle" },
  { id: "marker",    icon: <MapPin className="w-3.5 h-3.5" />,      label: "Pin / Marker" },
];

interface DrawingToolbarProps { onClose: () => void; }

export function DrawingToolbar({ onClose }: DrawingToolbarProps) {
  const map = useMap();
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const handlerRef = useRef<{ disable: () => void } | null>(null);
  const historyRef = useRef<L.Layer[]>([]);
  const colorRef = useRef(COLORS[0].hex);
  const activeIdRef = useRef<ToolId | null>(null);

  const [activeId, setActiveId] = useState<ToolId | null>(null);
  const [activeColor, setActiveColor] = useState(COLORS[0].hex);
  const [historyLen, setHistoryLen] = useState(0);

  useEffect(() => {
    const group = new L.FeatureGroup();
    drawnItemsRef.current = group;
    map.addLayer(group);
    const onCreated = (e: any) => {
      group.addLayer(e.layer);
      historyRef.current.push(e.layer);
      setHistoryLen(h => h + 1);
    };
    map.on(LDraw.Event.CREATED, onCreated);
    return () => {
      map.off(LDraw.Event.CREATED, onCreated);
      disableCurrentHandler();
      map.removeLayer(group);
      map.dragging.enable();
    };
  }, [map]);

  const disableCurrentHandler = () => {
    if (handlerRef.current) {
      try { handlerRef.current.disable(); } catch {}
      handlerRef.current = null;
    }
  };

  const shapeOpts = (highlight = false) => ({
    color: colorRef.current,
    weight: highlight ? 2 : 3,
    opacity: 0.95,
    fillOpacity: highlight ? 0.28 : 0.10,
    fillColor: colorRef.current,
    lineCap: "round" as const,
    lineJoin: "round" as const,
  });

  const enableFreehand = () => {
    let drawing = false;
    let currentLine: L.Polyline | null = null;
    let pts: L.LatLng[] = [];

    const onDown = (e: L.LeafletMouseEvent) => {
      drawing = true;
      pts = [e.latlng];
      currentLine = L.polyline(pts, { color: colorRef.current, weight: 3, opacity: 0.95, lineCap: "round", lineJoin: "round" }).addTo(drawnItemsRef.current!);
      map.dragging.disable();
    };
    const onMove = (e: L.LeafletMouseEvent) => {
      if (!drawing || !currentLine) return;
      pts.push(e.latlng);
      currentLine.setLatLngs(pts);
    };
    const onUp = () => {
      if (!drawing) return;
      drawing = false;
      if (currentLine && pts.length > 1) { historyRef.current.push(currentLine); setHistoryLen(h => h + 1); }
      else if (currentLine) drawnItemsRef.current?.removeLayer(currentLine);
      currentLine = null; pts = [];
    };

    map.on("mousedown", onDown as any);
    map.on("mousemove", onMove as any);
    map.on("mouseup", onUp);

    return {
      disable: () => {
        map.off("mousedown", onDown as any);
        map.off("mousemove", onMove as any);
        map.off("mouseup", onUp);
        map.dragging.enable();
        drawing = false;
      },
    };
  };

  const restartCurrentTool = (id: ToolId) => {
    disableCurrentHandler();
    const opts = shapeOpts(id === "highlight");
    if (id === "freehand") { handlerRef.current = enableFreehand(); return; }
    let handler: any = null;
    switch (id) {
      case "line":      handler = new LDraw.Polyline(map, { shapeOptions: opts, showLength: false }); break;
      case "polygon":   handler = new LDraw.Polygon(map, { shapeOptions: opts, showArea: false }); break;
      case "circle":    handler = new LDraw.Circle(map, { shapeOptions: opts, showRadius: false }); break;
      case "highlight":
      case "rectangle": handler = new LDraw.Rectangle(map, { shapeOptions: opts }); break;
      case "marker":    handler = new LDraw.Marker(map, {}); break;
    }
    if (handler) { handler.enable(); handlerRef.current = handler; }
  };

  const activateTool = (id: ToolId) => {
    disableCurrentHandler();
    if (activeIdRef.current === id) { activeIdRef.current = null; setActiveId(null); return; }
    activeIdRef.current = id;
    setActiveId(id);
    restartCurrentTool(id);
  };

  const changeColor = (hex: string) => {
    colorRef.current = hex;
    setActiveColor(hex);
    if (activeIdRef.current) restartCurrentTool(activeIdRef.current);
  };

  const undo = () => {
    if (!drawnItemsRef.current || historyRef.current.length === 0) return;
    drawnItemsRef.current.removeLayer(historyRef.current.pop()!);
    setHistoryLen(h => Math.max(0, h - 1));
  };

  const clear = () => {
    disableCurrentHandler();
    drawnItemsRef.current?.clearLayers();
    historyRef.current = [];
    activeIdRef.current = null;
    setActiveId(null);
    setHistoryLen(0);
  };

  return (
    <div
      className="absolute right-4 z-[1100] draw-panel rounded-2xl w-[44px] flex flex-col animate-in slide-in-from-right-2 fade-in duration-200"
      style={{ top: "156px", maxHeight: "calc(100vh - 180px)" }}
    >
      {/* Fixed header */}
      <div className="px-1.5 pt-2 pb-1 flex-shrink-0">
        <p className="text-[7px] font-bold text-center tracking-widest uppercase" style={{ color: "hsl(215 14% 42%)" }}>Tools</p>
      </div>

      {/* Scrollable middle — tools + colors */}
      <div
        className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-1 px-1.5"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", overscrollBehavior: "contain" }}
      >
        <style>{`.draw-scroll::-webkit-scrollbar { display: none; }`}</style>

        {TOOLS.map(({ id, icon, label }) => (
          <button
            key={id}
            title={label}
            className={cn("draw-tool-btn flex-shrink-0", activeId === id && "active")}
            onClick={() => activateTool(id)}
          >
            {icon}
          </button>
        ))}

        <div className="h-px my-0.5 flex-shrink-0" style={{ background: "rgba(255,255,255,0.07)" }} />
        <p className="text-[7px] font-bold text-center tracking-widest uppercase flex-shrink-0" style={{ color: "hsl(215 14% 42%)" }}>Color</p>

        {COLORS.map(({ hex, label }) => (
          <button
            key={hex}
            title={label}
            className="w-5 h-5 rounded-full mx-auto border-2 transition-all hover:scale-110 flex-shrink-0"
            style={{
              backgroundColor: hex,
              borderColor: activeColor === hex ? "#fff" : "transparent",
              transform: activeColor === hex ? "scale(1.15)" : undefined,
              boxShadow: activeColor === hex ? `0 0 8px ${hex}90` : undefined,
              outline: hex === "#ffffff" ? "1px solid rgba(255,255,255,0.15)" : undefined,
              opacity: activeColor === hex ? 1 : 0.65,
            }}
            onClick={() => changeColor(hex)}
          />
        ))}

        <div className="h-2 flex-shrink-0" />
      </div>

      {/* Fixed footer — undo + clear */}
      <div className="px-1.5 pb-2 pt-1 flex flex-col gap-1 flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button
          title="Undo last"
          disabled={historyLen === 0}
          className="draw-tool-btn"
          style={{ opacity: historyLen === 0 ? 0.18 : 0.75, color: "#d6e4f8" }}
          onClick={undo}
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          title="Clear all drawings"
          disabled={historyLen === 0}
          className="draw-tool-btn"
          style={{ opacity: historyLen === 0 ? 0.18 : 0.85, color: historyLen > 0 ? "#f87171" : "rgba(255,255,255,0.3)" }}
          onClick={clear}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
