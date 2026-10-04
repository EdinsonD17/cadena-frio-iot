import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sliders, Database, Layers, Radio } from 'lucide-react';
import TankView from './TankView';
import SimulationControls from './SimulationControls';
import TelemetryTable from './TelemetryTable';

export default function CollapsiblePanel({
  status = {},
  alerts = [],
  mqttLog = [],
  onModeChange,
  onToggleCooling,
  onRunScenario,
  actionFeedback = null,
  selectedTank = 'tank1',
  isConnected = true,
}) {
  const safeStatus = status || {};
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('tank');
  const [expandedMqttIndex, setExpandedMqttIndex] = useState(null);

  const tabs = [
    { id: 'tank',       label: 'Tanque y Tapa',          Icon: Layers },
    { id: 'simulation', label: 'Simulación y Control',   Icon: Sliders },
    { id: 'history',    label: 'Historial de Eventos',   Icon: Database },
    { id: 'mqtt',       label: 'Feed MQTT y Hardware',   Icon: Radio },
  ];

  const handleTabClick = (tabId) => {
    if (activeTab === tabId && isOpen) {
      setIsOpen(false);
    } else {
      setActiveTab(tabId);
      setIsOpen(true);
    }
  };

  const recentMqtt = (mqttLog || []).slice(-6).reverse();

  return (
    <div 
      className="card" 
      style={{ 
        padding: '0', 
        overflow: 'visible', 
        marginTop: '8px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)'
      }}
      role="region"
      aria-label="Panel de herramientas y control secundario"
    >
      {/* Barra de cabecera con Pestañas y Botón de Colapso */}
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '6px 12px',
          borderBottom: isOpen ? '1px solid var(--border-subtle)' : 'none',
          backgroundColor: 'var(--color-surface-raised)'
        }}
      >
        {/* Pestañas */}
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto' }}>
          {tabs.map(({ id, label, Icon }) => {
            const isTabActive = isOpen && activeTab === id;
            return (
              <button
                key={id}
                onClick={() => handleTabClick(id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isTabActive ? 'var(--color-surface)' : 'transparent',
                  color: isTabActive ? 'var(--color-cyan-primary)' : 'var(--color-text-secondary)',
                  border: isTabActive ? '1px solid var(--border-default)' : '1px solid transparent',
                  fontSize: '0.75rem',
                  fontWeight: isTabActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                aria-selected={isTabActive}
                role="tab"
              >
                <Icon size={14} strokeWidth={1.5} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>

        {/* Botón de alternancia de estado colapsado */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '5px 10px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'transparent',
            color: 'var(--color-text-secondary)',
            fontSize: '0.6875rem',
            fontWeight: 500,
            cursor: 'pointer',
            border: 'none',
          }}
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Ocultar panel secundario' : 'Expandir panel secundario'}
        >
          <span>{isOpen ? 'Ocultar herramientas' : 'Ver herramientas y simulación'}</span>
          {isOpen ? <ChevronUp size={14} strokeWidth={1.5} /> : <ChevronDown size={14} strokeWidth={1.5} />}
        </button>
      </div>

      {/* Contenido desplegable */}
      {isOpen && (
        <div style={{ padding: '16px' }}>
          {/* TAB 1: Tanque y Tapa */}
          {activeTab === 'tank' && (
            <div style={{ maxWidth: '860px', margin: '0 auto' }}>
              <TankView 
                level={safeStatus.level} 
                lid={safeStatus.lid}
                temperature={safeStatus.temperature ?? 4.0}
                cooling={safeStatus.cooling}
                capacity={selectedTank === 'tank2' ? 500 : 1000}
                isConnected={isConnected}
              />
            </div>
          )}

          {/* TAB 2: Simulación y Control */}
          {activeTab === 'simulation' && (
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
              <SimulationControls 
                mode={safeStatus.mode}
                cooling={safeStatus.cooling}
                onModeChange={onModeChange}
                onToggleCooling={onToggleCooling}
                onRunScenario={onRunScenario}
                feedback={actionFeedback}
              />
            </div>
          )}

          {/* TAB 3: Historial de Telemetría */}
          {activeTab === 'history' && (
            <div style={{ width: '100%' }}>
              <TelemetryTable alerts={alerts} />
            </div>
          )}

          {/* TAB 4: Feed MQTT y Hardware */}
          {activeTab === 'mqtt' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr)', gap: '14px' }}>
              {/* Feed MQTT */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    Paquetes MQTT en Tiempo Real
                  </span>
                  <span className="badge-cyan mono" style={{ fontSize: '0.6875rem' }}>Puerto 1883</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
                  {recentMqtt.map((m, i) => {
                    const timeStr = m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString();
                    const isExpanded = expandedMqttIndex === i;
                    let displayVal = m.message || m.payload || '';
                    if (typeof displayVal === 'object') {
                      displayVal = displayVal.temperature != null ? `Lectura: ${Number(displayVal.temperature).toFixed(1)} °C` : JSON.stringify(displayVal);
                    }

                    return (
                      <div 
                        key={i}
                        style={{
                          backgroundColor: 'var(--color-surface-raised)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '6px 8px',
                          fontSize: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span className="mono" style={{ color: 'var(--color-text-muted)', fontSize: '0.6875rem' }}>
                            {timeStr}
                          </span>
                          <button
                            className="btn-outline-blue"
                            style={{ padding: '2px 5px', fontSize: '0.625rem', borderRadius: '4px' }}
                            onClick={() => setExpandedMqttIndex(isExpanded ? null : i)}
                            aria-label="Ver carga útil JSON"
                          >
                            {isExpanded ? 'Ocultar' : 'JSON'}
                          </button>
                        </div>

                        <div className="mono" style={{ color: 'var(--color-text-primary)', marginTop: 2, fontWeight: 500 }}>
                          {displayVal}
                        </div>

                        {isExpanded && (
                          <pre 
                            className="mono" 
                            style={{ 
                              margin: '6px 0 0', 
                              padding: '6px', 
                              backgroundColor: 'var(--color-bg-app)', 
                              borderRadius: 'var(--radius-sm)', 
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--color-cyan-primary)', 
                              fontSize: '0.6875rem',
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-all'
                            }}
                          >
                            {typeof m.message === 'object' ? JSON.stringify(m.message, null, 2) : String(m.message || m.payload)}
                          </pre>
                        )}
                      </div>
                    );
                  })}

                  {recentMqtt.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px 0' }}>
                      Esperando paquetes del broker...
                    </div>
                  )}
                </div>
              </div>

              {/* Estado de Dispositivos */}
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-primary)', display: 'block', marginBottom: '8px' }}>
                  Dispositivos de Campo
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { name: 'ESP32 Virtual (Microcontrolador)', status: 'En línea' },
                    { name: 'Sensor DS18B20 (Temperatura)', status: 'En línea' },
                    { name: 'Sensor HC-SR04 (Nivel Tanque)', status: 'En línea' },
                    { name: 'Relé Peltier (Refrigeración)', status: status.cooling ? 'Activo (Enfriando)' : 'En espera nominal' },
                  ].map((dev) => (
                    <div 
                      key={dev.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 10px',
                        backgroundColor: 'var(--color-surface-raised)',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-subtle)',
                        fontSize: '0.75rem'
                      }}
                    >
                      <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                        {dev.name}
                      </span>
                      <span className="badge-cyan">
                        <span className="status-dot normal" style={{ width: 5, height: 5 }} aria-hidden="true" />
                        {dev.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
