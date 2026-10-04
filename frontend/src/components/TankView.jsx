import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Check, WifiOff } from 'lucide-react';

export default function TankView({
  level = 80,
  lid = 'CLOSED',
  temperature = 4.0,
  cooling = false,
  capacity = 1000,
  isConnected = true,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const safeLevel = Math.max(0, Math.min(100, Number(level) || 0));
  const isLidOpen = lid === 'OPEN';
  const tankCapacityLiters = capacity || 1000;
  const currentLiters = Math.round((safeLevel / 100) * tankCapacityLiters);
  const [cooldown, setCooldown] = useState(false);

  // Estado para el control de llenado arbitrario (Ajuste B)
  const [targetLevel, setTargetLevel] = useState(Math.round(safeLevel));
  const [targetLiters, setTargetLiters] = useState(Math.round((safeLevel / 100) * tankCapacityLiters));
  const [inputError, setInputError] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  // Sincronizar capacidad si cambia el tanque seleccionado
  useEffect(() => {
    setTargetLiters(Math.round((targetLevel / 100) * tankCapacityLiters));
  }, [tankCapacityLiters]);

  // Quick adjust handlers
  const handleLevelChange = (delta) => {
    const newLvl = Math.max(0, Math.min(100, Math.round(safeLevel + delta)));
    setTargetLevel(newLvl);
    setTargetLiters(Math.round((newLvl / 100) * tankCapacityLiters));
    setInputError(null);
    api.simSetLevel(newLvl).catch(() => {});
  };

  const handleSetLevel = (target) => {
    setTargetLevel(target);
    setTargetLiters(Math.round((target / 100) * tankCapacityLiters));
    setInputError(null);
    api.simSetLevel(target).catch(() => {});
  };

  // Manejadores de sincronización para Deslizador y Campos numéricos
  const handleSliderChange = (e) => {
    const val = Math.max(0, Math.min(100, Number(e.target.value)));
    setTargetLevel(val);
    setTargetLiters(Math.round((val / 100) * tankCapacityLiters));
    setInputError(null);
  };

  const handlePercentInputChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setTargetLevel('');
      setInputError('Introduce un porcentaje entre 0 y 100');
      return;
    }
    const val = Number(raw);
    setTargetLevel(val);
    if (isNaN(val) || val < 0 || val > 100) {
      setInputError('El porcentaje debe estar comprendido entre 0% y 100%');
    } else {
      setInputError(null);
      setTargetLiters(Math.round((val / 100) * tankCapacityLiters));
    }
  };

  const handleLitersInputChange = (e) => {
    const raw = e.target.value;
    if (raw === '') {
      setTargetLiters('');
      setInputError(`Introduce un volumen entre 0 y ${tankCapacityLiters} L`);
      return;
    }
    const val = Number(raw);
    setTargetLiters(val);
    if (isNaN(val) || val < 0 || val > tankCapacityLiters) {
      setInputError(`El volumen debe estar comprendido entre 0 y ${tankCapacityLiters} L`);
    } else {
      setInputError(null);
      const computedPct = Math.round((val / tankCapacityLiters) * 1000) / 10;
      setTargetLevel(computedPct);
    }
  };

  const handleApplyTargetLevel = () => {
    const num = Number(targetLevel);
    if (isNaN(num) || num < 0 || num > 100) {
      setInputError('El valor a aplicar debe ser válido entre 0% y 100%');
      return;
    }
    setIsApplying(true);
    setInputError(null);

    // Mismo mecanismo existente: api.simSetLevel(num)
    api.simSetLevel(num)
      .then(() => {
        setFeedbackMsg(`Nivel fijado a ${num}% (${Math.round((num / 100) * tankCapacityLiters)} L)`);
        setTimeout(() => setFeedbackMsg(null), 3000);
      })
      .catch(() => {
        setInputError('Error al transmitir la orden de nivel al simulador');
      })
      .finally(() => {
        setIsApplying(false);
      });
  };

  const handleToggleLid = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (cooldown) return;
    setCooldown(true);
    setTimeout(() => setCooldown(false), 500);

    if (isLidOpen) {
      api.simCloseLid().catch(() => {});
    } else {
      api.simOpenLid().catch(() => {});
    }
  };

  const levelDifference = typeof targetLevel === 'number'
    ? Math.round((targetLevel - safeLevel) * 10) / 10
    : 0;

  return (
    <div 
      className="card"
      style={{
        backgroundColor: 'var(--color-surface)',
        borderColor: isLidOpen ? 'var(--color-cyan-primary)' : 'var(--border-default)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Layout de 2 columnas en escritorio, apilado en móvil */}
      <div className="tank-view-grid">
        
        {/* COLUMNA IZQUIERDA: Ilustración del Tanque, Tapa y Lecturas de Volumen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Tanque de Almacenamiento
            </h3>
            <span className={isLidOpen ? "badge-critical" : "badge-cyan"}>
              {isLidOpen ? "TAPA ABIERTA" : "CERRADA / ASEGURADA"}
            </span>
          </div>

          {/* SVG Tank Minimalist Silhouette with Ice Blue Liquid */}
          <div style={{ position: 'relative', width: '100%', height: '210px', display: 'flex', justifyContent: 'center' }}>
            <svg viewBox="0 0 320 270" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="tankBodyGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#0B1528" />
                  <stop offset="30%" stopColor="#162D55" />
                  <stop offset="70%" stopColor="#1E3A6E" />
                  <stop offset="100%" stopColor="#0B1528" />
                </linearGradient>

                <linearGradient id="iceBlueLiquid" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="25%" stopColor="#BAE6FD" />
                  <stop offset="100%" stopColor="#38BDF8" />
                </linearGradient>

                <clipPath id="innerTankClip">
                  <rect x="65" y="45" width="190" height="185" rx="18" ry="18" />
                </clipPath>
              </defs>

              {/* Tank Stand */}
              <path d="M 80 230 L 68 265 L 86 265 L 96 230 Z" fill="#0E1E3B" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <path d="M 240 230 L 252 265 L 234 265 L 224 230 Z" fill="#0E1E3B" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" />
              <rect x="75" y="250" width="170" height="5" rx="2" fill="#162D55" />

              {/* Ultrasonic Sensor housing */}
              <rect x="140" y="20" width="40" height="25" rx="4" fill="#1D4ED8" stroke="#38BDF8" strokeWidth="1.5" />
              <circle cx="150" cy="35" r="4" fill="#38BDF8" />
              <circle cx="170" cy="35" r="4" fill="#38BDF8" />
              <text x="160" y="14" textAnchor="middle" fill="#93C5FD" fontSize="8.5" fontWeight="bold">HC-SR04 (Nivel)</text>

              {/* Sound wave beam */}
              <g opacity={isHovered ? "0.9" : "0.6"}>
                <path d="M 145 42 Q 160 48 175 42" stroke="#38BDF8" strokeWidth="1.5" fill="none">
                  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
                  <animateTransform attributeName="transform" type="translate" values="0,0; 0,15; 0,0" dur="1.5s" repeatCount="indefinite" />
                </path>
              </g>

              {/* Main Tank Body */}
              <rect x="60" y="40" width="200" height="195" rx="22" ry="22" fill="url(#tankBodyGradient)" stroke="rgba(255,255,255,0.18)" strokeWidth="2" />
              <rect x="65" y="45" width="190" height="185" rx="18" ry="18" fill="#071224" />

              {/* Liquid Container */}
              <g clipPath="url(#innerTankClip)">
                {[25, 50, 75].map((tick) => {
                  const yPos = 230 - (tick / 100) * 175;
                  return (
                    <g key={tick} opacity="0.35">
                      <line x1="65" y1={yPos} x2="255" y2={yPos} stroke="#93C5FD" strokeWidth="1" strokeDasharray="4 4" />
                      <text x="74" y={yPos - 3} fill="#93C5FD" fontSize="8" fontWeight="600">{tick}%</text>
                    </g>
                  );
                })}

                {/* Liquid Level */}
                {(() => {
                  const fillHeight = (safeLevel / 100) * 178;
                  const yTop = 230 - fillHeight;
                  return (
                    <g>
                      <rect 
                        x="65" 
                        y={yTop} 
                        width="190" 
                        height={fillHeight + 10} 
                        fill="url(#iceBlueLiquid)" 
                        style={{ transition: 'y 0.6s cubic-bezier(0.4, 0, 0.2, 1), height 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      />
                      {/* Surface Wave */}
                      <path
                        d={`M 50 ${yTop} Q 110 ${yTop - 5} 160 ${yTop} T 270 ${yTop} L 270 240 L 50 240 Z`}
                        fill="#FFFFFF"
                        opacity="0.8"
                      >
                        <animate 
                          attributeName="d" 
                          dur="2.5s" 
                          repeatCount="indefinite"
                          values={`
                            M 50 ${yTop} Q 110 ${yTop - 5} 160 ${yTop} T 270 ${yTop} L 270 240 L 50 240 Z;
                            M 50 ${yTop} Q 110 ${yTop + 5} 160 ${yTop} T 270 ${yTop} L 270 240 L 50 240 Z;
                            M 50 ${yTop} Q 110 ${yTop - 5} 160 ${yTop} T 270 ${yTop} L 270 240 L 50 240 Z
                          `}
                        />
                      </path>
                    </g>
                  );
                })()}

                {/* Mechanical Agitator */}
                <g transform="translate(160, 145)">
                  <line x1="0" y1="-100" x2="0" y2="40" stroke="#93C5FD" strokeWidth="3" opacity="0.8" />
                  <circle cx="0" cy="-95" r="7" fill="#1D4ED8" stroke="#38BDF8" />
                  <g style={{ animation: cooling ? 'spinSlow 1s linear infinite' : 'spinSlow 3s linear infinite', transformOrigin: '0px 40px' }}>
                    <ellipse cx="0" cy="40" rx="34" ry="5" fill="#1D4ED8" stroke="#38BDF8" strokeWidth="1" />
                    <ellipse cx="0" cy="40" rx="5" ry="34" fill="#1D4ED8" stroke="#38BDF8" strokeWidth="1" />
                    <circle cx="0" cy="40" r="5" fill="#38BDF8" />
                  </g>
                </g>

                {/* DS18B20 Probe */}
                <g transform="translate(95, 45)">
                  <line x1="0" y1="0" x2="0" y2="110" stroke="#38BDF8" strokeWidth="2.5" />
                  <circle cx="0" cy="110" r="4.5" fill="#FFFFFF" />
                  <rect x="-16" y="120" width="32" height="15" rx="3" fill="#0B1528" stroke="#38BDF8" strokeWidth="1" />
                  <text x="0" y="131" fill="#FFFFFF" fontSize="8" fontWeight="bold" textAnchor="middle">{temperature.toFixed(1)}°</text>
                </g>
              </g>

              {/* Tank Lid on Top with Hinge */}
              <g 
                onClick={handleToggleLid} 
                style={{ 
                  cursor: 'pointer', 
                  transition: 'transform 0.4s cubic-bezier(0.34, 1.2, 0.64, 1)', 
                  transformOrigin: '70px 42px', 
                  transform: isLidOpen ? 'rotate(-42deg)' : 'rotate(0deg)' 
                }}
                aria-label="Alternar apertura de tapa"
              >
                <rect x="60" y="34" width="200" height="11" rx="5" fill="#1D4ED8" stroke="#38BDF8" strokeWidth="1.5" />
                <rect x="130" y="27" width="60" height="7" rx="3" fill="#0E1E3B" stroke="#38BDF8" />
                <circle cx="70" cy="39" r="3.5" fill={isLidOpen ? '#FFFFFF' : '#38BDF8'} />
              </g>

              {/* Steam particle effect on open lid */}
              {isLidOpen && (
                <g transform="translate(160, 28)" pointerEvents="none">
                  <circle cx="-25" cy="-5" r="5" fill="rgba(255, 255, 255, 0.4)" style={{ animation: 'steamRise 2s infinite ease-out' }} />
                  <circle cx="0" cy="-8" r="7" fill="rgba(56, 189, 248, 0.5)" style={{ animation: 'steamRise 1.8s infinite ease-out 0.3s' }} />
                  <circle cx="25" cy="-6" r="6" fill="rgba(255, 255, 255, 0.4)" style={{ animation: 'steamRise 2.2s infinite ease-out 0.6s' }} />
                  <text x="0" y="-18" textAnchor="middle" fill="#FFFFFF" fontSize="8.5" fontWeight="bold">¡PÉRDIDA TÉRMICA!</text>
                </g>
              )}

              {/* Inlet & Outlet Pipes */}
              <path d="M 30 70 L 60 70" stroke="#162D55" strokeWidth="10" fill="none" strokeLinecap="round" />
              <path d="M 30 70 L 60 70" stroke="#38BDF8" strokeWidth="3" strokeDasharray="5 4" style={{ animation: 'pipeFlow 1s linear infinite' }} />
              <path d="M 260 210 L 290 210" stroke="#162D55" strokeWidth="10" fill="none" strokeLinecap="round" />
              <path d="M 260 210 L 290 210" stroke="#38BDF8" strokeWidth="3" strokeDasharray="5 4" style={{ animation: 'pipeFlow 0.8s linear infinite' }} />
            </svg>
          </div>

          {/* Lecturas numéricas del tanque */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            background: 'var(--color-bg-base)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-label)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>Nivel de Leche</div>
              <div className="mono tabular-nums" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {safeLevel.toFixed(1)}%
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-label)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>Volumen Actual</div>
              <div className="mono tabular-nums" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
                {currentLiters} <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>/ {tankCapacityLiters} L</span>
              </div>
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: Botón de Tapa, Botones Rápidos y Control de Fijación Arbitraria */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          {/* Botón de apertura/cierre de la tapa */}
          <button
            className="btn-secondary"
            style={{ width: '100%', padding: '9px', fontWeight: 600, fontSize: '0.8125rem' }}
            onClick={handleToggleLid}
          >
            {isLidOpen ? 'Cerrar Tapa del Tanque' : 'Abrir Tapa del Tanque'}
          </button>

          {/* Ajustes rápidos predefinidos (+10%, -10%, 90%, 15%) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            <button 
              className="btn-secondary" 
              style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600 }}
              onClick={() => handleLevelChange(10)}
            >
              +10%
            </button>
            <button 
              className="btn-secondary" 
              style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600 }}
              onClick={() => handleLevelChange(-10)}
            >
              -10%
            </button>
            <button 
              className="btn-secondary" 
              style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600 }}
              onClick={() => handleSetLevel(90)}
            >
              Lleno (90%)
            </button>
            <button 
              className="btn-secondary" 
              style={{ padding: '6px 4px', fontSize: '0.75rem', fontWeight: 600 }}
              onClick={() => handleSetLevel(15)}
            >
              Bajo (15%)
            </button>
          </div>

          {/* Control de fijación de nivel arbitrario del tanque */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'var(--color-bg-base)',
              border: '1px solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            {/* Cabecera del control con comparación en tiempo real */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
              <span style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>
                Fijar Nivel Arbitrario
              </span>
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                Actual: <strong className="mono tabular-nums" style={{ color: 'var(--color-text-primary)' }}>{safeLevel.toFixed(1)}%</strong>
                {' → '}
                Elegido: <strong className="mono tabular-nums" style={{ color: 'var(--color-cyan-primary)' }}>{typeof targetLevel === 'number' ? targetLevel.toFixed(1) : targetLevel}%</strong>
                {typeof targetLevel === 'number' && (
                  <span className="mono tabular-nums" style={{ marginLeft: '4px', color: levelDifference >= 0 ? 'var(--color-cyan-primary)' : 'var(--color-amber)' }}>
                    ({levelDifference >= 0 ? `+${levelDifference.toFixed(1)}%` : `${levelDifference.toFixed(1)}%`})
                  </span>
                )}
              </div>
            </div>

            {/* Deslizador de 0 a 100% */}
            <div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={typeof targetLevel === 'number' ? targetLevel : 50}
                disabled={!isConnected}
                onChange={handleSliderChange}
                style={{
                  width: '100%',
                  accentColor: 'var(--color-cyan-primary)',
                  cursor: isConnected ? 'pointer' : 'not-allowed',
                  opacity: isConnected ? 1 : 0.4
                }}
                aria-label="Deslizador de nivel del tanque de 0 a 100%"
              />
            </div>

            {/* Campos sincronizados: Porcentaje (%) y Volumen (L) + Botón Aplicar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.625rem', color: 'var(--color-text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Nivel (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={targetLevel}
                  disabled={!isConnected}
                  onChange={handlePercentInputChange}
                  className="form-input mono tabular-nums"
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8125rem' }}
                  aria-label="Porcentaje de nivel del tanque"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.625rem', color: 'var(--color-text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Volumen (L)
                </label>
                <input
                  type="number"
                  min="0"
                  max={tankCapacityLiters}
                  step="1"
                  value={targetLiters}
                  disabled={!isConnected}
                  onChange={handleLitersInputChange}
                  className="form-input mono tabular-nums"
                  style={{ width: '100%', padding: '6px 8px', fontSize: '0.8125rem' }}
                  aria-label={`Volumen del tanque en litros de 0 a ${tankCapacityLiters}`}
                />
              </div>

              <div>
                <button
                  onClick={handleApplyTargetLevel}
                  disabled={!isConnected || inputError != null || isApplying}
                  className="btn-primary"
                  style={{
                    padding: '6px 14px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    height: '33px',
                    opacity: (!isConnected || inputError != null || isApplying) ? 0.4 : 1,
                    cursor: (!isConnected || inputError != null || isApplying) ? 'not-allowed' : 'pointer'
                  }}
                  aria-label="Aplicar nivel fijado al simulador"
                >
                  <Check size={14} strokeWidth={1.5} />
                  <span>{isApplying ? 'Aplicando...' : 'Aplicar'}</span>
                </button>
              </div>
            </div>

            {/* Mensaje de validación / error discreto */}
            {inputError && (
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-red)' }}>
                {inputError}
              </div>
            )}

            {/* Aviso discreto si backend/broker está desconectado */}
            {!isConnected && (
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-amber)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <WifiOff size={14} strokeWidth={1.5} />
                <span>Control deshabilitado: sin conexión con el backend/broker</span>
              </div>
            )}

            {/* Notificación sutil de éxito */}
            {feedbackMsg && (
              <div style={{ fontSize: '0.6875rem', color: 'var(--color-cyan-primary)', fontWeight: 500 }}>
                {feedbackMsg}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
