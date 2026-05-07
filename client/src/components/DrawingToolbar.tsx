import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { cn } from "@/lib/utils";
import {
  Minus, Hexagon, Circle, Square, MapPin,
  Undo2, Trash2, Highlighter, PenLine,
} from "lucide-react";

// Fix leaflet-draw strict-mode bug: "type is not defined" in readableArea
(function patchLeafletDraw() {
  const G = (L as any).GeometryUtil;
  if (!G) return;
  G.readableArea = function (area: number, isMetric: boolean) {
    if (isMetric) {
      return area >= 1000000
        ? (area / 1000000).toFixed(2) + " km²"
        : area.toFixed(2) + " m²";
    }
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
  { id: "freehand",  icon: <PenLine className="w-3.5 h-3.5" />,     label: "Freehand Draw" },
  { id: "line",      icon: <Minus className="w-3.5 h-3.5" />,        label: "Line" },
  { id: "polygon",   icon: <Hexagon className="w-3.5 h-3.5" />,      label: "Polygon" },
  { id: "circle",    icon: <Circle className="w-3.5 h-3.5" />,       label: "Circle" },
  { id: "highlight", icon: <Highlighter className="w-3.5 h-3.5" />,  label: "Highlight Area" },
  { id: "rectangle", icon: <Square className="w-3.5 h-3.5" />,       label: "Rectangle" },
  { id: "marker",    icon: <MapPin className="w-3.5 h-3.5" />,       label: "Pin / Marker" },
];

interface DrawingToolbarProps {
  onClose: () => void;
}

export function DrawingToolbar({ onClose }: DrawingToolbarProps) {
  const map = useMap();

  // Use refs for all mutable drawing state to avoid stale closures
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const handlerRef = useRef<{ disable: () => void } | null>(null);
  const historyRef = useRef<L.Layer[]>([]);
  const colorRef = useRef(COLORS[0].hex);
  const activeIdRef = useRef<ToolId | null>(null);

  const [activeId, setActiveId] = useState<ToolId | null>(null);
  const [activeColor, setActiveColor] = useState(COLORS[0].hex);
  const [historyLen, setHistoryLen] = useState(0);

  // Initialize feature group
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
    fillOpacity: highlight ? 0.30 : 0.12,
    fillColor: colorRef.current,
  });

  const enableFreehand = () => {
    let drawing = false;
    let currentLine: L.Polyline | null = null;
    let pts: L.LatLng[] = [];

    const onDown = (e: L.LeafletMouseEvent) => {
      drawing = true;
      pts = [e.latlng];
      currentLine = L.polyline(pts, {
        color: colorRef.current,
        weight: 3,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(drawnItemsRef.current!);
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
      if (currentLine && pts.length > 1) {
        historyRef.current.push(currentLine);
        setHistoryLen(h => h + 1);
      } else if (currentLine) {
        drawnItemsRef.current?.removeLayer(currentLine);
      }
      currentLine = null;
      pts = [];
    };

    map.on("mousedown", onDown as any);
    map.on("mousemove", onMove as any);
    map.on("mouseup", onUp);

    // Touch support
    map.on("touchstart", (e: any) => onDown(e.originalEvent?.touches?.[0] ? e : e));
    map.on("touchmove", (e: any) => { e.originalEvent?.preventDefault(); onMove(e); });
    map.on("touchend", onUp);

    return {
      disable: () => {
        map.off("mousedown", onDown as any);
        map.off("mousemove", onMove as any);
        map.off("mouseup", onUp);
        map.off("touchstart");
        map.off("touchmove");
        map.off("touchend", onUp);
        map.dragging.enable();
        drawing = false;
      },
    };
  };

  const activateTool = (id: ToolId) => {
    disableCurrentHandler();

    // Toggle off
    if (activeIdRef.current === id) {
      activeIdRef.current = null;
      setActiveId(null);
      return;
    }

    activeIdRef.current = id;
    setActiveId(id);

    const opts = shapeOpts(id === "highlight");

    if (id === "freehand") {
      handlerRef.current = enableFreehand();
      return;
    }

    let handler: any = null;
    switch (id) {
      case "line":      handler = new LDraw.Polyline(map, { shapeOptions: opts, showLength: false }); break;
      case "polygon":   handler = new LDraw.Polygon(map, { shapeOptions: opts, showArea: false }); break;
      case "circle":    handler = new LDraw.Circle(map, { shapeOptions: opts, showRadius: false }); break;
      case "highlight":
      case "rectangle": handler = new LDraw.Rectangle(map, { shapeOptions: opts }); break;
      case "marker":    handler = new LDraw.Marker(map, {}); break;
    }

    if (handler) {
      handler.enable();
      handlerRef.current = handler;
    }
  };

  const changeColor = (hex: string) => {
    colorRef.current = hex;
    setActiveColor(hex);
    // Restart current tool with new color
    const current = activeIdRef.current;
    if (current) {
      disableCurrentHandler();
      activeIdRef.current = current;
      setActiveId(current);
      const opts = shapeOpts(current === "highlight");
      if (current === "freehand") {
        handlerRef.current = enableFreehand();
      } else {
        let handler: any = null;
        switch (current) {
          case "line":      handler = new LDraw.Polyline(map, { shapeOptions: opts, showLength: false }); break;
          case "polygon":   handler = new LDraw.Polygon(map, { shapeOptions: opts, showArea: false }); break;
          case "circle":    handler = new LDraw.Circle(map, { shapeOptions: opts, showRadius: false }); break;
          case "highlight":
          case "rectangle": handler = new LDraw.Rectangle(map, { shapeOptions: opts }); break;
          case "marker":    handler = new LDraw.Marker(map, {}); break;
        }
        if (handler) { handler.enable(); handlerRef.current = handler; }
      }
    }
  };

  const undo = () => {
    if (!drawnItemsRef.current || historyRef.current.length === 0) return;
    const last = historyRef.current.pop()!;
    drawnItemsRef.current.removeLayer(last);
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
    <div className="absolute top-[156px] right-4 z-[1100] draw-panel rounded-2xl p-2 w-[44px] flex flex-col gap-1 animate-in slide-in-from-right-2 fade-in duration-200">
      <p className="text-[7px] font-bold text-center tracking-widest uppercase" style={{ color: "hsl(215 14% 45%)" }}>Tools</p>

      {TOOLS.map(({ id, icon, label }) => (
        <button
          key={id}
          title={label}
          className={cn("draw-tool-btn", activeId === id && "active")}
          onClick={() => activateTool(id)}
        >
          {icon}
        </button>
      ))}

      <div className="h-px my-0.5" style={{ background: "rgba(255,255,255,0.08)" }} />
      <p className="text-[7px] font-bold text-center tracking-widest uppercase" style={{ color: "hsl(215 14% 45%)" }}>Color</p>

      {COLORS.map(({ hex, label }) => (
        <button
          key={hex}
          title={label}
          className={cn(
            "w-5 h-5 rounded-full mx-auto border-2 transition-all hover:scale-110 flex-shrink-0",
            activeColor === hex ? "border-white scale-110 shadow-md" : "border-transparent opacity-70"
          )}
          style={{
            backgroundColor: hex,
            boxShadow: activeColor === hex ? `0 0 8px ${hex}80` : undefined,
            outline: hex === "#ffffff" ? "1px solid rgba(255,255,255,0.2)" : undefined,
          }}
          onClick={() => changeColor(hex)}
        />
      ))}

      <div className="h-px my-0.5" style={{ background: "rgba(255,255,255,0.08)" }} />

      <button
        title="Undo"
        disabled={historyLen === 0}
        className="draw-tool-btn"
        style={{ opacity: historyLen === 0 ? 0.2 : 1 }}
        onClick={undo}
      >
        <Undo2 className="w-3.5 h-3.5" />
      </button>

      <button
        title="Clear all"
        disabled={historyLen === 0}
        className="draw-tool-btn"
        style={{ color: historyLen === 0 ? "rgba(255,255,255,0.15)" : "#f87171" }}
        onClick={clear}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
