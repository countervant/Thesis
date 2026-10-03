/**
 * Safely unwraps nested data envelopes (e.g., Axios { data: ... } or API { success, data: ... }).
 * Ensures components receive clean payloads without having to traverse .data.data.
 */
export const unwrapData = (response) => {
  if (response && typeof response === "object") {
    if ("data" in response && response.data !== undefined) {
      const nested = response.data;
      if (
        nested &&
        typeof nested === "object" &&
        "data" in nested &&
        nested.data !== undefined &&
        "success" in nested
      ) {
        return nested.data;
      }
      return nested;
    }
  }
  return response;
};
