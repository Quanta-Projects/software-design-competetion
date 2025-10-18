// Front-end/src/components/toolbar.jsx

import { Form, InputGroup, Button } from "react-bootstrap";
import "./toolbar.css";

const DEFAULT_SORT_OPTIONS = [
  { value: "number", label: "By Transformer No" },
  { value: "pole", label: "By Pole No" },
  { value: "region", label: "By Region" },
  { value: "type", label: "By Type" },
];

const DEFAULT_RANGE_OPTIONS = [
  { value: "all", label: "All Time" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "ytd", label: "Year to date" },
];

export default function Toolbar({
  sortBy,
  setSortBy,
  query,
  setQuery,
  range,
  setRange,
  starOnly,
  setStarOnly,
  onReset,
  sortOptions = DEFAULT_SORT_OPTIONS,
  rangeOptions = DEFAULT_RANGE_OPTIONS,
  searchPlaceholder = "Search transformer",
  showFavoritesToggle = true,
}) {
  const resolvedSortOptions = sortOptions.length ? sortOptions : DEFAULT_SORT_OPTIONS;
  const resolvedRangeOptions = rangeOptions.length ? rangeOptions : DEFAULT_RANGE_OPTIONS;
  const canToggleFavorites = showFavoritesToggle && typeof setStarOnly === "function";

  return (
    <div className="ui-toolbar shadow-sm">
      {/* Sort dropdown */}
      <div className="ui-toolbar__sort">
        <Form.Label htmlFor="toolbar-sort" className="visually-hidden">
          Sort by
        </Form.Label>
        <Form.Select
          id="toolbar-sort"
          value={sortBy}
          onChange={(e) => setSortBy?.(e.target.value)}
          className="pill"
        >
          {resolvedSortOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Form.Select>
      </div>

      {/* Search box */}
      <div className="ui-toolbar__search">
        <InputGroup className="pill">
          <Form.Label htmlFor="toolbar-search" className="visually-hidden">
            Search
          </Form.Label>
          <Form.Control
            id="toolbar-search"
            placeholder={searchPlaceholder}
            value={query}
            onChange={(e) => setQuery?.(e.target.value)}
          />
          <Button
            variant="primary"
            className="ui-icon-btn"
            aria-label="Search"
          >
            <i className="bi bi-search" aria-hidden="true" />
          </Button>
        </InputGroup>
      </div>

      {/* Favorites toggle */}
      {canToggleFavorites && (
        <div className="ui-toolbar__favorites">
          <Button
            type="button"
            onClick={() => setStarOnly?.((v) => !v)}
            aria-pressed={!!starOnly}
            aria-label={starOnly ? "Show all items" : "Show favorites only"}
            variant={starOnly ? "warning" : "light"}
            className="ui-icon-btn shadow-sm"
          >
            <i className={starOnly ? "bi bi-star-fill" : "bi bi-star"} aria-hidden="true" />
          </Button>
        </div>
      )}

      {/* Time range dropdown */}
      <div className="ui-toolbar__range">
        <Form.Label htmlFor="toolbar-range" className="visually-hidden">
          Time range
        </Form.Label>
        <Form.Select
          id="toolbar-range"
          value={range}
          onChange={(e) => setRange?.(e.target.value)}
          className="pill"
        >
          {resolvedRangeOptions.map(({ value, label }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Form.Select>
      </div>

      {/* Reset button */}
      <div className="ui-toolbar__reset">
        <Button variant="link" className="ui-ghost-link" onClick={onReset}>
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
