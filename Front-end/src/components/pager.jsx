// src/components/Pager.jsx
import { Pagination } from "react-bootstrap";

export default function Pager({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  // build a compact page list like: 1 … 3 4 5 … 50
  const makePages = () => {
    const s = new Set([1, page - 1, page, page + 1, totalPages]);
    const pages = [...s].filter(p => p >= 1 && p <= totalPages).sort((a, b) => a - b);

    const result = [];
    for (let i = 0; i < pages.length; i++) {
      const cur = pages[i];
      const prev = pages[i - 1];
      if (i && cur - prev > 1) result.push("ellipsis");
      result.push(cur);
    }
    return result;
  };

  const items = makePages();

  return (
    <Pagination className="my-3">
      <Pagination.Prev disabled={page === 1} onClick={() => onChange(page - 1)} />
      {items.map((it, idx) =>
        it === "ellipsis" ? (
          <Pagination.Ellipsis key={`e${idx}`} disabled />
        ) : (
          <Pagination.Item
            key={it}
            active={it === page}
            onClick={() => onChange(it)}
          >
            {it}
          </Pagination.Item>
        )
      )}
      <Pagination.Next disabled={page === totalPages} onClick={() => onChange(page + 1)} />
    </Pagination>
  );
}
