import { useEffect, useState } from "react";
import themeIcon from "../../assets/theme.png";

const themeStorageKey = "clientraTheme";

const AuthThemeToggle = () => {
  const [isDarkMode, setIsDarkMode] = useState(
    () => localStorage.getItem(themeStorageKey) === "dark"
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem(themeStorageKey, isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-50">
      <button
        type="button"
        onClick={() => setIsDarkMode((currentMode) => !currentMode)}
        className="pointer-events-auto grid h-12 w-12 place-items-center rounded-full border border-pink-200 bg-white text-neutral-950 shadow-[0_8px_24px_rgba(219,74,181,0.25)] transition hover:scale-105 hover:border-[#dc4fb2] dark:border-[#dc4fb2] dark:bg-[#101010] dark:shadow-[0_0_0_1px_rgba(236,92,199,0.25),0_10px_28px_rgba(236,92,199,0.28)]"
        aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
        title={isDarkMode ? "Light mode" : "Dark mode"}
      >
        <img
          src={themeIcon}
          alt=""
          className="h-7 w-7 object-contain dark:brightness-0 dark:invert"
          aria-hidden="true"
        />
      </button>
    </div>
  );
};

export default AuthThemeToggle;
