import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, type ThemePreference } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

const options: { value: ThemePreference; label: string; icon: typeof Monitor }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="relative z-[10010]">
      <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative z-[10010] h-9 gap-2 rounded-full border-border/80 bg-surface/85 px-3 text-xs font-semibold text-text shadow-[0_12px_32px_-26px_rgba(15,23,42,0.6)] backdrop-blur-md hover:bg-surface-soft"
          aria-label="Theme"
          title="Theme"
        >
          <Sun className="h-3.5 w-3.5 dark:hidden" />
          <Moon className="hidden h-3.5 w-3.5 dark:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="z-[10020] w-40">
        {options.map(({ value, label, icon: Icon }) => (
          <DropdownMenuItem key={value} onClick={() => setTheme(value)} className="cursor-pointer">
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            <Check className={cn("ml-auto h-4 w-4", theme === value ? "opacity-100" : "opacity-0")} />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}
