import { Row, Col, Form, InputGroup, Button } from "react-bootstrap";
import { useState } from "react";

export default function Toolbar() {
  const [sortBy, setSortBy] = useState("number");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("all");
  const [starOn, setStarOn] = useState(false); // toggle state for star button

  const handleReset = () => {
    setSortBy("number");
    setQuery("");
    setRange("all");
    setStarOn(false);
  };

  return (
    <Row className="g-2 align-items-center">
      {/* Sort by (dropdown) */}
      <Col xs="12" md="auto">
        <Form.Select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="pill"
        >
          <option value="number">By Transformer No</option>
          <option value="name">By Name</option>
          <option value="status">By Status</option>
          <option value="location">By Location</option>
        </Form.Select>
      </Col>

      {/* Search + button */}
      <Col xs={12} md="4" lg="5">
        <InputGroup className="pill">
          <Form.Control
            placeholder="Search Transformer"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button variant="primary" className="icon-btn">
            <img
            src="/img/search.png"
            alt="favorites"
            width={20}
            height={20}
            style={{ display: "block", objectFit: "contain" }} // perfectly centered
          />
            <i className="bi bi-search" />
          </Button>
        </InputGroup>
      </Col>

      {/* Star (favorites) */}
      <Col xs="auto" className="d-none d-md-block">
        <Button
          type="button"
          onClick={() => setStarOn((v) => !v)}
          aria-pressed={starOn}
          title={starOn ? "Show all (favorites off)" : "Show favorites only"}
          variant={starOn ? "warning" : "light"} // lit vs off
          className="icon-only shadow-sm d-flex align-items-center justify-content-center"
          style={{
            width: 44,           // square
            height: 44,          // square
            padding: 0,          // no extra padding
            borderRadius: 12,    // slightly rounded square (not pill)
          }}
        >
          <img
            src="/img/star.png"
            alt="favorites"
            width={20}
            height={20}
            style={{ display: "block", objectFit: "contain" }} // perfectly centered
          />
        </Button>
      </Col>

      {/* Time filter */}
      <Col xs="12" md="auto">
        <Form.Select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="pill"
        >
          <option value="all">All Time</option>
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="ytd">Year to date</option>
        </Form.Select>
      </Col>

      {/* Reset */}
      <Col xs="auto">
        <Button
          variant="link"
          className="text-primary fw-semibold p-0"
          onClick={handleReset}
        >
          Reset Filters
        </Button>
      </Col>
    </Row>
  );
}
