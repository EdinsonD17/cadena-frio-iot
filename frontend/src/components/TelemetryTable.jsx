import React from 'react';

export default function TelemetryTable({ alerts = [], recentData = [] }) {
  const hasAlerts = alerts && alerts.length > 0;

  return (
    <div className="card" style={{ overflowX: 'auto', flex: 1 }}>
      <div className="card-header-gradient">
        <h3 className="card-title">
          Historial Reciente de Telemetría
        </h3>
        <span className="badge-cyan">
          {hasAlerts ? `${alerts.length} Eventos` : "Sistema Nominal"}
        </span>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Tipo / Parámetro</th>
            <th>Descripción</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {hasAlerts ? (
            alerts.slice(0, 6).map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="mono" style={{ color: 'var(--color-text-secondary)' }}>
                  {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : 'En vivo'}
                </td>
                <td style={{ fontWeight: 600, color: '#FFFFFF' }}>
                  {item.type || item.alert_type || 'INCIDENCIA'}
                </td>
                <td style={{ color: 'var(--color-text-secondary)' }}>
                  {item.message || item.description || 'Lectura fuera de rango'}
                </td>
                <td>
                  <span className="badge-electric">
                    {item.severity || 'ACTIVO'}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                Todas las variables operando dentro de los rangos seguros (3.5 °C a 4.0 °C).
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
