import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import type { DrawingPoint, DrawingObject } from "@/lib/drawingUtils";

interface LabelEditorProps {
  label: DrawingObject | null;
  position: DrawingPoint | null;
  onUpdateText: (id: string, text: string) => void;
  onRemove: (id: string) => void;
  onStartDrag: (id: string, startPoint: DrawingPoint) => void;
  onDrag: (id: string, point: DrawingPoint) => void;
  onEndDrag: (id: string) => void;
  onClose: () => void;
}

export const LabelEditor = ({
  label,
  position,
  onUpdateText,
  onRemove,
  onStartDrag,
  onDrag,
  onEndDrag,
  onClose,
}: LabelEditorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragStateRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
  } | null>(null);
  const [text, setText] = useState(label?.label || "");
  const [isEditing, setIsEditing] = useState(false);
  const [position_, setPosition] = useState(position);

  // Sync position when label changes
  useEffect(() => {
    if (label?.points[0]) {
      setPosition({ x: label.points[0].x || 0, y: label.points[0].y || 0 });
    }
  }, [label]);

  // Update text when label changes externally
  useEffect(() => {
    if (label?.label !== text) {
      setText(label?.label || "");
    }
  }, [label?.label]);

  const handleTextChange = (newText: string) => {
    setText(newText);
  };

  const handleTextBlur = () => {
    if (label) {
      onUpdateText(label.id, text);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      setIsEditing(false);
    } else if (e.key === "Enter" && e.ctrlKey) {
      handleTextBlur();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!label || isEditing || !containerRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = containerRef.current.getBoundingClientRect();
    dragStateRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };

    onStartDrag(label.id, position_ || { x: 0, y: 0 });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragStateRef.current?.isDragging || !label) return;
    const deltaX = e.clientX - dragStateRef.current.startX;
    const deltaY = e.clientY - dragStateRef.current.startY;

    const newPos = {
      x: (position_?.x || 0) + deltaX,
      y: (position_?.y || 0) + deltaY,
    };
    onDrag(label.id, newPos);
    setPosition(newPos);
  };

  const handleMouseUp = () => {
    if (dragStateRef.current?.isDragging && label) {
      onEndDrag(label.id);
    }
    dragStateRef.current = null;
  };

  useEffect(() => {
    if (dragStateRef.current?.isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [label, position_]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  if (!label || !position_) return null;

  return (
    <div
      ref={containerRef}
      className="absolute z-[1091] flex flex-col gap-1 rounded-lg bg-white shadow-lg border border-slate-200"
      style={{
        left: `${position_.x}px`,
        top: `${position_.y}px`,
        transform: "translate(-50%, -50%)",
        minWidth: "160px",
        maxWidth: "280px",
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header/Drag area */}
      <div className="flex items-center justify-between px-2 pt-2">
        <div
          className="flex-1 text-xs font-medium text-slate-500 select-none cursor-move"
          onDoubleClick={() => setIsEditing(true)}
        >
          Text Label
        </div>
        <button
          onClick={() => {
            onRemove(label.id);
            onClose();
          }}
          className="p-0.5 hover:bg-slate-100 rounded transition-colors"
          title="Delete label"
        >
          <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
        </button>
      </div>

      {/* Content area */}
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          onBlur={handleTextBlur}
          onKeyDown={handleKeyDown}
          className="px-2 pb-2 text-sm font-normal rounded border-none resize-none focus:outline-none bg-slate-50 text-slate-900 placeholder-slate-400"
          style={{ minHeight: "60px", fontFamily: '"DM Sans", Arial, sans-serif' }}
          placeholder="Enter text..."
        />
      ) : (
        <div
          onClick={() => setIsEditing(true)}
          className="px-2 pb-2 text-sm font-normal text-slate-800 cursor-text select-text break-words whitespace-pre-wrap"
          style={{ minHeight: "20px", fontFamily: '"DM Sans", Arial, sans-serif' }}
        >
          {text || "(empty)"}
        </div>
      )}
    </div>
  );
};
