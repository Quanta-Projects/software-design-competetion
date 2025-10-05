export const TRANSFORMER_SORT_OPTIONS = [
  { value: "number", label: "By Transformer No" },
  { value: "pole", label: "By Pole No" },
  { value: "region", label: "By Region" },
  { value: "type", label: "By Type" },
];

export const INSPECTION_SORT_OPTIONS = [
  { value: "number", label: "By Inspection No" },
  { value: "status", label: "By Status" },
  { value: "date", label: "By Date" },
  { value: "branch", label: "By Region" },
];

export const TIME_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "ytd", label: "Year to date" },
];

export const INSPECTION_TIME_RANGE_OPTIONS = TIME_RANGE_OPTIONS;

export const SEARCH_PLACEHOLDERS = {
  transformers: "Search transformer",
  inspections: "Search inspection",
};
