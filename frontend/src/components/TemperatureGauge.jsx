import React from 'react';
import { useThresholds } from '../hooks/useThresholds';
import { getTemperatureState } from '../utils/temperatureColor';

export default function TemperatureGauge({ temperature = null }) {
  const { config } = useThresholds();
  const target = config.temperature_target ?? 4.0;
  const warning = config.temperature_warning ?? 6.0;
  const coolingOff = config.temperature_cooling_off ?? 3.5;

  const hasData = temperature !== null && temperature !== undefined && !isNaN(Number(temperature));
  const tempNum = hasData ? Number(temperature) : null;

  // Criterio cromático y de estado unificado compartido con la curva
  const tempState = getTemperatureState(tempNum, config);
  const statusColor = tempState.color;
  const statusText = tempState.statusText;
  const badgeClass = tempState.badgeClass;

  // Escala fija minimalista: 0 °C a 10 °C
  const minScale = 0;
  const maxScale = 10;
  const clamped = hasData ? Math.max(minScale, Math.min(maxScale, tempNum)) : minScale;
  const fillPct = hasData ? ((clamped - minScale) / (maxScale - minScale)) * 100 : 0;

  // Dimensiones del tubo SVG ampliadas (~205px de tubo para ocupar la tarjeta)
  const tubeX = 85;
  const tubeY = 15;
  const tubeWidth = 14;
  const tubeHeight = 205;
  const bulbRadius = 15;
  const bulbCenterY = tubeY + tubeHeight + bulbRadius - 3;

  const fillHeight = (fillPct / 100) * tubeHeight;
  const fillY = (tubeY + tubeHeight) - fillHeight;

  // Marcas de escala discretas
  const marks = [
    { val: 10, label: '10°', isLimit: false, isTarget: false },
    { val: warning, label: `${warning.toFixed(1)}°`, isLimit: true, isTarget: false },
    { val: target, label: `${target.toFixed(1)}°`, isLimit: false, isTarget: true },
    { val: coolingOff, label: `${coolingOff.toFixed(1)}°`, isLimit: false, isTarget: true },
    { val: 0, label: '0°', isLimit: false, isTarget: false },
  ];

  const getYForVal = (val) => {
    const pct = (val - minScale) / (maxScale - minScale);
    return (tubeY + tubeHeight) - pct * tubeHeight;
  };

  return (
    <div
      className="card"
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%',
        padding: '16px 18px',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-lg)',
      }}
      role="region"
      aria-label="Termómetro de temperatura en tiempo real"
    >
      {/* Cabecera del Termómetro */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>
            Termómetro
          </span>
          <span className={badgeClass} style={{ fontSize: '0.6875rem' }}>
            {statusText}
          </span>
        </div>

        {/* Lectura numérica grande (>= 40px, tabular-nums) */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '4px' }}>
          <span
            className="mono tabular-nums"
            style={{
              fontSize: '2.625rem',
              fontWeight: 800,
              color: hasData ? statusColor : 'var(--color-text-muted)',
              lineHeight: 1,
              transition: 'color 200ms ease-out',
            }}
          >
            {hasData ? tempNum.toFixed(1) : '--'}
          </span>
          <span style={{ fontSize: '1.25rem', color: 'var(--color-text-secondary)', fontWeight: 400 }}>
            °C
          </span>
        </div>
      </div>

      {/* Ilustración Plana y Minimalista del Termómetro (Tubo ampliado ~205px) */}
      <div style={{ width: '100%', flex: 1, minHeight: '260px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <svg
          viewBox="0 0 170 260"
          style={{ width: '100%', height: '100%', maxHeight: '280px', overflow: 'visible' }}
          aria-hidden="true"
        >
          {/* Banda tenue para rango objetivo (3.5°C a 4.0°C) */}
          <rect
            x={tubeX - 26}
            y={getYForVal(target)}
            width="66"
            height={getYForVal(coolingOff) - getYForVal(target)}
            fill="var(--color-cyan-dim)"
            rx="3"
            opacity="0.6"
          />

          {/* Marcas de escala con números legibles (>= 12px) */}
          {marks.map((m) => {
            const yPos = getYForVal(m.val);
            return (
              <g key={m.label}>
                <line
                  x1={tubeX - 15}
                  y1={yPos}
                  x2={tubeX - 4}
                  y2={yPos}
                  stroke={m.isLimit ? 'var(--color-red)' : m.isTarget ? 'var(--color-cyan-primary)' : 'var(--border-subtle)'}
                  strokeWidth={m.isLimit ? 1.5 : 1}
                  strokeDasharray={m.isLimit ? '2 2' : 'none'}
                />
                <text
                  x={tubeX - 20}
                  y={yPos + 4}
                  textAnchor="end"
                  fill={m.isLimit ? 'var(--color-red)' : m.isTarget ? 'var(--color-cyan-primary)' : 'var(--color-text-muted)'}
                  fontSize="12"
                  fontWeight={m.isLimit || m.isTarget ? '600' : '400'}
                  className="mono tabular-nums"
                >
                  {m.label}
                </text>
              </g>
            );
          })}

          {/* Etiqueta límite superior tenue */}
          <text
            x={tubeX + tubeWidth + 10}
            y={getYForVal(warning) + 3}
            fill="var(--color-red)"
            fontSize="10"
            fontWeight="600"
          >
            LÍMITE
          </text>

          {/* Etiqueta rango objetivo tenue */}
          <text
            x={tubeX + tubeWidth + 10}
            y={(getYForVal(target) + getYForVal(coolingOff)) / 2 + 3}
            fill="var(--color-cyan-primary)"
            fontSize="10"
            fontWeight="600"
          >
            OBJETIVO
          </text>

          {/* Tubo de vidrio exterior plano */}
          <rect
            x={tubeX}
            y={tubeY}
            width={tubeWidth}
            height={tubeHeight}
            rx={tubeWidth / 2}
            fill="#071120"
            stroke="var(--border-default)"
            strokeWidth="1.5"
          />

          {/* Bulbo inferior plano */}
          <circle
            cx={tubeX + tubeWidth / 2}
            cy={bulbCenterY}
            r={bulbRadius}
            fill="#071120"
            stroke="var(--border-default)"
            strokeWidth="1.5"
          />

          {/* Relleno del líquido (color reactivo según rango) */}
          {hasData && (
            <g className="thermometer-fluid">
              <rect
                x={tubeX + 2.5}
                y={fillY}
                width={tubeWidth - 5}
                height={fillHeight}
                rx={(tubeWidth - 5) / 2}
                fill={statusColor}
                style={{
                  transition: 'height 200ms ease-out, y 200ms ease-out, fill 200ms ease-out',
                }}
              />
              <circle
                cx={tubeX + tubeWidth / 2}
                cy={bulbCenterY}
                r={bulbRadius - 3}
                fill={statusColor}
                style={{
                  transition: 'fill 200ms ease-out',
                }}
              />
            </g>
          )}
        </svg>
      </div>

      {/* Referencias al pie */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '8px',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '0.6875rem',
          color: 'var(--color-text-muted)',
        }}
      >
        <span>Objetivo: <strong style={{ color: 'var(--color-cyan-primary)', fontWeight: 600 }}>{target.toFixed(1)} °C</strong></span>
        <span>Límite: <strong style={{ color: 'var(--color-red)', fontWeight: 600 }}>{warning.toFixed(1)} °C</strong></span>
      </div>
    </div>
  );
}
