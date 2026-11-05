import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../../context/ThemeContext";

export default function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      title={isDark ? "Light theme" : "Dark theme"}
      className="inline-grid size-10 cursor-pointer place-items-center rounded-full border border-line bg-surface text-sage-deep transition-colors hover:border-sage hover:bg-sage-wash focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-deep"
    >
      {isDark ? (
        <Sun size={18} strokeWidth={1.7} />
      ) : (
        <Moon size={18} strokeWidth={1.7} />
      )}
    </button>
  );
}