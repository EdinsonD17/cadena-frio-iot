import React, { useState, useEffect, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ReferenceDot,
  Label,
  ResponsiveContainer,
} from 'recharts';
import { AlertTriangle, X } from 'lucide-react';
import { useThresholds } from '../hooks/useThresholds';
import { getTemperatureState } from '../utils/temperatureColor';

const RANGES = [
  { label: '15 min', value: 15, minMinutes: 0 },
  { label: '1 h', value: 60, minMinutes: 15 },
  { label: '6 h', value: 360, minMinutes: 60 },
  { label: '24 h', value: 1440, minMinutes: 360 },
];

function CleanTooltip({ active, payload, label, config }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  if (val == null) return null;

  const numVal = Number(val);
  const tempState = getTemperatureState(numVal, config);
  const badgeColor = tempState.color;
  const badgeText = tempState.statusText;

  let timeFormatted = '';
  try {
    timeFormatted = new Date(label).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    timeFormatted = String(label);
  }

  return (
    <div
      style={{
        backgroundColor: '#0B1324',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-md)',
        padding: '8px 12px',
        boxShadow: 'var(--shadow-dropdown)',
        fontSize: '0.75rem',
      }}
    >
      <div style={{ color: 'var(--color-text-muted)', marginBottom: '3px', fontSize: '0.6875rem' }} className="mono">
        {timeFormatted}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '4px' }}>
        <span className="mono tabular-nums" style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          {numVal.toFixed(2)}
        </span>
        <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>°C</span>
      </div>
      <div style={{ fontSize: '0.6875rem', fontWeight: 500, color: badgeColor }}>
        {badgeText}
      </div>
    </div>
  );
}

