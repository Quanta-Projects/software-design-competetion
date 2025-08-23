// src/layouts/AppLayout.jsx
import { Outlet } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import Sidebar from '../components/Sidebar';

export default function AppLayout() {
  return (
    <Container fluid>
      <Row>
        <Col md={2} className="bg-white vh-100 p-3 text-dark">
          <Sidebar />
        </Col>
        <Col md={10} style={{ backgroundColor: '#F5F5F5' }} className="p-4">
          <Outlet />
        </Col>
      </Row>
    </Container>
  );
}
