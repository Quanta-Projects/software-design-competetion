import { useMemo, useState, useEffect } from "react";
import { Container } from "react-bootstrap";

import "../App.css";
import "bootstrap/dist/css/bootstrap.min.css";

import Toolbar from "../components/toolbar";
import CardTop from "../components/cardTop";
import TransformerTable from "../components/transformerTable";
import Pager from "../components/pager";
import AddTransformerModal from "../components/AddTransformerModal";
import { getRestApiUrl } from "../utils/config";
import { TRANSFORMER_SORT_OPTIONS, TIME_RANGE_OPTIONS, SEARCH_PLACEHOLDERS } from "../utils/uiOptions";

export default function TransformersPage() {
  // Load transformers from backend API
  const [allTransformers, setAllTransformers] = useState([]);
  const [regions, setRegions] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Fetch transformers, regions, and types in parallel
        const [transformersRes, regionsRes, typesRes] = await Promise.all([
          fetch(getRestApiUrl("transformers")),
          fetch(getRestApiUrl("transformers/regions")),
          fetch(getRestApiUrl("transformers/types"))
        ]);

        if (!transformersRes.ok) throw new Error(`HTTP ${transformersRes.status}`);
        if (!regionsRes.ok) throw new Error(`HTTP ${regionsRes.status}`);
        if (!typesRes.ok) throw new Error(`HTTP ${typesRes.status}`);

        const [transformersJson, regionsJson, typesJson] = await Promise.all([
          transformersRes.json(),
          regionsRes.json(),
          typesRes.json()
        ]);

        if (!cancelled) {
          setAllTransformers(transformersJson);
          setRegions(regionsJson);
          setTypes(typesJson);
        }
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

  const handleEdit = (row) => {
    // Map backend field names to frontend field names for the modal
    const editData = {
      region: row.region || "",
      no: row.transformerNo || "",
      pole: row.pole_no || "",
      type: row.transformerType || "",
      location: row.location || "",
    };
    setEditing({ ...row, ...editData }); // Keep original row data plus mapped fields
    setShowAdd(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Delete ${row.transformerNo}?`)) return;
    
    try {
      const response = await fetch(getRestApiUrl(`transformers/${row.id}`), {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setAllTransformers(prev => prev.filter(x => x.id !== row.id));
      } else {
        alert('Failed to delete transformer');
      }
    } catch (error) {
      alert('Error deleting transformer: ' + error.message);
    }
  };

  const handleAddSubmit = async (payload) => {
    try {
      // Map frontend field names to backend field names
      // Ensure enum values are in the correct format (uppercase)
      const transformerData = {
        transformerNo: payload.no,
        location: payload.location,
        pole_no: payload.pole,
        region: payload.region, // Should already be in correct enum format
        transformerType: payload.type // Should already be in correct enum format
      };

      console.log("Sending transformer data to backend:", transformerData);

      if (editing) {
        // Update existing transformer
        const response = await fetch(getRestApiUrl(`transformers/${editing.id}`), {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transformerData),
        });

        if (response.ok) {
          const updatedTransformer = await response.json();
          setAllTransformers(prev =>
            prev.map(x => x.id === editing.id ? updatedTransformer : x)
          );
        } else {
          alert('Failed to update transformer');
          return;
        }
      } else {
        // Add new transformer
        const response = await fetch(getRestApiUrl('transformers'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transformerData),
        });

        if (response.ok) {
          const newTransformer = await response.json();
          setAllTransformers(prev => [newTransformer, ...prev]);
        } else {
          alert('Failed to add transformer');
          return;
        }
      }

      setEditing(null);
      setShowAdd(false);
    } catch (error) {
      alert('Error saving transformer: ' + error.message);
    }
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
      if (starOnly && !favs.has(t.transformerNo)) return false;
      if (cutoff && t.updatedAt && new Date(t.updatedAt) < cutoff) return false;

      if (q) {
        const hay = `${t.transformerNo} ${t.pole_no} ${t.region} ${t.transformerType}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
    const key = (t) =>
      sortBy === "pole"   ? t.pole_no   :
      sortBy === "region" ? t.region :
      sortBy === "type"   ? t.transformerType   :
                            t.transformerNo;

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
    const pageData = rows.slice(start, start + PAGE_SIZE);
    
    // Map backend field names to frontend field names expected by the table
    return pageData.map(transformer => ({
      ...transformer, // Keep all original fields
      no: transformer.transformerNo, // Map transformerNo to no
      pole: transformer.pole_no, // Map pole_no to pole  
      type: transformer.transformerType, // Map transformerType to type
      region: transformer.region // region stays the same
    }));
  }, [rows, page]);

  return (
    <Container fluid>
      <h2>Transformers</h2>

      <div className="card">
        <div className="card-body">
          {/* Top bar (title + add button + toggle) */}
          <CardTop onAdd={() => { setEditing(null); setShowAdd(true); }} showToggle={true} hideBack={true} />

          {/* Filters */}
          <div className="mt-3">
            <Toolbar
              sortBy={sortBy} setSortBy={setSortBy}
              query={query}   setQuery={setQuery}
              range={range}   setRange={setRange}
              starOnly={starOnly} setStarOnly={setStarOnly}
              onReset={handleReset}
              sortOptions={TRANSFORMER_SORT_OPTIONS}
              rangeOptions={TIME_RANGE_OPTIONS}
              searchPlaceholder={SEARCH_PLACEHOLDERS.transformers}
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
        types={types}
        initialData={editing}
      />
    </Container>
  );
}
