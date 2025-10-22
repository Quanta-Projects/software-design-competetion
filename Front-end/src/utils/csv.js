/**
 * Convert an array of objects to CSV format
 * @param {Array<Record<string, unknown>>} rows - Array of objects to convert
 * @returns {string} CSV formatted string with CRLF line endings
 */
export function jsonToCsv(rows) {
  if (!rows || rows.length === 0) return "";
  
  // Collect all unique keys from all objects
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row ?? {}).forEach(k => set.add(k));
      return set;
    }, new Set())
  );
  
  /**
   * Escape a field value for CSV format
   * - Doubles quotes (") to escape them
   * - Wraps field in quotes if it contains commas, quotes, or newlines
   */
  const escape = (val) => {
    const s = val == null ? "" : String(val);
    const needsQuotes = /[",\n\r]/.test(s);
    const escaped = s.replace(/"/g, '""');
    return needsQuotes ? `"${escaped}"` : escaped;
  };
  
  // Build CSV content
  const headerLine = headers.join(",");
  const lines = rows.map(row => 
    headers.map(h => escape(row[h])).join(",")
  );
  
  // Use CRLF line endings as per requirement
  return [headerLine, ...lines].join("\r\n");
}
