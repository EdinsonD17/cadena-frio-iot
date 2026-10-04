import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import DashboardPage from './pages/DashboardPage';
import MqttConsolePage from './pages/MqttConsolePage';
import HistoryPage from './pages/HistoryPage';
import AlertsPage from './pages/AlertsPage';
import KpisPage from './pages/KpisPage';
import SimulatorPage from './pages/SimulatorPage';
import KnowledgePage from './pages/KnowledgePage';
import { useWebSocket } from './services/websocket';
import { api } from './services/api';
import './App.css';

function App() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Atajo global de teclado Ctrl+K o Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { lastMessage } = useWebSocket();
  const [liveStatus, setLiveStatus] = useState({});
  const [liveKpis, setLiveKpis] = useState({});

  useEffect(() => {
    api.getStatus().then(setLiveStatus).catch(() => {});
    api.getKpis().then(setLiveKpis).catch(() => {});
    const interval = setInterval(() => {
      api.getStatus().then(setLiveStatus).catch(() => {});
      api.getKpis().then(setLiveKpis).catch(() => {});
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (lastMessage?.type === 'sensor_update') {
      setLiveStatus(prev => ({ ...prev, ...lastMessage.data }));
      if (lastMessage.data?.kpis) setLiveKpis(lastMessage.data.kpis);
    }
  }, [lastMessage]);

  return (
    <div className="app-container">
      {/* COLUMNA 1: SIDEBAR / RIEL DE NAVEGACIÓN (64px estrecho, expansible a 240px) */}
      <Sidebar
        onOpenSearch={() => setIsCommandPaletteOpen(true)}
        isMobileOpen={isMobileOpen}
        onCloseMobile={() => setIsMobileOpen(false)}
      />

      {/* RUTAS Y CONTENIDO PRINCIPAL */}
      <main style={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        <Routes>
          <Route
            path="/"
            element={
              <DashboardPage
                onToggleMobileMenu={() => setIsMobileOpen(prev => !prev)}
                onOpenSearch={() => setIsCommandPaletteOpen(true)}
              />
            }
          />
          <Route path="/mqtt"      element={<MqttConsolePage />} />
          <Route path="/history"   element={<HistoryPage />} />
          <Route path="/alerts"    element={<AlertsPage />} />
          <Route path="/kpis"      element={<KpisPage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/knowledge" element={<KnowledgePage />} />
        </Routes>
      </main>

      {/* PALETA DE COMANDOS Y BÚSQUEDA RÁPIDA (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        status={liveStatus}
        kpis={liveKpis}
      />
    </div>
  );
}

export default App;
