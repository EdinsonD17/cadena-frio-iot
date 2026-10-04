import React, { useState } from 'react';

export default function SimulationControls({ 
  mode = 'AUTO', 
  onModeChange, 
  onRunScenario, 
  onToggleCooling,
  cooling = false,
  feedback = null 
}) {
  const [selectedScenario, setSelectedScenario] = useState('normal');

  const handleExecute = () => {
    onRunScenario?.(selectedScenario);
  };

  const isManual = mode === 'MANUAL';

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="card-header-gradient" style={{ marginBottom: 4 }}>
        <h3 className="card-title">
          Inyector de Simulación y Control
        </h3>
        {feedback && (
          <span className="badge-cyan mono" style={{ fontSize: '0.72rem' }}>
            {feedback}
          </span>
        )}
      </div>

      {/* Selector para Modo: Automático (ESP32) | Manual */}
      <div>
        <label style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', display: 'block', marginBottom: 5 }}>
          Modo de Control del Sistema
        </label>
        <div className="segmented-control">
          <button
            className={!isManual ? 'active' : ''}
            onClick={() => onModeChange?.('AUTO')}
            aria-pressed={!isManual}
          >
            Automático (ESP32)
          </button>
          <button
            className={isManual ? 'active' : ''}
            onClick={() => onModeChange?.('MANUAL')}
            aria-pressed={isManual}
          >
            Manual
          </button>
        </div>
      </div>

      {/* Menú desplegable estilizado en azul oscuro + Botón degradado azul */}
      <div>
        <label style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--blue-cyan-soft)', textTransform: 'uppercase', letterSpacing: '0.6px', display: 'block', marginBottom: 5 }}>
          Selección de Escenario
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            className="scenario-select"
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value)}
            aria-label="Seleccionar escenario de simulación"
          >
            <option value="normal">Escenario 1: Operación Normal (4.0°C)</option>
            <option value="high_temp">Escenario 2: Temperatura Alta (&gt;6.0°C)</option>
            <option value="cooling">Escenario 3: Ciclo de Enfriamiento (3.5°C)</option>
            <option value="open_lid">Escenario 4: Apertura de Tapa (Pérdida Térmica)</option>
            <option value="low_level">Escenario 5: Nivel Crítico (&lt;20%)</option>
            <option value="mqtt_off">Escenario 6: Desconexión MQTT</option>
          </select>
          <button
            className="btn-gradient"
            onClick={handleExecute}
            style={{ minWidth: '170px', fontWeight: 700 }}
          >
            Ejecutar Escenario
          </button>
        </div>
      </div>

      {/* Controles manuales de refrigeración si está en modo manual */}
      {isManual && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          background: 'rgba(7, 18, 36, 0.7)',
          padding: '8px 10px',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)',
          marginTop: '2px'
        }}>
          <button
            onClick={() => onToggleCooling?.(true)}
            className="btn-gradient"
            style={{ padding: '7px' }}
          >
            Encender Refrigeración
          </button>
          <button
            onClick={() => onToggleCooling?.(false)}
            className="btn-outline-blue"
            style={{ padding: '7px' }}
          >
            Apagar Refrigeración
          </button>
        </div>
      )}
    </div>
  );
}
