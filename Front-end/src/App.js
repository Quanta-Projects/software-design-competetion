// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import TransformersPage from './pages/TransformersPage';
import InspectionsPage from './pages/InspectionsPage';
import SettingsPage from "./pages/settingsPage";
import UploadPage from './pages/uploadPage';
import PreviewPage from './pages/previewPage';
import ImageViewer from './pages/ImageViewer';
import './styles/annotations.css';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/transformers" replace />} />
          <Route path="/transformers" element={<TransformersPage />} />
          <Route path="/inspections" element={<InspectionsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/preview" element={<PreviewPage />} />
          <Route path="/image-viewer/:imageId" element={<ImageViewer />} />
        </Route>
      </Routes>
    </Router>
  );
}
