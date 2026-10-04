import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import TemperatureChart from '../components/TemperatureChart';

const FILTERS = [
  { label: 'Último minuto', value: 1 },
  { label: 'Últimos 5 min', value: 5 },
  { label: 'Últimos 15 min', value: 15 },
  { label: 'Toda la sesión', value: null },
];

export default function HistoryPage() {
  const [minutes, setMinutes] = useState(5);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = () => {
      api.getHistory(minutes).then(res => {
        if (Array.isArray(res)) setData(res);
      }).catch(() => {});
    };
    fetchData();
    const iv = setInterval(fetchData, 5000);
    return () => clearInterval(iv);
  }, [minutes]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', padding: '16px 20px', overflowY: 'auto' }}>
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Historial de Datos
          </h1>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Registro cronológico de telemetría IoT de la cadena de frío
          </span>
        </div>
      </div>

      {/* Barra de Filtro Temporal */}
      <div className="card" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', padding: '10px 14px' }}>
        <span style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', marginRight: '4px' }}>
          Ventana de Tiempo:
        </span>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {FILTERS.map(f => (
            <button
              key={f.label}
              onClick={() => setMinutes(f.value)}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: minutes === f.value ? 600 : 500,
                fontFamily: 'inherit',
                cursor: 'pointer',
                backgroundColor: minutes === f.value ? 'var(--color-cyan-dim)' : 'transparent',
                border: `1px solid ${minutes === f.value ? 'var(--color-cyan-border)' : 'var(--border-default)'}`,
                color: minutes === f.value ? 'var(--color-cyan-primary)' : 'var(--color-text-secondary)',
                transition: 'all var(--transition-fast)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="mono tabular-nums" style={{ color: 'var(--color-text-muted)', marginLeft: 'auto', fontSize: '0.75rem' }}>
          {data.length} registros cargados
        </span>
      </div>

      {/* Curva Térmica Protagónica */}
      <TemperatureChart 
        data={data} 
        filterMinutes={minutes}
        onFilterChange={setMinutes}
      />

      {/* Tabla de Registros */}
      <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Registros de Telemetría IoT
          </h3>
          <span className="badge-cyan mono tabular-nums">
            {data.length} filas
          </span>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>Fecha/Hora</th>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>Temp (°C)</th>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>Nivel (%)</th>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>Tapa</th>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>Peltier</th>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>Modo</th>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>MQTT</th>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>Válida</th>
              </tr>
            </thead>
            <tbody>
              {data.slice(-200).reverse().map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color var(--transition-fast)' }}>
                  <td className="mono tabular-nums" style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                    {new Date(row.timestamp).toLocaleString()}
                  </td>
                  <td className="mono tabular-nums" style={{
                    padding: '8px 12px',
                    fontWeight: 600,
                    color: row.temperature >= 6.0 ? 'var(--color-red)' : row.temperature > 4.0 ? 'var(--color-amber)' : 'var(--color-cyan-primary)',
                  }}>
                    {row.temperature != null ? `${row.temperature.toFixed(1)} °C` : '--'}
                  </td>
                  <td className="mono tabular-nums" style={{ padding: '8px 12px', color: 'var(--color-text-primary)' }}>
                    {row.level != null ? `${row.level.toFixed(1)} %` : '--'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className={row.lid_state === 'OPEN' ? 'badge-warning' : 'badge-cyan'}>
                      {row.lid_state === 'OPEN' ? 'Abierta' : 'Cerrada'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className={row.cooling ? 'badge-cyan' : 'badge-white'}>
                      {row.cooling ? 'ACTIVO' : 'STANDBY'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className="badge-white">
                      {row.mode || '--'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span className={row.mqtt_status === 'CONNECTED' ? 'badge-cyan' : 'badge-warning'}>
                      {row.mqtt_status || 'ONLINE'}
                    </span>
                  </td>
                  <td className="mono tabular-nums" style={{ padding: '8px 12px', color: row.valid ? 'var(--color-cyan-primary)' : 'var(--color-red)' }}>
                    {row.valid ? 'SÍ' : 'NO'}
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No hay datos históricos registrados. Inicia el simulador para generar telemetría continua.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
