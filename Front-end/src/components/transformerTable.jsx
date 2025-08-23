import { Table } from "react-bootstrap";
import { useState } from "react";
// If you haven't already, add once in your app entry:
// import "bootstrap-icons/font/bootstrap-icons.css";

function TransformerTable({ transformers = [] }) {
  // Track favourites by transformer.no
  const [favs, setFavs] = useState(() => new Set());

  const toggleFav = (no) => {
    setFavs((prev) => {
      const next = new Set(prev);
      next.has(no) ? next.delete(no) : next.add(no);
      return next;
    });
  };

  return (
    <Table striped bordered hover className="align-middle">
      <thead>
        <tr>
          <th
            style={{ width: 52 }}
            aria-label="Favourite"
            className="text-center"
          />
          <th>Transformer No.</th>
          <th>Pole NO.</th>
          <th>Region</th>
          <th>Type</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {transformers.map((transformer) => {
          const isFav = favs.has(transformer.no);
          return (
            <tr key={transformer.no}>
              <td className="text-center align-middle">
                <button
                  type="button"
                  onClick={() => toggleFav(transformer.no)}
                  aria-pressed={isFav}
                  aria-label={isFav ? "Unmark favourite" : "Mark as favourite"}
                  className={`btn ${isFav ? "btn-warning" : "btn-light"} d-inline-flex align-items-center justify-content-center p-0 shadow-sm`}
                  style={{ width: 25, height: 25, borderRadius: 8 }}
                >
                  <img src="/img/star.png" alt="favorites" width={20} height={20} style={{ display: "block", objectFit: "contain" }} />
                </button>
              </td>

              <td>{transformer.no}</td>
              <td>{transformer.pole}</td>
              <td>{transformer.region}</td>
              <td>{transformer.type}</td>
              <td>
                <button type="button" className="btn btn-primary d-inline-flex align-items-center justify-content-center px-3" style={{ height: 25 }}>
                  View
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </Table>

  );
}


export default TransformerTable;