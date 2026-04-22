import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} theme`}
      className="h-8 w-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--elev-1)] transition-colors"
    >
      {theme === "dark" ? (
        <Sun size={14} strokeWidth={1.6} />
      ) : (
        <Moon size={14} strokeWidth={1.6} />
      )}
    </button>
  );
}
