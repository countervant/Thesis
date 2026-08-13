export const MAX_SEARCH_TERM_LENGTH = 100;

export const getSafeSearchPattern = (value) => {
  const term = String(value ?? "").trim().slice(0, MAX_SEARCH_TERM_LENGTH);
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};
