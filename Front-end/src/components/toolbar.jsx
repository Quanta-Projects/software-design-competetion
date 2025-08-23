// src/components/toolbar.jsx
import { Row, Col, Form, InputGroup, Button } from "react-bootstrap";

export default function Toolbar({
  sortBy, setSortBy,
  query, setQuery,
  range, setRange,
  starOnly, setStarOnly,
  onReset
}) {
  return (
    <Row className="g-2 align-items-center">
      {/* Sort by */}
      <Col xs="12" md="auto">
        <Form.Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="pill">
          <option value="number">By Transformer No</option>
          <option value="pole">By Pole No</option>
          <option value="region">By Region</option>
          <option value="type">By Type</option>
        </Form.Select>
      </Col>

      {/* Search */}
      <Col xs={12} md="4" lg="5">
        <InputGroup className="pill">
          <Form.Control
            placeholder="Search Transformer"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button
            variant="primary"
            className="icon-btn"
            onClick={() => {/* optional: trigger anything; filtering already live */}}
          >
            {/* <img src="/img/search.png" alt="search" width={20} height={20} style={{ display: "block", objectFit: "contain" }} /> */}
            <i className="bi bi-search" />
          </Button>
        </InputGroup>
      </Col>

      {/* Favorites only */}
      <Col xs="auto" className="d-none d-md-block">
        <Button
          type="button"
          onClick={() => setStarOnly(v => !v)}
          aria-pressed={starOnly}
          title={starOnly ? "Show all" : "Show favorites only"}
          variant={starOnly ? "warning" : "light"}
          className="icon-only shadow-sm d-flex align-items-center justify-content-center"
          style={{ width: 44, height: 44, padding: 0, borderRadius: 12 }}
        >
          <img src="/img/star.png" alt="favorites" width={20} height={20} style={{ display: "block", objectFit: "contain" }} />
        </Button>
      </Col>

      {/* Time range */}
      <Col xs="12" md="auto">
        <Form.Select value={range} onChange={(e) => setRange(e.target.value)} className="pill">
          <option value="all">All Time</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="ytd">Year to date</option>
        </Form.Select>
      </Col>

      {/* Reset */}
      <Col xs="auto">
        <Button variant="link" className="text-primary fw-semibold p-0" onClick={onReset}>
          Reset Filters
        </Button>
      </Col>
    </Row>
  );
}
