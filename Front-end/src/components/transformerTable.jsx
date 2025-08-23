// src/components/transformerTable.jsx
import { Table } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

// import "bootstrap-icons/font/bootstrap-icons.css"; // if you use <i className="bi ..."/>

export default function TransformerTable({ transformers = [], favs, onToggleFav }) {

  const navigate = useNavigate();

  // send the transformer id to /upload
  const handleViewClick = (transformerId) => {
    navigate("/upload", { state: { transformerId } });
  };

  return (
    <Table striped bordered hover className="align-middle">
      <thead>
        <tr>
          <th style={{ width: 52 }} aria-label="Favourite" className="text-center" />
          <th>Transformer No.</th>
          <th>Pole NO.</th>
          <th>Region</th>
          <th>Type</th>
          <th>Action</th>
        </tr>
      </thead>

      <tbody>
        {transformers.map((t) => {
          const isFav = favs?.has(t.no);
          return (
            <tr key={t.id ?? t.no}>
              <td className="text-center align-middle">
                <button
                  type="button"
                  onClick={() => onToggleFav?.(t.no)}
                  aria-pressed={!!isFav}
                  aria-label={isFav ? "Unmark favourite" : "Mark as favourite"}
                  className={`btn ${isFav ? "btn-warning" : "btn-light"} d-inline-flex align-items-center justify-content-center p-0 shadow-sm`}
                  style={{ width: 25, height: 25, borderRadius: 8 }}
                >
                  <img src="/img/star.png" alt="favorites" width={20} height={20} style={{ display: "block", objectFit: "contain" }} />
                </button>
              </td>

              <td>{t.no}</td>
              <td>{t.pole}</td>
              <td>{t.region}</td>
              <td>{t.type}</td>
              <td>
                <button 
                  type="button" 
                  className="btn btn-primary d-inline-flex align-items-center justify-content-center px-3" 
                  style={{ height: 25 }}
                  onClick={() => handleViewClick(t.id)}
                >
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
