import { useMemo, useState, useEffect } from "react";
import { Container } from "react-bootstrap";

import "../App.css";
import "bootstrap/dist/css/bootstrap.min.css";

import Toolbar from "../components/toolbar";
import CardTop from "../components/cardTop";
import TransformerTable from "../components/transformerTable";
import Pager from "../components/pager";
import AddTransformerModal from "../components/AddTransformerModal";

export default function TransformersPage() {
  // Load from /public/data/transformers.json
  const [allTransformers, setAllTransformers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/data/transformers.json");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!cancelled) setAllTransformers(json);
      } catch (err) {
        if (!cancelled) setLoadError(err.message || "Failed to load data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Toolbar state
  const [sortBy, setSortBy] = useState("number"); // number | pole | region | type
  const [query, setQuery]   = useState("");
  const [range, setRange]   = useState("all");    // all | 24h | 7d | 30d | ytd
  const [starOnly, setStarOnly] = useState(false);

  // Favorites (by transformer.no)
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

  // Add/Edit modal
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null); // holds the row being edited or null

  const regions = [
    "Nugegoda","Maharagama","Kotte","Dehiwala","Rajagiriya",
    "Nawala","Battaramulla","Pelawatte","Boralesgamuwa",
  ];

  const handleEdit = (row) => {
    setEditing(row);
    setShowAdd(true);
  };

  const handleDelete = (row) => {
    if (!window.confirm(`Delete ${row.no}?`)) return;
    setAllTransformers(prev =>
      prev.filter(x => (x.id ?? x.no) !== (row.id ?? row.no))
    );
  };

  const handleAddSubmit = (payload) => {
    // If editing: replace existing row; else add new one to the top
    setAllTransformers(prev => {
      const keyOf = (x) => x.id ?? x.no;

      if (editing) {
        const updated = {
          ...editing,
          ...payload,
          id: editing.id ?? payload.id, // preserve existing id
          updatedAt: new Date().toISOString(),
        };
        return prev.map(x => keyOf(x) === keyOf(editing) ? updated : x);
      }

      const withId = {
        id: payload.id || `TX-${Date.now()}`,
        updatedAt: new Date().toISOString(),
        ...payload,
      };
      return [withId, ...prev];
    });

    setEditing(null);
    setShowAdd(false);
  };

  // Time-range cutoff
  const cutoff = useMemo(() => {
    if (range === "all") return null;
    const d = new Date();
    if (range === "24h") d.setDate(d.getDate() - 1);
    else if (range === "7d") d.setDate(d.getDate() - 7);
    else if (range === "30d") d.setDate(d.getDate() - 30);
    else if (range === "ytd") return new Date(new Date().getFullYear(), 0, 1);
    return d;
  }, [range]);

  // Filter + sort
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
      sortBy === "pole"   ? t.pole   :
      sortBy === "region" ? t.region :
      sortBy === "type"   ? t.type   :
                            t.no;

    out.sort((a, b) => collator.compare(key(a), key(b)));
    return out;
  }, [allTransformers, query, sortBy, starOnly, favs, cutoff]);

  // Pagination (10 per page)
  const PAGE_SIZE = 10;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));

  // Reset/clamp page
  useEffect(() => { setPage(1); }, [query, sortBy, range, starOnly, favs, allTransformers]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [totalPages, page]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  return (
    <Container fluid>
      <h2>☰ Transformers</h2>

      <div className="card">
        <div className="card-body">
          {/* Top bar (title + add button + toggle) */}
          <CardTop onAdd={() => { setEditing(null); setShowAdd(true); }} />

          {/* Filters */}
          <div className="mt-3">
            <Toolbar
              sortBy={sortBy} setSortBy={setSortBy}
              query={query}   setQuery={setQuery}
              range={range}   setRange={setRange}
              starOnly={starOnly} setStarOnly={setStarOnly}
              onReset={handleReset}
            />
          </div>

          {/* Table + pagination */}
          <div className="mt-3">
            {loading && <div className="text-muted">Loading transformers…</div>}
            {loadError && <div className="text-danger">Error: {loadError}</div>}
            {!loading && !loadError && (
              <>
                <TransformerTable
                  transformers={pagedRows}
                  favs={favs}
                  onToggleFav={toggleFav}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
                <div className="d-flex align-items-center justify-content-between">
                  <small className="text-muted">
                    Showing {(page - 1) * PAGE_SIZE + 1}
                    –
                    {Math.min(page * PAGE_SIZE, rows.length)} of {rows.length}
                  </small>
                  <Pager page={page} totalPages={totalPages} onChange={setPage} />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Transformer modal */}
      <AddTransformerModal
        show={showAdd}
        onClose={() => { setShowAdd(false); setEditing(null); }}
        onSubmit={handleAddSubmit}
        regions={regions}
        initialData={editing}
      />
    </Container>
  );
}
