import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GroupProvider } from './context/GroupContext';
import { GroupDashboard } from './components/GroupDashboard';
import { GroupPage } from './components/GroupPage';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GroupProvider>
      <Router>
        <Routes>
          {/* Dashboard - List all groups */}
          <Route path="/" element={<GroupDashboard />} />

          {/* Group Workspace - Single group with RAG chat */}
          <Route path="/group/:groupId" element={<GroupPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </GroupProvider>
  </React.StrictMode>,
);
