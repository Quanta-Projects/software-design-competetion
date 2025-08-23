// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import TransformersPage from './pages/TransformersPage';
import SettingsPage from "./pages/settingsPage";
import UploadPage from './pages/uploadPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/transformers" replace />} />
          <Route path="/transformers" element={<TransformersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/upload" element={<UploadPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
