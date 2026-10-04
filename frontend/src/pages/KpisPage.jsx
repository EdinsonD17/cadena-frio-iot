import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import KPICards from '../components/KpiCards';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useWebSocket } from '../services/websocket';

export default function KpisPage() {
  const { lastMessage } = useWebSocket();
  const [kpis, setKpis] = useState(null);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    const fetchStats = () => {
      api.getKpis().then(setKpis).catch(() => {});
      api.getAlerts('all').then(data => {
        if (Array.isArray(data)) setAlerts(data);
      }).catch(() => {});
    };
    fetchStats();
    const iv = setInterval(fetchStats, 3000);
    return () => clearInterval(iv);
  }, []);

  // Actualización en vivo desde WebSocket - preservado 100%
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'sensor_update' && lastMessage.data?.kpis) {
      setKpis(lastMessage.data.kpis);
    }
  }, [lastMessage]);

  // Desglose de alertas por tipo
  const alertsByType = alerts.reduce((acc, a) => {
    const t = a.type || a.alert_type || 'OTRO';
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  
  const alertChartData = Object.entries(alertsByType).map(([name, value]) => ({ name, value }));
  const PIE_COLORS = ['#38BDF8', '#F59E0B', '#EF4444', '#0EA5E9', '#64748B'];

  // Datos para gráfico de barras de temperatura
  const kpiBarData = [
    { name: 'Temp. Promedio', value: kpis?.avg_temp ?? 4.0, fill: '#38BDF8' },
    { name: 'Temp. Máxima', value: kpis?.max_temp ?? 4.2, fill: '#EF4444' },
    { name: 'Temp. Mínima', value: kpis?.min_temp ?? 3.8, fill: '#0EA5E9' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', padding: '16px 20px', overflowY: 'auto' }}>
      {/* Cabecera */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Indicadores Clave de Rendimiento (KPIs)
        </h1>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Métricas normativas de estabilidad térmica, disponibilidad e integridad de la cadena
        </div>
      </div>

      {/* Fila de Métricas Principales */}
      <KPICards kpis={kpis} />

      {/* Gráficos de Estadísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        
        {/* Estadísticas de Temperatura */}
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Estadísticas de Temperatura
            </h3>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Valores calculados</span>
          </div>
          <div style={{ height: 210, width: '100%', minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%" debounce={50}>
              <BarChart data={kpiBarData} margin={{ top: 10, right: 20, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.04)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--color-text-muted)" fontSize={11} domain={[0, 10]} axisLine={false} tickLine={false} tickFormatter={v => `${v}°`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0B1324', borderColor: 'var(--border-default)', color: 'var(--color-text-primary)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem' }}
                  formatter={(v) => [`${v}°C`, 'Temperatura']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                  {kpiBarData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribución de Eventos e Incidencias */}
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Distribución de Incidencias
            </h3>
            <span className="badge-cyan mono tabular-nums">{alerts.length} eventos</span>
          </div>
          <div style={{ height: 210, width: '100%', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {alertChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <PieChart>
                  <Pie 
                    data={alertChartData} 
                    dataKey="value" 
                    nameKey="name" 
                    cx="50%" 
                    cy="50%"
                    outerRadius={75} 
                    innerRadius={42}
                    paddingAngle={3}
                    isAnimationActive={false}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {alertChartData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0B1324', borderColor: 'var(--border-default)', color: 'var(--color-text-primary)', borderRadius: 'var(--radius-md)', fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
                Sin eventos anómalos registrados en la sesión
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen Operativo de Eficiencia */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Resumen Operativo del Sistema
          </h3>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Telemetría consolidada</span>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px',
        }}>
          <div style={{ padding: '12px', backgroundColor: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-label)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>
              Total Lecturas
            </div>
            <div className="mono tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>
              {kpis?.readings_count ?? '--'}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>Frecuencia de muestreo: 2.0s</div>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-label)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>
              Integridad de Datos
            </div>
            <div className="mono tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-cyan-primary)', marginTop: '4px' }}>
              {kpis?.valid_readings_pct != null ? `${Number(kpis.valid_readings_pct).toFixed(1)}%` : '--'}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>Muestras válidas</div>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-label)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>
              Disponibilidad MQTT
            </div>
            <div className="mono tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '4px' }}>
              {kpis?.mqtt_availability_pct != null ? `${Number(kpis.mqtt_availability_pct).toFixed(1)}%` : '--'}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>Broker puerto 1883</div>
          </div>

          <div style={{ padding: '12px', backgroundColor: 'var(--color-surface-raised)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-label)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>
              Tiempo Refrigeración
            </div>
            <div className="mono tabular-nums" style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--color-cyan-primary)', marginTop: '4px' }}>
              {kpis?.cooling_time != null ? `${kpis.cooling_time}s` : '--'}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-dim)', marginTop: '2px' }}>Ciclos activos Peltier</div>
          </div>
        </div>
      </div>
    </div>
  );
}
