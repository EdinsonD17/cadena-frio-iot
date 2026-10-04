import React from 'react';

export default function KPICards({ kpis, status = {} }) {
  const safeStatus = status || {};
  const safeKpis = kpis || {};
  const temp = Number(safeStatus.temperature ?? safeKpis.avg_temp ?? 4.0);
  const level = Number(safeStatus.level ?? 80.0);
  const safeLevel = Math.max(0, Math.min(100, level));
  const liters = Math.round((safeLevel / 100) * 1000);
  const cooling = Boolean(safeStatus.cooling ?? (safeKpis.cooling_time && safeKpis.cooling_time > 0));
  const mode = safeStatus.mode || 'AUTO';

  // Métricas reales del backend (o '--' si no hay dato disponible)
  const integrityText = safeKpis.valid_readings_pct != null
    ? `${Number(safeKpis.valid_readings_pct).toFixed(1)}%`
    : '--';

  const outOfRangeText = safeKpis.out_of_range_seconds != null
    ? (safeKpis.out_of_range_seconds > 0 ? `${safeKpis.out_of_range_seconds}s fuera de rango` : 'Estable (0s fuera)')
    : '--';

  let powerText = '--';
  if (safeStatus.cooling === true) {
    // Escalado orientativo de la potencia nominal (~225 W est. acorde al modelo acelerado)
    powerText = '~225 W est.';
  } else if (safeStatus.cooling === false) {
    powerText = '0 W est. (Standby)';
  }

  // Estado de temperatura respecto al rango (3.5 - 4.0 objetivo, 6.0 advertencia)
  let tempStateColor = 'var(--color-cyan-primary)';
  let tempStateBadge = 'En rango seguro';
  let tempBadgeClass = 'badge-cyan';
  if (temp > 6.0) {
    tempStateColor = 'var(--color-red)';
    tempStateBadge = 'Fuera de rango (> 6.0 °C)';
    tempBadgeClass = 'badge-critical';
  } else if (temp > 4.0) {
    tempStateColor = 'var(--color-amber)';
    tempStateBadge = 'Sobre objetivo (> 4.0 °C)';
    tempBadgeClass = 'badge-warning';
  } else if (temp < 3.5) {
    tempStateColor = 'var(--color-cyan-primary)';
    tempStateBadge = 'Bajo objetivo (< 3.5 °C)';
    tempBadgeClass = 'badge-cyan';
  }

  return (
    <section className="metric-row" aria-label="Métricas principales de la cadena de frío">
      
      {/* 1. TEMPERATURA ACTUAL (DS18B20) */}
      <div className="metric-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className="metric-label" style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>
            Temperatura Actual
          </span>
          <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>DS18B20</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span className="metric-value-large mono tabular-nums" style={{ color: tempStateColor }}>
            {temp.toFixed(1)}
          </span>
          <span style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)', fontWeight: 300 }}>
            °C
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
          <span>Objetivo: <strong style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>3.5 – 4.0 °C</strong></span>
          <span>Integridad: <strong style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{integrityText}</strong></span>
        </div>
      </div>

      {/* 2. NIVEL DEL TANQUE (HC-SR04) */}
      <div className="metric-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className="metric-label" style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>
            Nivel del Tanque
          </span>
          <span className="badge-cyan mono tabular-nums">{liters} L</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
          <span className="metric-value-large mono tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
            {safeLevel.toFixed(1)}
          </span>
          <span style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)', fontWeight: 300 }}>
            %
          </span>
        </div>

        {/* Barra de progreso fina */}
        <div className="kpi-progress" style={{ height: '3px', marginTop: '10px' }} aria-hidden="true">
          <div className="kpi-progress-bar" style={{ width: `${safeLevel}%`, backgroundColor: 'var(--color-cyan-primary)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
          <span>Capacidad total: 1000 L</span>
          <span>Sensor ultrasónico</span>
        </div>
      </div>

      {/* 3. ESTADO DE REFRIGERACIÓN (Peltier/Relé) */}
      <div className="metric-box">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span className="metric-label" style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>
            Refrigeración (Peltier)
          </span>
          <span className={cooling ? 'badge-electric' : 'badge-white'}>
            {mode === 'AUTO' ? 'Automático' : 'Manual'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minHeight: '44px' }}>
          <span className="mono" style={{ fontSize: '2rem', fontWeight: 500, color: cooling ? 'var(--color-cyan-primary)' : 'var(--color-text-secondary)', lineHeight: 1.1 }}>
            {cooling ? 'ACTIVO' : 'STANDBY'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
          <span>Consumo est.: <strong style={{ color: 'var(--color-text-secondary)', fontWeight: 500 }}>{powerText}</strong></span>
          <span>{outOfRangeText}</span>
        </div>
      </div>

    </section>
  );
}

export { KPICards, KPICards as KpiCards };
