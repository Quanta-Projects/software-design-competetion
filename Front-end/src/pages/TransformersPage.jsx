// src/pages/TransformersPage.jsx
import '../App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container} from 'react-bootstrap';

import Toolbar from "../components/toolbar";
import CardTop from '../components/cardTop';
import TransformerTable from '../components/transformerTable';

const transformers = [
  { id: "TX-1001", no: "Transformer 1001", pole: "Online",      region: "Colombo – Substation A", type:"Bulk" },
  { id: "TX-1002", no: "Transformer 1002", pole: "Maintenance",  region: "Kandy – Substation 2", type:"Distribution" },
  { id: "TX-1003", no: "Transformer 1003", pole: "Offline",      region: "Galle – Harbor Yard", type:"Distribution" },
  { id: "TX-1004", no: "Transformer 1004", pole: "Fault",        region: "Jaffna – North Grid", type:"Bulk" },
  { id: "TX-1005", no: "Transformer 1005", pole: "Online",       region: "Negombo – Airport Link", type:"Distribution" },
  { id: "TX-1006", no: "Transformer 1006", pole: "Standby",      region: "Matara – Coastal Line", type:"Bulk" },
  { id: "TX-1007", no: "Transformer 1007", pole: "Maintenance",  region: "Anuradhapura – Historic Zone", type:"Distribution" },
  { id: "TX-1008", no: "Transformer 1008", pole: "Online",       region: "Batticaloa – East Substation", type:"Bulk" }
];

export default function TransformersPage() {
  return (
    <Container fluid>

      {/* Main content */}
        <h2>☰ Transformers</h2>
        <div className="card">
          <div className="card-body">
            <CardTop />
            <div className="mt-3">
              <Toolbar />
            </div>
            <div className="mt-3">
              <TransformerTable transformers={transformers} />
            </div>
          </div>
        </div>

    </Container>
  );
}
