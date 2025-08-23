// src/pages/TransformersPage.jsx
import { useMemo, useState, useEffect } from "react";
import { Container } from "react-bootstrap";
import "../App.css";
import "bootstrap/dist/css/bootstrap.min.css";
import Toolbar from "../components/toolbar";
import CardTop from "../components/cardTop";
import TransformerTable from "../components/transformerTable";
import Pager from "../components/pager";

export default function TransformersPage() {
  // load JSON from /public or import from /src (your current loader is fine)
  const [allTransformers, setAllTransformers] = useState([]);
  useEffect(() => {
    fetch("/data/transformers.json").then(r => r.json()).then(setAllTransformers);
  }, []);

  // toolbar state (unchanged)
  const [sortBy, setSortBy] = useState("number");
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("all");
  const [starOnly, setStarOnly] = useState(false);

  const [favs, setFavs] = useState(() => new Set());
  const toggleFav = (no) => {
    setFavs(prev => {
      const next = new Set(prev);
      next.has(no) ? next.delete(no) : next.add(no);
      return next;
    });
  };

  const handleReset = () => {
    setSortBy("number");
    setQuery("");
    setRange("all");
    setStarOnly(false);
  };

  // time-range cutoff
  const cutoff = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    if (range === "24h") d.setDate(d.getDate() - 1);
    else if (range === "7d") d.setDate(d.getDate() - 7);
    else if (range === "30d") d.setDate(d.getDate() - 30);
    else if (range === "ytd") return new Date(new Date().getFullYear(), 0, 1);
    return d;
  }, [range]);

  // filter + sort
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = allTransformers.filter(t => {
      if (starOnly && !favs.has(t.no)) return false;
      if (cutoff && t.updatedAt && new Date(t.updatedAt) < cutoff) return false;
      if (q) {
        const hay = `${t.no} ${t.pole} ${t.region} ${t.type}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    const key = (t) =>
      sortBy === "pole" ? t.pole :
      sortBy === "region" ? t.region :
      sortBy === "type" ? t.type : t.no;

    out.sort((a, b) => collator.compare(key(a), key(b)));
    return out;
  }, [allTransformers, query, sortBy, starOnly, favs, cutoff]);

  // --- pagination ---
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  // keep page in range & reset to 1 when filters change
  useEffect(() => { setPage(1); }, [query, sortBy, range, starOnly, favs]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  return (
    <Container fluid>
      <h2>☰ Transformers</h2>
      <div className="card">
        <div className="card-body">
          <CardTop />

          <div className="mt-3">
            <Toolbar
              sortBy={sortBy} setSortBy={setSortBy}
              query={query}   setQuery={setQuery}
              range={range}   setRange={setRange}
              starOnly={starOnly} setStarOnly={setStarOnly}
              onReset={handleReset}
            />
          </div>

          <div className="mt-3">
            <TransformerTable
              transformers={pagedRows}
              favs={favs}
              onToggleFav={toggleFav}
            />
            <div className="d-flex align-items-center justify-content-between">
              <small className="text-muted">
                Showing {(page - 1) * PAGE_SIZE + 1}
                –
                {Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}
              </small>
              <Pager page={page} totalPages={totalPages} onChange={setPage} />
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
