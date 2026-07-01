import { memo, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  Circle,
  CircleSlash,
  Eraser,
  Minus,
  MousePointer2,
  Palette,
  Pen,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Square,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import type { DrawingMode } from "@/lib/drawingUtils";

interface DrawingToolbarProps {
  mode: DrawingMode;
  onModeChange: (mode: DrawingMode) => void;
  color: string;
  onColorChange: (color: string) => void;
  width: number;
  onWidthChange: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  onDeselectTool: () => void;
  isStylusMode: boolean;
  onStylusModeChange: (mode: boolean) => void;
  stylusGuardHint: string;
  buttonSize: number;
}

const PRESET_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#111827",
];

const toolGroups: Array<{ tools: Array<{ id: DrawingMode; label: string; icon: ReactNode }> }> = [
  {
    tools: [
      { id: null, label: "Select / Pan", icon: <MousePointer2 className="h-3.5 w-3.5" strokeWidth={1.5} /> },
      { id: "free", label: "Freehand", icon: <FreehandStrokeIcon className="h-3.5 w-3.5" /> },
      { id: "line", label: "Line", icon: <Minus className="h-3.5 w-3.5 rotate-45" strokeWidth={1.5} /> },
      { id: "arrow", label: "Arrow", icon: <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} /> },
      { id: "rectangle", label: "Rectangle", icon: <Square className="h-3.5 w-3.5" strokeWidth={1.5} /> },
      { id: "circle", label: "Circle", icon: <Circle className="h-3.5 w-3.5" strokeWidth={1.5} /> },
      { id: "eraser", label: "Eraser", icon: <Eraser className="h-3.5 w-3.5" strokeWidth={1.5} /> },
    ],
  },
  {
    tools: [{ id: "label", label: "Text label", icon: <Type className="h-3.5 w-3.5" strokeWidth={1.5} /> }],
  },
];

