import React, { useState, useEffect, useCallback } from 'react';
import TopBar from '../components/TopBar';
import KPICards from '../components/KpiCards';
import TemperatureChart from '../components/TemperatureChart';
import TemperatureGauge from '../components/TemperatureGauge';
import CollapsiblePanel from '../components/CollapsiblePanel';
import { useWebSocket } from '../services/websocket';
import { api } from '../services/api';

export default function DashboardPage({ onToggleMobileMenu, onOpenSearch }) {
  const { lastMessage, isConnected, messageHistory } = useWebSocket();
  const [status, setStatus] = useState({
    esp32_status: 'ACTIVE',
    mqtt_status: 'CONNECTED',
    db_status: 'CONNECTED',
    mode: 'AUTO',
    cooling: false,
    system_state: 'NORMAL',
    temperature: 4.0,
    level: 80.0,
    lid: 'CLOSED',
  });
  const [kpis, setKpis] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [filterMinutes, setFilterMinutes] = useState(15);
  const [availableSpan, setAvailableSpan] = useState(null);
  const [selectedTank, setSelectedTank] = useState('tank1');

  const showFeedback = (msg) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  // Initial data fetch and polling
  useEffect(() => {
    const fetchData = () => {
      api.getStatus().then((s) => {
        if (s) {
          const lidVal = s.lid || s.lid_state;
          setStatus(prev => ({
            ...prev,
            ...s,
            temperature: s.temperature ?? prev.temperature,
            level: s.level ?? prev.level,
            lid: lidVal || prev.lid
          }));
          if (s.kpis) setKpis(s.kpis);
        }
      }).catch(() => {});

      api.getKpis().then((k) => {
        if (k && (k.readings_count > 0 || !kpis)) {
          setKpis(k);
        }
      }).catch(() => {});

      api.getAlerts('active').then(data => {
        if (Array.isArray(data)) setAlerts(data);
      }).catch(() => {});
    };

    fetchData();

    // Carga de historial por rango con submuestreo de cubetas y metadatos
    api.getTelemetryHistory(filterMinutes)
      .then(res => {
        if (res && Array.isArray(res.points) && res.points.length > 0) {
          setChartData(res.points);
          if (res.span_minutes != null) {
            setAvailableSpan(res.span_minutes);
          }
        } else {
          api.getHistory(filterMinutes).then(data => {
            if (Array.isArray(data) && data.length > 0) {
              setChartData(data.map(r => ({
                timestamp: r.timestamp,
                temperature: r.temperature,
              })));
            } else {
              const now = Date.now();
              const initialPoints = Array.from({ length: 8 }, (_, i) => ({
                timestamp: new Date(now - (8 - i) * 2000).toISOString(),
                temperature: 4.0 + (Math.random() * 0.1 - 0.05)
              }));
              setChartData(initialPoints);
            }
          }).catch(() => {});
        }
      })
      .catch(() => {
        api.getHistory(filterMinutes).then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setChartData(data.map(r => ({
              timestamp: r.timestamp,
              temperature: r.temperature,
            })));
          }
        }).catch(() => {});
      });

    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [filterMinutes]);

  // Process WebSocket messages for real-time updates
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'sensor_update') {
      const d = lastMessage.data;
      const newLid = d.lid || d.lid_state;
      
      // Update status
      setStatus(prev => ({
        ...prev,
        temperature: d.temperature ?? prev.temperature,
        level: d.level ?? prev.level,
        lid: newLid || prev.lid,
        cooling: d.cooling !== undefined ? d.cooling : prev.cooling,
        mode: d.mode || prev.mode,
        mqtt_status: (d.mqtt_status || 'CONNECTED').toUpperCase(),
        system_state: d.system_state || prev.system_state,
      }));

      if (d.kpis) {
        setKpis(d.kpis);
      }

      if (d.temperature != null) {
        setChartData(prev => {
          const next = [...prev, { timestamp: d.timestamp || lastMessage.timestamp || new Date().toISOString(), temperature: d.temperature }];
          return next.length > 500 ? next.slice(-500) : next;
        });
      }
    } else if (lastMessage.type === 'alert') {
      api.getAlerts('active').then(data => {
        if (Array.isArray(data)) setAlerts(data);
      }).catch(() => {});
    }
  }, [lastMessage]);

  // Control handlers
  const handleModeToggle = useCallback((newMode) => {
    api.setMode(newMode).then(() => {
      setStatus(s => ({ ...s, mode: newMode }));
      showFeedback(`Modo cambiado a ${newMode}`);
    }).catch(() => {});
  }, []);

  const handleCoolingToggle = useCallback((on) => {
    api.setRefrigeration(on ? 'ON' : 'OFF').then(() => {
      setStatus(s => ({ ...s, cooling: on }));
      showFeedback(`Refrigeración ${on ? 'ENCENDIDA' : 'APAGADA'}`);
    }).catch(() => {});
  }, []);

  // Scenario Triggers
  const handleRunScenario = (scenarioKey) => {
    switch (scenarioKey) {
      case 'normal':
        api.simReset().then(() => {
          showFeedback("Escenario 1: Operación Normal restablecida");
          setChartData([]);
        });
        break;
      case 'high_temp':
        api.simHighTemp().then(() => showFeedback("Escenario 2: Temperatura Alta inyectada (> 6.0 °C)"));
        break;
      case 'cooling':
        api.simSetTemp(3.6).then(() => {
          api.setRefrigeration('ON');
          showFeedback("Escenario 3: Ciclo de Enfriamiento (3.5 °C)");
        });
        break;
      case 'open_lid':
        api.simOpenLid().then(() => showFeedback("Escenario 4: Apertura de Tapa (Pérdida Térmica)"));
        break;
      case 'low_level':
        api.simLowLevel().then(() => showFeedback("Escenario 5: Nivel Crítico (< 20%)"));
        break;
      case 'mqtt_off':
        api.simMqttDisconnect().then(() => showFeedback("Escenario 6: Desconexión MQTT (Control Local)"));
        break;
      default:
        break;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      
      {/* 1. BARRA SUPERIOR DELGADA CON ESTADO GLOBAL, SELECTOR Y CONEXIÓN CONSOLIDADA */}
      <TopBar
        selectedTank={selectedTank}
        onSelectTank={setSelectedTank}
        isConnected={isConnected}
        status={status}
        alerts={alerts}
        onToggleMobileMenu={onToggleMobileMenu}
        onOpenSearch={onOpenSearch}
      />

      {/* 2. CANVAS CENTRAL CON SCROLL SUAVE Y PADDING INFERIOR SEGURO */}
      <main className="central-canvas" style={{ flex: 1, minHeight: 0, padding: '16px 20px 80px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto' }}>
        
        {/* Fila de 3 Métricas Clave (Temperatura, Nivel, Refrigeración + Integridad secundaria) */}
        <KPICards kpis={kpis} status={status} />

        {/* Curva Térmica Protagónica (~75%) y Termómetro Minimalista (~25%) en la misma fila */}
        <div className="chart-gauge-row">
          <div className="chart-col">
            <TemperatureChart 
              data={chartData}
              filterMinutes={filterMinutes}
              onFilterChange={setFilterMinutes}
              alerts={alerts}
              availableMinutes={availableSpan}
            />
          </div>
          <div className="gauge-col">
            <TemperatureGauge 
              temperature={status?.temperature}
            />
          </div>
        </div>

        {/* Secciones Secundarias Colapsadas en Pestañas (Tanque, Simulación, Telemetría, MQTT) */}
        <CollapsiblePanel
          status={status}
          alerts={alerts}
          mqttLog={messageHistory}
          onModeChange={handleModeToggle}
          onToggleCooling={handleCoolingToggle}
          onRunScenario={handleRunScenario}
          actionFeedback={actionFeedback}
          selectedTank={selectedTank}
          isConnected={isConnected}
        />

      </main>

    </div>
  );
}
