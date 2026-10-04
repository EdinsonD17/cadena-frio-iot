import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function AlertsPage() {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [allAlerts, setAllAlerts] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const fetch = () => {
      api.getAlerts('active').then(res => { if (Array.isArray(res)) setActiveAlerts(res); }).catch(() => {});
      api.getAlerts('all').then(res => { if (Array.isArray(res)) setAllAlerts(res); }).catch(() => {});
    };
    fetch();
    const iv = setInterval(fetch, 5000);
    return () => clearInterval(iv);
  }, []);

  const severityBadge = (severity) => {
    const sev = String(severity || 'warning').toLowerCase();
    if (sev === 'critical') {
      return (
        <span className="badge-critical">
          CRÍTICA
        </span>
      );
    }
    return (
      <span className="badge-warning">
        ADVERTENCIA
      </span>
    );
  };

  const statusBadge = (status) => (
    <span className={status === 'active' || !status ? 'badge-warning' : 'badge-cyan'}>
      {status === 'active' || !status ? 'ACTIVA' : 'RECONOCIDA'}
    </span>
  );

  const displayed = filter === 'active' ? activeAlerts : allAlerts;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', padding: '16px 20px', overflowY: 'auto' }}>
      {/* Cabecera */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Gestión de Alertas y Notificaciones
        </h1>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Detección e historial completo de incidencias térmicas en la cadena de frío
        </div>
      </div>

      {/* Tarjeta de Resumen de Alertas Activas */}
      <div 
        className="card" 
        style={{
          borderLeft: `4px solid ${activeAlerts.length > 0 ? 'var(--color-red)' : 'var(--color-cyan-primary)'}`,
          padding: '14px 16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: activeAlerts.length > 0 ? '12px' : 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {activeAlerts.length > 0 ? (
              <AlertTriangle size={18} strokeWidth={1.5} color="var(--color-red)" />
            ) : (
              <CheckCircle size={18} strokeWidth={1.5} color="var(--color-cyan-primary)" />
            )}
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Alertas Activas en el Sistema: {activeAlerts.length}
            </h3>
          </div>
          {activeAlerts.length > 0 && (
            <span className="badge-critical">Atención Requerida</span>
          )}
        </div>

        {activeAlerts.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
            No hay alertas activas. Los parámetros térmicos, de nivel y estado de tapa operan dentro de los rangos especificados.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {activeAlerts.slice(0, 5).map((a, i) => (
              <div 
                key={a.id || i} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '10px', 
                  backgroundColor: 'var(--color-surface-raised)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.8125rem'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {severityBadge(a.severity)}
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{a.message || a.description}</span>
                </div>
                <span className="mono tabular-nums" style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', flexShrink: 0 }}>
                  {a.timestamp ? new Date(a.timestamp).toLocaleTimeString() : 'En vivo'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Botones de Filtro */}
      <div style={{ display: 'flex', gap: '6px' }}>
        <button 
          onClick={() => setFilter('all')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            fontWeight: filter === 'all' ? 600 : 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
            backgroundColor: filter === 'all' ? 'var(--color-cyan-dim)' : 'transparent',
            border: `1px solid ${filter === 'all' ? 'var(--color-cyan-border)' : 'var(--border-default)'}`,
            color: filter === 'all' ? 'var(--color-cyan-primary)' : 'var(--color-text-secondary)',
            transition: 'all var(--transition-fast)',
          }}
        >
          Todas las alertas ({allAlerts.length})
        </button>
        <button 
          onClick={() => setFilter('active')}
          style={{
            padding: '6px 14px',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.75rem',
            fontWeight: filter === 'active' ? 600 : 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
            backgroundColor: filter === 'active' ? 'var(--color-cyan-dim)' : 'transparent',
            border: `1px solid ${filter === 'active' ? 'var(--color-cyan-border)' : 'var(--border-default)'}`,
            color: filter === 'active' ? 'var(--color-cyan-primary)' : 'var(--color-text-secondary)',
            transition: 'all var(--transition-fast)',
          }}
        >
          Alertas Activas ({activeAlerts.length})
        </button>
      </div>

      {/* Tabla Completa de Alertas */}
      <div className="card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Registro Histórico de Alertas
          </h3>
          <span className="badge-cyan mono tabular-nums">{displayed.length} registros</span>
        </div>

        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8125rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-default)' }}>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>Fecha</th>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>Hora</th>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>Tipo de Evento</th>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>Descripción</th>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>Severidad</th>
                <th style={{ padding: '8px 12px', fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)', fontWeight: 600 }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((a, i) => {
                const dt = new Date(a.timestamp);
                return (
                  <tr key={a.id || i} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color var(--transition-fast)' }}>
                    <td className="mono tabular-nums" style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                      {dt.toLocaleDateString()}
                    </td>
                    <td className="mono tabular-nums" style={{ padding: '8px 12px', color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>
                      {dt.toLocaleTimeString()}
                    </td>
                    <td style={{ padding: '8px 12px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {a.type || a.alert_type}
                    </td>
                    <td style={{ padding: '8px 12px', color: 'var(--color-text-secondary)' }}>
                      {a.message || a.description}
                    </td>
                    <td style={{ padding: '8px 12px' }}>{severityBadge(a.severity)}</td>
                    <td style={{ padding: '8px 12px' }}>{statusBadge(a.status)}</td>
                  </tr>
                );
              })}
              {displayed.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                    No hay alertas registradas en la categoría seleccionada.
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