export const DrawingToolbar = memo(function DrawingToolbar({
  mode,
  onModeChange,
  color,
  onColorChange,
  width,
  onWidthChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onDeleteSelected,
  hasSelection,
  onDeselectTool,
  isStylusMode,
  onStylusModeChange,
  stylusGuardHint,
  buttonSize,
}: DrawingToolbarProps) {
  const toolbarRootRef = useRef<HTMLDivElement>(null);
  const [hoverLabel, setHoverLabel] = useState<{ text: string; top: number } | null>(null);
  const [viewportWidth, setViewportWidth] = useState(() => (typeof window === "undefined" ? 1280 : window.innerWidth));

  useEffect(() => {
    setHoverLabel(null);
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  const toolSize = Math.max(36, Math.min(44, Math.round((buttonSize || 44) - 8)));
  const toolGap = 4;
  const panelPadding = 4;
  const columnCount = 1;
  const computedWidth = columnCount * toolSize + (columnCount - 1) * toolGap + panelPadding * 2;
  const panelWidth = Math.min(viewportWidth - 32, computedWidth);

  const toolbarVars = {
    width: `${panelWidth}px`,
    ["--draw-toolbar-anchor-size" as string]: `${toolSize}px`,
    ["--draw-toolbar-gap" as string]: `${toolGap}px`,
    ["--draw-toolbar-padding" as string]: `${panelPadding}px`,
    ["--draw-tool-size" as string]: `${toolSize}px`,
  } satisfies CSSProperties;

  const showHoverLabel = (label: string, element: HTMLElement) => {
    const rootRect = toolbarRootRef.current?.getBoundingClientRect();
    const itemRect = element.getBoundingClientRect();
    const top = rootRect ? itemRect.top - rootRect.top + itemRect.height / 2 : itemRect.height / 2;
    setHoverLabel({ text: label, top });
  };

  const iconButtonStyle = { width: toolSize, height: toolSize } satisfies CSSProperties;

  return (
    <div ref={toolbarRootRef} className="relative overflow-visible" style={toolbarVars}>
      <div
        className={cn(
          "gis-toolbar-tooltip pointer-events-none absolute -left-2 top-1/2 z-[1400] min-w-max -translate-x-full -translate-y-1/2 opacity-0 transition-all duration-100",
          hoverLabel && "opacity-100",
        )}
        style={{ top: hoverLabel ? hoverLabel.top : "50%", transform: "translateY(-50%) translateX(-100%)" }}
      >
        {hoverLabel?.text}
      </div>

      <div className="gis-drawing-toolbar gis-scrollbar-hidden max-h-[min(520px,calc(100vh-6rem))] overflow-y-auto">
        <ToolbarSection columnCount={columnCount}>
          {toolGroups.flatMap((group) => group.tools).map((tool) => (
            <ToolbarButton
              key={tool.id}
              label={tool.label}
              active={mode === tool.id}
              onHover={showHoverLabel}
              onLeave={() => setHoverLabel(null)}
              onClick={() => onModeChange(mode === tool.id ? null : tool.id)}
              style={iconButtonStyle}
            >
              {tool.icon}
            </ToolbarButton>
          ))}
        </ToolbarSection>

        <Divider />

        <ToolbarSection columnCount={columnCount}>
          <Popover>
            <ToolbarItemLabel label="Color" onHover={showHoverLabel} onLeave={() => setHoverLabel(null)}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="rounded-xl transition hover:scale-[1.04]" style={iconButtonStyle}>
                  <Palette className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              </PopoverTrigger>
            </ToolbarItemLabel>
            <PopoverContent 
              side="left" 
              align="start" 
              sideOffset={10} 
              collisionPadding={16} 
              className="z-[10000] w-56 border-white/40 bg-white/60 p-3 shadow-xl backdrop-blur-xl"
              container={typeof document !== 'undefined' ? document.getElementById('gis-presentation-stage') : null}
            >
              <div className="grid grid-cols-4 gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset}
                    aria-label={preset}
                    type="button"
                    className={cn(
                      "h-8 rounded-md border transition hover:scale-105",
                      color === preset ? "ring-2 ring-primary ring-offset-2" : "border-border",
                    )}
                    style={{ backgroundColor: preset }}
                    onClick={() => onColorChange(preset)}
                  />
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Input
                  type="color"
                  value={color}
                  onChange={(event) => onColorChange(event.target.value)}
                  className="h-9 w-12 cursor-pointer p-1"
                />
                <Input
                  value={color}
                  onChange={(event) => onColorChange(event.target.value)}
                  className="h-9 font-mono text-xs"
                />
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <ToolbarItemLabel label="Stroke width" onHover={showHoverLabel} onLeave={() => setHoverLabel(null)}>
              <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="icon" className="rounded-xl transition hover:scale-[1.04]" style={iconButtonStyle}>
                  <SlidersHorizontal className="h-3.5 w-3.5" strokeWidth={1.5} />
                </Button>
              </PopoverTrigger>
            </ToolbarItemLabel>
            <PopoverContent 
              side="left" 
              align="start" 
              sideOffset={10} 
              collisionPadding={16} 
              className="z-[10000] w-56 border-white/40 bg-white/60 p-4 shadow-xl backdrop-blur-xl"
              container={typeof document !== 'undefined' ? document.getElementById('gis-presentation-stage') : null}
            >
              <Slider value={[width]} onValueChange={([value]) => onWidthChange(value)} min={1} max={14} step={0.5} />
              <div className="mt-4 flex items-center justify-between">
                {[2, 4, 7, 10].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    aria-label={`${preset}px`}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md border",
                      width === preset && "border-primary bg-primary/10",
                    )}
                    onClick={() => onWidthChange(preset)}
                  >
                    <span
                      className="rounded-full"
                      style={{
                        width: Math.max(8, preset * 1.6),
                        height: Math.max(8, preset * 1.6),
                        backgroundColor: color,
                      }}
                    />
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <ToolbarItemLabel label={`Finger guard (${stylusGuardHint})`} onHover={showHoverLabel} onLeave={() => setHoverLabel(null)}>
            <Button
              type="button"
              variant={isStylusMode ? "default" : "ghost"}
              size="icon"
              className={cn(
                "rounded-xl transition-all duration-200 hover:scale-[1.04]",
                isStylusMode && "shadow-[0_8px_18px_-10px_rgba(15,23,42,0.9)]",
              )}
              title={isStylusMode ? "Finger guard on (stylus prioritized)" : "Finger guard off"}
              aria-pressed={isStylusMode}
              data-active={isStylusMode ? "true" : "false"}
              onClick={() => onStylusModeChange(!isStylusMode)}
              style={iconButtonStyle}
            >
              <Pen className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </ToolbarItemLabel>
        </ToolbarSection>

        <Divider />

        <ToolbarSection columnCount={columnCount}>
          <ToolbarButton label="Undo" disabled={!canUndo} onHover={showHoverLabel} onLeave={() => setHoverLabel(null)} onClick={onUndo} style={iconButtonStyle}>
            <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ToolbarButton>
          <ToolbarButton label="Redo" disabled={!canRedo} onHover={showHoverLabel} onLeave={() => setHoverLabel(null)} onClick={onRedo} style={iconButtonStyle}>
            <RotateCw className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ToolbarButton>
          <ToolbarButton label="Delete selected" disabled={!hasSelection} onHover={showHoverLabel} onLeave={() => setHoverLabel(null)} onClick={onDeleteSelected} style={iconButtonStyle}>
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ToolbarButton>
          <ToolbarButton label="Clear all" onHover={showHoverLabel} onLeave={() => setHoverLabel(null)} onClick={onClear} style={iconButtonStyle}>
            <CircleSlash className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ToolbarButton>
          <ToolbarButton label="Deselect tool" onHover={showHoverLabel} onLeave={() => setHoverLabel(null)} onClick={onDeselectTool} style={iconButtonStyle}>
            <X className="h-3.5 w-3.5" strokeWidth={1.5} />
          </ToolbarButton>
        </ToolbarSection>
      </div>
    </div>
  );
});

function ToolbarSection({
  columnCount,
  children,
}: {
  columnCount: number;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1">
      <div
        className="grid justify-items-center gap-[var(--draw-toolbar-gap)]"
        style={{ gridTemplateColumns: `repeat(${columnCount}, minmax(0, var(--draw-tool-size)))` }}
      >
        {children}
      </div>
    </section>
  );
}

function ToolbarItemLabel({
  label,
  onHover,
  onLeave,
  children,
}: {
  label: string;
  onHover: (label: string, element: HTMLElement) => void;
  onLeave: () => void;
  children: ReactNode;
}) {
  return (
    <div
      onPointerEnter={(event) => onHover(label, event.currentTarget)}
      onPointerLeave={onLeave}
      onFocus={(event) => onHover(label, event.currentTarget)}
      onBlur={onLeave}
    >
      {children}
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onHover,
  onLeave,
  onClick,
  style,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onHover: (label: string, element: HTMLElement) => void;
  onLeave: () => void;
  onClick: () => void;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      onPointerEnter={(event) => onHover(label, event.currentTarget)}
      onPointerLeave={onLeave}
      onFocus={(event) => onHover(label, event.currentTarget)}
      onBlur={onLeave}
    >
      <Button
        type="button"
        variant={active ? "default" : "ghost"}
        size="icon"
        className={cn(
          "rounded-xl transition-all duration-200 hover:scale-[1.04]",
          active && "shadow-[0_8px_18px_-10px_rgba(15,23,42,0.9)]",
        )}
        data-active={active ? "true" : "false"}
        disabled={disabled}
        onClick={onClick}
        style={style}
      >
        {children}
      </Button>
    </div>
  );
}

function Divider() {
  return <span className="my-1 block h-px w-full bg-slate-200/90" />;
}

/** Vector pencil / freehand stroke — scales crisply at toolbar sizes (no bitmap icon). */
function FreehandStrokeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M4.5 18.5c2-1.2 3.5-4.8 5.6-6.6 1.4-1.2 2.8-1.6 4-1.4 1.6.2 2.8 1.1 4.2-.4 1.6-1.8 2.6-5.2 5.2-6.6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
