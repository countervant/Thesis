import { useEffect, useMemo, useRef, useState } from "react";
import { countryOptions } from "../utils/countries.js";

const CountrySelect = ({ className = "", onChange, value, ...props }) => {
  const wrapperRef = useRef(null);
  const [query, setQuery] = useState(value || "");
  const [lastValue, setLastValue] = useState(value || "");
  const [isOpen, setIsOpen] = useState(false);

  if ((value || "") !== lastValue) {
    setLastValue(value || "");
    setQuery(value || "");
  }

  const options = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return countryOptions;

    return countryOptions.filter((option) =>
      [option.name, option.code]
        .filter(Boolean)
        .some((item) => item.toLowerCase().includes(normalizedQuery))
    );
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
        setQuery(value || "");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const handleSelect = (countryName) => {
    onChange?.(countryName);
    setQuery(countryName);
    setIsOpen(false);
  };

  const handleBlurToValidValue = () => {
    window.setTimeout(() => {
      if (!isOpen) return;
      const exactMatch = countryOptions.find(
        (option) => option.name.toLowerCase() === query.trim().toLowerCase()
      );
      if (exactMatch) {
        handleSelect(exactMatch.name);
      } else if (!options.some((option) => option.name === value)) {
        setQuery(value || "");
      }
    }, 120);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlurToValidValue}
        placeholder="Search country"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        className={`${className} pr-9`}
        {...props}
      />
      <button
        type="button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setIsOpen((currentIsOpen) => !currentIsOpen)}
        className="absolute right-1 top-1/2 z-10 grid h-8 w-8 -translate-y-1/2 place-items-center text-slate-500 transition hover:text-pink-500 dark:text-white/75 dark:hover:text-pink-300"
        aria-label={isOpen ? "Close country options" : "Open country options"}
      >
        <svg
          viewBox="0 0 20 20"
          className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m5 7.5 5 5 5-5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-lg border border-neutral-200 bg-white py-1 text-sm shadow-xl dark:border-neutral-800 dark:bg-neutral-950">
          {options.length === 0 ? (
            <p className="px-4 py-3 text-neutral-500">No country found.</p>
          ) : (
            options.map((option) => (
              <button
                key={option.name}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => handleSelect(option.name)}
                className={`block w-full px-4 py-2 text-left font-medium hover:bg-pink-50 hover:text-[#c72fb2] dark:hover:bg-neutral-900 ${
                  option.name === value
                    ? "text-[#c72fb2]"
                    : "text-neutral-800 dark:text-neutral-100"
                }`}
              >
                {option.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CountrySelect;
