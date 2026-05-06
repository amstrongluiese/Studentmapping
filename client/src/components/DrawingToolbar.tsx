import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { cn } from "@/lib/utils";
import {
  Minus, Pentagon, Circle, Square, MapPin,
  Undo2, Trash2, Highlighter, ArrowRight, Type
} from "lucide-react";

const LDraw = (L as any).Draw;
type DrawTool = "polyline" | "polygon" | "circle" | "rectangle" | "marker" | null;
const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#000000", "#ffffff"];

interface DrawingToolbarProps {
  onClose: () => void;
}

export function DrawingToolbar({ onClose }: DrawingToolbarProps) {
  const map = useMap();
  const drawnItemsRef = useRef<L.FeatureGroup | null>(null);
  const activeHandlerRef = useRef<any>(null);
  const historyRef = useRef<L.Layer[]>([]);
  const [activeTool, setActiveTool] = useState<DrawTool>(null);
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [historyLength, setHistoryLength] = useState(0);

  useEffect(() => {
    const drawnItems = new L.FeatureGroup();
    drawnItemsRef.current = drawnItems;
    map.addLayer(drawnItems);
    const onCreated = (e: any) => {
      drawnItems.addLayer(e.layer);
      historyRef.current = [...historyRef.current, e.layer];
      setHistoryLength(h => h + 1);
      setActiveTool(null);
      activeHandlerRef.current = null;
    };
    map.on(LDraw.Event.CREATED, onCreated);
    return () => {
      map.off(LDraw.Event.CREATED, onCreated);
      map.removeLayer(drawnItems);
      if (activeHandlerRef.current) { try { activeHandlerRef.current.disable(); } catch {} }
    };
  }, [map]);

  const shapeOptions = useCallback((highlight = false) => ({
    color: activeColor,
    weight: highlight ? 2 : 3,
    opacity: 0.9,
    fillOpacity: highlight ? 0.25 : 0.12,
    fillColor: activeColor,
    dashArray: highlight ? "none" : undefined,
  }), [activeColor]);

  const activate = useCallback((tool: DrawTool, highlight = false) => {
    if (activeHandlerRef.current) { try { activeHandlerRef.current.disable(); } catch {} activeHandlerRef.current = null; }
    if (activeTool === tool) { setActiveTool(null); return; }
    setActiveTool(tool);
    const opts = shapeOptions(highlight);
    let handler: any = null;
    switch (tool) {
      case "polyline":  handler = new LDraw.Polyline(map, { shapeOptions: opts }); break;
      case "polygon":   handler = new LDraw.Polygon(map, { shapeOptions: opts }); break;
      case "circle":    handler = new LDraw.Circle(map, { shapeOptions: opts }); break;
      case "rectangle": handler = new LDraw.Rectangle(map, { shapeOptions: opts }); break;
      case "marker":    handler = new LDraw.Marker(map, {}); break;
    }
    if (handler) { handler.enable(); activeHandlerRef.current = handler; }
  }, [activeTool, map, shapeOptions]);

  const handleUndo = () => {
    if (!drawnItemsRef.current || historyRef.current.length === 0) return;
    const last = historyRef.current[historyRef.current.length - 1];
    drawnItemsRef.current.removeLayer(last);
    historyRef.current = historyRef.current.slice(0, -1);
    setHistoryLength(h => Math.max(0, h - 1));
  };

  const handleClear = () => {
    drawnItemsRef.current?.clearLayers();
    historyRef.current = [];
    setHistoryLength(0);
    if (activeHandlerRef.current) { try { activeHandlerRef.current.disable(); } catch {} activeHandlerRef.current = null; }
    setActiveTool(null);
  };

  useEffect(() => {
    return () => {
      if (activeHandlerRef.current) { try { activeHandlerRef.current.disable(); } catch {} }
    };
  }, []);

  type ToolDef = { key: DrawTool; icon: React.ReactNode; label: string; highlight?: boolean };

  const tools: ToolDef[] = [
    { key: "polyline",  icon: <Minus className="w-3.5 h-3.5" />,       label: "Line" },
    { key: "polyline",  icon: <ArrowRight className="w-3.5 h-3.5" />,   label: "Arrow / Path" },
    { key: "polygon",   icon: <Pentagon className="w-3.5 h-3.5" />,     label: "Polygon" },
    { key: "circle",    icon: <Circle className="w-3.5 h-3.5" />,       label: "Circle" },
    { key: "rectangle", icon: <Highlighter className="w-3.5 h-3.5" />,  label: "Highlight Area", highlight: true },
    { key: "rectangle", icon: <Square className="w-3.5 h-3.5" />,       label: "Rectangle" },
    { key: "marker",    icon: <MapPin className="w-3.5 h-3.5" />,       label: "Pin / Annotation" },
    { key: "marker",    icon: <Type className="w-3.5 h-3.5" />,         label: "Label" },
  ];

  return (
    <div className="absolute top-[148px] right-4 z-[1100] flex flex-col gap-1 bg-white/96 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/70 p-2 w-[44px] animate-in slide-in-from-top-2 fade-in duration-200">
      {/* Divider label */}
      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center py-0.5 leading-none">Tools</p>

      {tools.map(({ key, icon, label, highlight }, i) => (
        <button
          key={`${key}-${i}`}
          title={label}
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-xl transition-all",
            activeTool === key
              ? "bg-primary text-primary-foreground shadow-md scale-105"
              : "text-gray-500 hover:bg-secondary/70 hover:text-gray-900 hover:scale-105"
          )}
          onClick={() => activate(key, highlight)}
        >
          {icon}
        </button>
      ))}

      <div className="h-px bg-border/50 mx-1 my-0.5" />
      <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center leading-none">Color</p>

      {COLORS.map(color => (
        <button
          key={color}
          title={color}
          className={cn(
            "w-6 h-6 rounded-full mx-auto border-2 transition-all hover:scale-110",
            activeColor === color ? "border-gray-700 scale-110 shadow-sm" : "border-transparent opacity-80"
          )}
          style={{ backgroundColor: color, boxShadow: color === "#ffffff" ? "inset 0 0 0 1px #ddd" : undefined }}
          onClick={() => setActiveColor(color)}
        />
      ))}

      <div className="h-px bg-border/50 mx-1 my-0.5" />

      <button
        title="Undo last"
        disabled={historyLength === 0}
        className={cn(
          "h-8 w-8 flex items-center justify-center rounded-xl transition-all",
          historyLength === 0 ? "text-gray-200 cursor-not-allowed" : "text-gray-500 hover:bg-secondary/70 hover:text-gray-900"
        )}
        onClick={handleUndo}
      >
        <Undo2 className="w-3.5 h-3.5" />
      </button>

      <button
        title="Clear all drawings"
        disabled={historyLength === 0}
        className={cn(
          "h-8 w-8 flex items-center justify-center rounded-xl transition-all",
          historyLength === 0 ? "text-gray-200 cursor-not-allowed" : "text-red-400 hover:bg-red-50 hover:text-red-600"
        )}
        onClick={handleClear}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