export default function TemperatureChart({
  data = [],
  filterMinutes = 15,
  onFilterChange,
  alerts = [],
  availableMinutes = null,
}) {
  // Configuración dinámica desde el hook compartido useThresholds (con fallback estándar si tarda o falla)
  const { config, isDefaultConfig } = useThresholds();
  const [dismissedAlertId, setDismissedAlertId] = useState(null);

  // Alerta activa relevante para mostrar en el banner superior
  const activeAlert = useMemo(() => {
    return (alerts || []).find(a => (a.status === 'active' || !a.status));
  }, [alerts]);

  const isAlertVisible = activeAlert && activeAlert.id !== dismissedAlertId;

  // Cálculo del lapso de tiempo cubierto por los datos disponibles (en minutos)
  const availableSpanMinutes = useMemo(() => {
    if (!data || data.length < 2) return 0;
    const first = new Date(data[0].timestamp).getTime();
    const last = new Date(data[data.length - 1].timestamp).getTime();
    if (isNaN(first) || isNaN(last)) return 0;
    return Math.max(0, Math.round((last - first) / 60000));
  }, [data]);

  const effectiveSpan = availableMinutes != null ? availableMinutes : availableSpanMinutes;

  // Vector de temperaturas válidas para estadísticas en el cliente
  const temps = useMemo(() => {
    return (data || []).map(d => Number(d.temperature)).filter(t => !isNaN(t) && t != null);
  }, [data]);

  // Estadísticas discretas calculadas en el cliente
  const avg = temps.length ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1) : '--';
  const max = temps.length ? Math.max(...temps).toFixed(1) : '--';
  const min = temps.length ? Math.min(...temps).toFixed(1) : '--';

  // Último punto registrado para dot resaltado y estado cromático de la curva
  const latestPoint = data && data.length > 0 ? data[data.length - 1] : null;
  const currentTemp = latestPoint?.temperature != null ? Number(latestPoint.temperature) : null;

  // Criterio cromático compartido unificado con el termómetro
  const tempState = getTemperatureState(currentTemp, config);
  const lineColor = tempState.color;
  const statusBadgeText = tempState.hasData
    ? `${tempState.statusText} (${currentTemp.toFixed(1)} °C)`
    : tempState.statusText;
  const statusBadgeClass = tempState.badgeClass;

  // Dominio de Y: rango estándar fijo [2, 8] °C derivado de los umbrales configurados.
  // Si las lecturas se salen de rango (p. ej. adición grande de leche a ~20 °C),
  // se expande suavemente hacia enteros redondos (pares) sin decimales para mantener legibilidad.
  const yDomain = useMemo(() => {
    const baseMin = Math.floor((config.temperature_cooling_off ?? 3.5) - 1.5); // 2 °C
    const baseMax = Math.ceil((config.temperature_warning ?? 6.0) + 2.0);      // 8 °C
    
    if (!temps.length) return [baseMin, baseMax];
    
    const dataMax = Math.max(...temps);
    const dataMin = Math.min(...temps);
    
    let minY = baseMin;
    let maxY = baseMax;
    
    if (dataMax > baseMax) {
      maxY = Math.ceil(dataMax + 1);
      if (maxY % 2 !== 0) maxY += 1;
    }
    
    if (dataMin < baseMin) {
      minY = Math.floor(dataMin - 1);
      if (minY % 2 !== 0) minY -= 1;
    }
    
    return [minY, maxY];
  }, [config.temperature_cooling_off, config.temperature_warning, temps]);

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 16px' }}>
      
      {/* 1. CABECERA: Título, Estado y Selector de Rango Segmentado */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <h3 className="card-title" style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Curva Térmica en Tiempo Real
          </h3>
          <span className={statusBadgeClass} style={{ fontSize: '0.6875rem' }}>
            {statusBadgeText}
          </span>
          {isDefaultConfig && (
            <span
              title="Configuración de servidor no disponible o demorada; usando umbrales estándar (3.5 / 4.0 / 6.0 °C)"
              style={{
                fontSize: '0.625rem',
                color: 'var(--color-text-dim)',
                border: '1px dashed var(--border-default)',
                padding: '1px 6px',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              Umbrales por defecto
            </span>
          )}
          {effectiveSpan > 0 && effectiveSpan < filterMinutes && (
            <span
              style={{
                fontSize: '0.6875rem',
                color: 'var(--color-amber)',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: 'var(--radius-sm)',
                padding: '2px 8px',
                fontWeight: 500,
              }}
            >
              Datos disponibles: {effectiveSpan < 60 ? `${Math.round(effectiveSpan)} min` : `${(effectiveSpan / 60).toFixed(1)} h`}
            </span>
          )}
        </div>

        {/* Selector de Rango Segmentado (15 min, 1 h, 6 h, 24 h) - Siempre seleccionables */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--color-surface)',
            border: '1px solid var(--border-default)',
            gap: '2px',
          }}
          role="group"
          aria-label="Selector de rango temporal de la curva"
        >
          {RANGES.map(r => {
            const isSelected = filterMinutes === r.value;
            return (
              <button
                key={r.label}
                onClick={() => onFilterChange?.(r.value)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  fontSize: '0.6875rem',
                  fontWeight: isSelected ? 600 : 500,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? 'var(--color-surface-raised)' : 'transparent',
                  color: isSelected
                    ? 'var(--color-cyan-primary)'
                    : 'var(--color-text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
                aria-pressed={isSelected}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. BANNER DELGADO Y DESCARTABLE PARA ALERTA ACTIVA (Descarte visual de cliente) */}
      {isAlertVisible && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 12px',
            marginBottom: '10px',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: activeAlert.severity === 'critical' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
            border: `1px solid ${activeAlert.severity === 'critical' ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
            fontSize: '0.75rem',
          }}
          role="alert"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle
              size={15}
              strokeWidth={1.5}
              color={activeAlert.severity === 'critical' ? 'var(--color-red)' : 'var(--color-amber)'}
            />
            <span style={{ fontWeight: 600, color: activeAlert.severity === 'critical' ? 'var(--color-red)' : 'var(--color-amber)' }}>
              {activeAlert.alert_type || activeAlert.type || 'Incidencia Térmica'}:
            </span>
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {activeAlert.message || activeAlert.description || 'Lectura de temperatura fuera del rango operativo'}
            </span>
          </div>

          <button
            onClick={() => setDismissedAlertId(activeAlert.id ?? 'active')}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
            }}
            aria-label="Cerrar notificación de alerta"
          >
            <X size={15} strokeWidth={1.5} />
          </button>
        </div>
      )}

      {/* 3. GRÁFICO RECHARTS OPTIMIZADO (Sin parpadeo, isAnimationActive=false) */}
      <div style={{ height: 230, width: '100%', minWidth: 0, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <ComposedChart data={data} margin={{ top: 16, right: 38, left: -14, bottom: 0 }}>
            <defs>
              {/* Degradado para área inferior con opacidad máxima del 12% */}
              <linearGradient id="tempAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={lineColor} stopOpacity={0.12} />
                <stop offset="100%" stopColor={lineColor} stopOpacity={0.00} />
              </linearGradient>
            </defs>

            {/* 3 o 4 líneas horizontales casi invisibles, sin cuadrícula vertical */}
            <CartesianGrid vertical={false} stroke="rgba(255, 255, 255, 0.04)" />

            {/* Eje X con menos etiquetas espaciadas limpiamente */}
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              tickFormatter={t => {
                try {
                  return new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch {
                  return '';
                }
              }}
              minTickGap={45}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-subtle)' }}
            />

            {/* Eje Y con marcas discretas redondas (enteros) */}
            <YAxis
              domain={yDomain}
              tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickCount={yDomain[1] > 10 ? 6 : 4}
              tickFormatter={v => `${Math.round(v)}°`}
            />

            <Tooltip content={<CleanTooltip config={config} />} />

            {/* Banda tenue para el rango objetivo (3.5°C a 4.0°C) */}
            <ReferenceArea
              y1={config.temperature_cooling_off}
              y2={config.temperature_target}
              fill="rgba(56, 189, 248, 0.05)"
              ifOverflow="hidden"
            />

            {/* Línea punteada fina para el límite superior (6.0°C) con etiqueta a la derecha */}
            <ReferenceLine
              y={config.temperature_warning}
              stroke="var(--color-red)"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: `${config.temperature_warning.toFixed(1)}°C Límite`,
                position: 'right',
                fill: 'var(--color-red)',
                fontSize: 9,
                fontWeight: 600,
              }}
            />

            {/* Línea tenue para el límite del objetivo (4.0°C) */}
            <ReferenceLine
              y={config.temperature_target}
              stroke="rgba(56, 189, 248, 0.35)"
              strokeDasharray="2 2"
              strokeWidth={1}
              label={{
                value: `${config.temperature_target.toFixed(1)}°C Obj.`,
                position: 'right',
                fill: 'var(--color-cyan-primary)',
                fontSize: 9,
                fontWeight: 600,
              }}
            />

            {/* Área inferior con opacidad máxima del 12% */}
            <Area
              type="monotone"
              dataKey="temperature"
              fill="url(#tempAreaGradient)"
              stroke="none"
              isAnimationActive={false}
            />

            {/* Línea de 2.5 px con color dinámico según estado */}
            <Line
              type="monotone"
              dataKey="temperature"
              stroke={lineColor}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: '#FFFFFF', stroke: lineColor, strokeWidth: 2 }}
              isAnimationActive={false}
            />

            {/* Punto resaltado con valor flotante en el último dato */}
            {latestPoint && latestPoint.timestamp && latestPoint.temperature != null && (
              <ReferenceDot
                x={latestPoint.timestamp}
                y={latestPoint.temperature}
                r={4}
                fill={lineColor}
                stroke="#060B14"
                strokeWidth={2}
                isAnimationActive={false}
              >
                <Label
                  value={`${Number(latestPoint.temperature).toFixed(1)} °C`}
                  position="top"
                  offset={10}
                  fill="var(--color-text-primary)"
                  fontSize={10}
                  fontWeight={700}
                />
              </ReferenceDot>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* 4. FILA DISCRETA DE ESTADÍSTICAS CALCULADAS EN EL CLIENTE */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px 0',
          marginTop: '6px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span>
            Promedio:{' '}
            <strong className="mono tabular-nums" style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
              {avg !== '--' ? `${avg} °C` : '--'}
            </strong>
          </span>
          <span style={{ color: 'var(--border-subtle)' }}>•</span>
          <span>
            Máxima:{' '}
            <strong className="mono tabular-nums" style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
              {max !== '--' ? `${max} °C` : '--'}
            </strong>
          </span>
          <span style={{ color: 'var(--border-subtle)' }}>•</span>
          <span>
            Mínima:{' '}
            <strong className="mono tabular-nums" style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>
              {min !== '--' ? `${min} °C` : '--'}
            </strong>
          </span>
        </div>

        <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-dim)' }}>
          {temps.length} lecturas
        </div>
      </div>

    </div>
  );
}
