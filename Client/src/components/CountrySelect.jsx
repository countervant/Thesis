import { useMemo, useState } from "react";
import { countryOptions } from "../utils/countries.js";

const CountrySelect = ({ className = "", onChange, value, ...props }) => {
  const [query, setQuery] = useState("");
  const options = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return countryOptions;

    return countryOptions.filter((option) =>
      [option.name, option.code]
        .filter(Boolean)
        .some((item) => item.toLowerCase().includes(normalizedQuery))
    );
  }, [query]);

  return (
    <div className="space-y-2">
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search country"
        className={className}
      />
      <select
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        className={className}
        {...props}
      >
        {options.map((option) => (
          <option key={option.name} value={option.name}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CountrySelect;
