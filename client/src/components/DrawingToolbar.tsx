import { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import { cn } from "@/lib/utils";
import {
  Minus, Triangle, Circle, Square, MapPin,
  Undo2, Trash2, X
} from "lucide-react";
import { Button } from "@/components/ui/button";

const LDraw = (L as any).Draw;

type DrawTool = "polyline" | "polygon" | "circle" | "rectangle" | "marker" | "freehand" | null;

const COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#000000"];

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
      if (activeHandlerRef.current) {
        try { activeHandlerRef.current.disable(); } catch {}
      }
    };
  }, [map]);

  const shapeOptions = useCallback(() => ({
    color: activeColor,
    weight: 3,
    opacity: 0.9,
    fillOpacity: 0.15,
  }), [activeColor]);

  const activate = useCallback((tool: DrawTool) => {
    if (activeHandlerRef.current) {
      try { activeHandlerRef.current.disable(); } catch {}
      activeHandlerRef.current = null;
    }
    if (activeTool === tool) {
      setActiveTool(null);
      return;
    }
    setActiveTool(tool);
    const opts = shapeOptions();
    let handler: any = null;
    switch (tool) {
      case "polyline":
        handler = new LDraw.Polyline(map, { shapeOptions: opts });
        break;
      case "polygon":
        handler = new LDraw.Polygon(map, { shapeOptions: opts });
        break;
      case "circle":
        handler = new LDraw.Circle(map, { shapeOptions: opts });
        break;
      case "rectangle":
        handler = new LDraw.Rectangle(map, { shapeOptions: opts });
        break;
      case "marker":
        handler = new LDraw.Marker(map, {});
        break;
      default:
        break;
    }
    if (handler) {
      handler.enable();
      activeHandlerRef.current = handler;
    }
  }, [activeTool, map, shapeOptions]);

  const handleUndo = () => {
    if (!drawnItemsRef.current || historyRef.current.length === 0) return;
    const last = historyRef.current[historyRef.current.length - 1];
    drawnItemsRef.current.removeLayer(last);
    historyRef.current = historyRef.current.slice(0, -1);
    setHistoryLength(h => Math.max(0, h - 1));
  };

  const handleClear = () => {
    if (!drawnItemsRef.current) return;
    drawnItemsRef.current.clearLayers();
    historyRef.current = [];
    setHistoryLength(0);
    if (activeHandlerRef.current) {
      try { activeHandlerRef.current.disable(); } catch {}
      activeHandlerRef.current = null;
    }
    setActiveTool(null);
  };

  const handleClose = () => {
    if (activeHandlerRef.current) {
      try { activeHandlerRef.current.disable(); } catch {}
      activeHandlerRef.current = null;
    }
    setActiveTool(null);
    onClose();
  };

  const tools: { key: DrawTool; icon: React.ReactNode; label: string }[] = [
    { key: "polyline", icon: <Minus className="w-4 h-4" />, label: "Line" },
    { key: "polygon", icon: <Triangle className="w-4 h-4" />, label: "Polygon" },
    { key: "circle", icon: <Circle className="w-4 h-4" />, label: "Circle" },
    { key: "rectangle", icon: <Square className="w-4 h-4" />, label: "Rectangle" },
    { key: "marker", icon: <MapPin className="w-4 h-4" />, label: "Marker" },
  ];

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 z-[1100] flex flex-col gap-1.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-border p-2 w-12 animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="flex justify-center">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-gray-100 rounded-xl"
          onClick={handleClose}
          title="Close drawing tools"
        >
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="h-px bg-border mx-1" />

      {tools.map(({ key, icon, label }) => (
        <Button
          key={key}
          size="icon"
          variant="ghost"
          title={label}
          className={cn(
            "h-8 w-8 rounded-xl transition-all",
            activeTool === key
              ? "bg-primary text-primary-foreground shadow-md scale-105"
              : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          )}
          onClick={() => activate(key)}
        >
          {icon}
        </Button>
      ))}

      <div className="h-px bg-border mx-1" />

      <div className="flex flex-col gap-1 px-1">
        {COLORS.map(color => (
          <button
            key={color}
            title={`Color: ${color}`}
            className={cn(
              "w-6 h-6 rounded-full mx-auto border-2 transition-transform hover:scale-110",
              activeColor === color ? "border-foreground scale-110 shadow-md" : "border-transparent"
            )}
            style={{ backgroundColor: color }}
            onClick={() => setActiveColor(color)}
          />
        ))}
      </div>

      <div className="h-px bg-border mx-1" />

      <Button
        size="icon"
        variant="ghost"
        title="Undo last"
        className={cn(
          "h-8 w-8 rounded-xl transition-all",
          historyLength === 0
            ? "text-gray-300 cursor-not-allowed"
            : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
        )}
        onClick={handleUndo}
        disabled={historyLength === 0}
      >
        <Undo2 className="w-4 h-4" />
      </Button>

      <Button
        size="icon"
        variant="ghost"
        title="Clear all drawings"
        className={cn(
          "h-8 w-8 rounded-xl transition-all",
          historyLength === 0
            ? "text-gray-300 cursor-not-allowed"
            : "text-destructive hover:bg-destructive/10"
        )}
        onClick={handleClear}
        disabled={historyLength === 0}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}
