const FORMULA_PREFIX_PATTERN = /^[=+\-@\t\r]/;

export const escapeCsvCell = (cell) => {
  const value = String(cell ?? "");
  const safeValue = FORMULA_PREFIX_PATTERN.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
};

export const downloadCsv = (rows, fileName) => {
  const csv = rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
