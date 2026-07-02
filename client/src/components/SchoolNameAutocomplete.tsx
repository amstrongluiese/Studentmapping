import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { SchoolRegistry as School } from "@shared/schema";
import { api } from "@shared/routes";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Building2, MapPin, Search } from "lucide-react";
import { hasCoordinates } from "@shared/schoolRegistry";

export type SchoolSearchSelection =
  | { type: "registry"; school: School };

type SuggestionRow =
  | { id: string; kind: "registry"; school: School; label: string; sub: string }
  | { id: string; kind: "custom"; name: string; label: string; sub: string; school?: any };

export interface SchoolNameAutocompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  onSelect: (selection: SchoolSearchSelection) => void;
  existingSchools: School[];
  placeholder?: string;
  inputClassName?: string;
  disabled?: boolean;
  inputId?: string;
}

const DEBOUNCE_MS = 320;

export function SchoolNameAutocomplete({
  value,
  onValueChange,
  onSelect,
  existingSchools,
  placeholder = "Search or enter school name…",
  inputClassName,
  disabled,
  inputId,
}: SchoolNameAutocompleteProps) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [rows, setRows] = useState<SuggestionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<number | null>(null);

  const localFallbackRows = useMemo((): SuggestionRow[] => {
    const q = value.trim().toLowerCase();
    if (q.length < 2) return [];
    return existingSchools
      .filter((school) =>
        school.schoolName.toLowerCase().includes(q) ||
        school.municipality.toLowerCase().includes(q),
      )
      .slice(0, 6)
      .map((school) => ({
        id: `registry-${school.id}`,
        kind: "registry" as const,
        school,
        label: school.schoolName,
        sub: [school.municipality, hasCoordinates(school) ? "Has coordinates" : "Needs coordinates"]
          .filter(Boolean)
          .join(" · "),
      }));
  }, [existingSchools, value]);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setRows([]);
      return;
    }

    setLoading(true);
    const customSuggestion: SuggestionRow = {
      id: "custom-use",
      kind: "custom",
      name: query,
      label: `Use "${query}"`,
      sub: "Confirm with Locate or Save — not saved while typing",
    };

    try {
      const url = new URL(api.geocode.suggest.path, window.location.origin).href;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        console.warn(
          `[SchoolNameAutocomplete] geocode suggest failed: ${res.status} ${res.statusText} for ${url}`,
        );
        setRows([...localFallbackRows, customSuggestion].slice(0, 10));
        return;
      }

      const data = api.geocode.suggest.responses[200].parse(await res.json());
      const registryRows: SuggestionRow[] = data.registry.map((school) => ({
        id: `registry-${school.id}`,
        kind: "registry",
        school,
        label: school.schoolName,
        sub: [school.municipality, hasCoordinates(school) ? "Has coordinates" : "Needs coordinates"]
          .filter(Boolean)
          .join(" · "),
      }));
      
      const seen = new Set<string>();
      const uniqueRows = registryRows.filter((row) => {
        const key = `registry-${row.school.id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const combinedRows = uniqueRows.length > 0 ? uniqueRows : localFallbackRows;
      setRows([...combinedRows, customSuggestion].slice(0, 10));
    } catch {
      setRows([...localFallbackRows, customSuggestion].slice(0, 10));
    } finally {
      setLoading(false);
    }
  }, [localFallbackRows]);

  useEffect(() => {
    const q = value.trim();
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (q.length < 2) {
      setRows([]);
      setOpen(false);
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      void fetchSuggestions(q);
      setOpen(true);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [value, fetchSuggestions]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [rows.length, value]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const commitSelection = (row: SuggestionRow) => {
    if (row.kind === "registry") {
      onValueChange(row.school.schoolName);
      onSelect({ type: "registry", school: row.school });
    } else {
      onValueChange(row.name);
    }
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (!rows.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setHighlightIndex((i) => (i + 1) % rows.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setHighlightIndex((i) => (i - 1 + rows.length) % rows.length);
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      const row = rows[highlightIndex];
      if (row) commitSelection(row);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const showList = open && value.trim().length >= 2 && rows.length > 0;

  return (
    <div ref={rootRef} className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        id={inputId}
        name="schoolNameSearch"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listboxId}
        aria-activedescendant={showList ? rows[highlightIndex]?.id : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        placeholder={placeholder}
        className={cn("pl-9", inputClassName)}
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (value.trim().length >= 2) setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />

      {showList ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-[200] max-h-56 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-2 text-[11px] text-slate-500">Searching…</li>
          ) : null}
          {rows.map((row, index) => (
            <li key={row.id} role="presentation">
              <button
                type="button"
                id={row.id}
                role="option"
                aria-selected={index === highlightIndex}
                className={cn(
                  "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors",
                  index === highlightIndex ? "bg-slate-100" : "hover:bg-slate-50",
                  row.kind === "custom" && "border-t border-slate-100",
                )}
                onPointerEnter={() => setHighlightIndex(index)}
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => commitSelection(row)}
              >
                {row.kind === "registry" ? (
                  <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                ) : (
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-900">{row.label}</span>
                  {row.sub ? (
                    <span className="block truncate text-[11px] text-slate-500">{row.sub}</span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
