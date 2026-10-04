import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, Activity, ChevronDown, Menu, Search } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TopBar({
  selectedTank = 'tank1',
  onSelectTank,
  isConnected = false,
  status = {},
  alerts = [],
  onToggleMobileMenu,
  onOpenSearch
}) {
  const [showServicesTooltip, setShowServicesTooltip] = useState(false);
  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const alertsRef = useRef(null);
  const servicesRef = useRef(null);

  // Cerrar desplegables al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (alertsRef.current && !alertsRef.current.contains(event.target)) {
        setShowAlertsDropdown(false);
      }
      if (servicesRef.current && !servicesRef.current.contains(event.target)) {
        setShowServicesTooltip(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeAlerts = (alerts || []).filter(a => a.status === 'active' || !a.status);
  const safeStatus = status || {};
  const temp = Number(safeStatus.temperature ?? 4.0);

  // Unificación visual de alertas duplicadas o sinónimas para la campana
  // (mantiene datos originales intactos para /alerts y /history)
  const unifiedAlerts = useMemo(() => {
    const groups = new Map();

    activeAlerts.forEach((alert) => {
      const rawType = (alert.alert_type || alert.type || '').toUpperCase();
      const rawMsg = (alert.message || alert.description || '').toUpperCase();

      let key = 'OTHER';
      let title = alert.alert_type || alert.type || 'Incidencia del Sistema';
      let cleanDesc = alert.message || alert.description || 'Lectura fuera de umbral';

      // Agrupación semántica de anomalías concurrentes
      if (rawType.includes('TEMP') || rawMsg.includes('TEMP') || rawMsg.includes('CALOR') || rawMsg.includes('CÁLIDO')) {
        key = 'TEMP_HIGH';
        title = 'Temperatura Fuera de Rango';
        cleanDesc = 'Temperatura sobre el límite térmico (> 6.0 °C)';
      } else if (rawType.includes('NIVEL') || rawMsg.includes('NIVEL') || rawType.includes('LEVEL') || rawMsg.includes('LEVEL')) {
        key = 'LEVEL_LOW';
        title = 'Nivel Crítico de Tanque';
        cleanDesc = 'Volumen de líquido por debajo del 20%';
      } else if (rawType.includes('TAPA') || rawMsg.includes('TAPA') || rawType.includes('LID') || rawMsg.includes('LID')) {
        key = 'LID_OPEN';
        title = 'Pérdida Térmica por Tapa Abierta';
        cleanDesc = 'Tapa abierta compromete la refrigeración';
      } else if (rawType.includes('MQTT') || rawMsg.includes('MQTT') || rawType.includes('BROKER') || rawMsg.includes('BROKER')) {
        key = 'MQTT_DISCONNECT';
        title = 'Desconexión de Telemetría MQTT';
        cleanDesc = 'Enlace con broker interrumpido; modo local';
      } else {
        key = `${rawType}_${rawMsg.slice(0, 20)}`;
      }

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          title,
          description: cleanDesc,
          severity: alert.severity === 'critical' ? 'critical' : 'warning',
          count: 1,
          latestTimestamp: alert.timestamp || new Date().toISOString(),
          originalIds: [alert.id],
        });
      } else {
        const item = groups.get(key);
        item.count += 1;
        if (alert.severity === 'critical') item.severity = 'critical';
        if (alert.timestamp && new Date(alert.timestamp) > new Date(item.latestTimestamp)) {
          item.latestTimestamp = alert.timestamp;
        }
        item.originalIds.push(alert.id);
      }
    });

    return Array.from(groups.values());
  }, [activeAlerts]);
  
  // Estado global del sistema
  let overallState = 'normal';
  let overallText = 'Sistema Normal';
  if (temp > 6.0 || safeStatus.system_state === 'CRITICAL' || activeAlerts.some(a => a.severity === 'critical')) {
    overallState = 'critical';
    overallText = 'Alerta Crítica';
  } else if (temp > 4.0 || safeStatus.system_state === 'WARNING' || safeStatus.mode === 'MANUAL' || activeAlerts.length > 0) {
    overallState = 'warning';
    overallText = safeStatus.mode === 'MANUAL' ? 'Modo Manual' : 'Advertencia';
  }

  const isBrokerConnected = isConnected && (safeStatus.mqtt_status || '').includes('CONNECT');

  return (
    <header className="topbar-container" role="banner" aria-label="Barra de estado superior">
      {/* LADO IZQUIERDO: Botón Menú Móvil + Selector de Tanque & Conexión Consolidada */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        
        {/* Botón de Menú Móvil (visible en responsive) */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="mobile-menu-toggle-btn"
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: '1px solid var(--border-default)',
              color: 'var(--color-text-secondary)',
              cursor: 'pointer',
            }}
            aria-label="Abrir menú de navegación móvil"
          >
            <Menu size={18} strokeWidth={1.5} />
          </button>
        )}

        {/* Selector de Tanque */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <select
            value={selectedTank}
            onChange={(e) => onSelectTank?.(e.target.value)}
            style={{
              padding: '5px 28px 5px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              backgroundColor: 'var(--color-surface-raised)',
              color: 'var(--color-text-primary)',
              fontSize: '0.8125rem',
              fontWeight: 500,
              fontFamily: 'inherit',
              cursor: 'pointer',
              outline: 'none',
              appearance: 'none',
            }}
            aria-label="Seleccionar tanque de almacenamiento"
          >
            <option value="tank1">Tanque Principal (1000 L)</option>
            <option value="tank2">Tanque Auxiliar (500 L)</option>
          </select>
          <ChevronDown 
            size={14} 
            strokeWidth={1.5} 
            style={{ position: 'absolute', right: 8, pointerEvents: 'none', color: 'var(--color-text-muted)' }} 
          />
        </div>

        {/* Punto único de conexión con tooltip consolidado */}
        <div 
          ref={servicesRef} 
          style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
          onMouseEnter={() => setShowServicesTooltip(true)}
          onMouseLeave={() => setShowServicesTooltip(false)}
        >
          <button
            onClick={() => setShowServicesTooltip(!showServicesTooltip)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--color-text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
            }}
            aria-label="Estado de conexión de servicios"
          >
            <span className={`status-dot ${isBrokerConnected ? 'normal' : 'warning'}`} aria-hidden="true" />
            <span>{isBrokerConnected ? 'Servicios en línea' : 'Conexión parcial'}</span>
          </button>

          {/* Tooltip flotante con estado real de cada servicio */}
          {showServicesTooltip && (
            <div 
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '6px',
                width: '240px',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                padding: '10px 12px',
                boxShadow: 'var(--shadow-dropdown)',
                zIndex: 50,
                fontSize: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
              role="tooltip"
            >
              <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '4px' }}>
                Infraestructura IoT (Telemetría)
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>ESP32 Virtual:</span>
                <span style={{ fontWeight: 500, color: safeStatus.esp32_status === 'ACTIVE' ? 'var(--color-cyan-primary)' : 'var(--color-amber)' }}>
                  {safeStatus.esp32_status || 'ACTIVO'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Broker MQTT:</span>
                <span style={{ fontWeight: 500, color: isBrokerConnected ? 'var(--color-cyan-primary)' : 'var(--color-red)' }}>
                  {safeStatus.mqtt_status || 'CONECTADO'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Base de Datos:</span>
                <span style={{ fontWeight: 500, color: 'var(--color-cyan-primary)' }}>
                  {safeStatus.db_status || 'CONECTADO'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Modo de Control:</span>
                <span style={{ fontWeight: 500, color: safeStatus.mode === 'AUTO' ? 'var(--color-text-primary)' : 'var(--color-amber)' }}>
                  {safeStatus.mode === 'AUTO' ? 'AUTOMÁTICO' : 'MANUAL'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Peltier / Relé:</span>
                <span style={{ fontWeight: 500, color: safeStatus.cooling ? 'var(--color-cyan-primary)' : 'var(--color-text-muted)' }}>
                  {safeStatus.cooling ? 'ENFRIANDO (ON)' : 'STANDBY (OFF)'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '6px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Canal WebSocket:</span>
                <span style={{ fontWeight: 500, color: isConnected ? 'var(--color-cyan-primary)' : 'var(--color-red)' }}>
                  {isConnected ? 'Conectado (Bidireccional)' : 'Desconectado'}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* LADO DERECHO: Buscador Ctrl+K, Estado Global, Indicador En Vivo & Campana */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        
        {/* Acceso Rápido a Paleta de Búsqueda Ctrl+K */}
        {onOpenSearch && (
          <button
            onClick={onOpenSearch}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface)',
              border: '1px solid var(--border-default)',
              color: 'var(--color-text-secondary)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'border-color var(--transition-fast)',
            }}
            title="Abrir buscador de variables y comandos (Ctrl+K)"
            aria-label="Buscar en el sistema (Ctrl+K)"
          >
            <Search size={14} strokeWidth={1.5} color="var(--color-cyan-primary)" />
            <span style={{ fontSize: '0.6875rem' }}>Buscar...</span>
            <kbd
              style={{
                fontSize: '0.625rem',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                padding: '1px 4px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--color-text-dim)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              Ctrl+K
            </kbd>
          </button>
        )}

        {/* Estado Global */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 500 }}>
          <span className={`status-dot ${overallState}`} aria-hidden="true" />
          <span style={{ color: overallState === 'critical' ? 'var(--color-red)' : overallState === 'warning' ? 'var(--color-amber)' : 'var(--color-cyan-primary)' }}>
            {overallText}
          </span>
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-subtle)' }} aria-hidden="true" />

        {/* Indicador En Vivo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
          <Activity size={14} strokeWidth={1.5} color="var(--color-cyan-primary)" />
          <span>En vivo</span>
        </div>

        <div style={{ width: '1px', height: '16px', backgroundColor: 'var(--border-subtle)' }} aria-hidden="true" />

        {/* Campana de Alertas con Contador Unificado */}
        <div ref={alertsRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '6px',
              borderRadius: 'var(--radius-md)',
              background: showAlertsDropdown ? 'var(--color-surface-raised)' : 'transparent',
              color: activeAlerts.length > 0 ? 'var(--color-amber)' : 'var(--color-text-secondary)',
              border: '1px solid transparent',
              cursor: 'pointer',
            }}
            aria-label={`Alertas del sistema: ${activeAlerts.length} activas (${unifiedAlerts.length} agrupadas)`}
          >
            <Bell size={18} strokeWidth={1.5} />
            {activeAlerts.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  minWidth: '15px',
                  height: '15px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-red)',
                  color: '#FFFFFF',
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 3px',
                }}
              >
                {activeAlerts.length}
              </span>
            )}
          </button>

          {/* Desplegable de Alertas Unificadas */}
          {showAlertsDropdown && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '6px',
                width: '320px',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-dropdown)',
                zIndex: 50,
                overflow: 'hidden',
              }}
              role="dialog"
              aria-label="Lista de alertas activas unificadas"
            >
              <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--color-text-primary)' }}>
                    Alertas Activas
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
                    ({unifiedAlerts.length} {unifiedAlerts.length === 1 ? 'incidencia' : 'incidencias'})
                  </span>
                </div>
                <Link
                  to="/alerts"
                  onClick={() => setShowAlertsDropdown(false)}
                  style={{ fontSize: '0.6875rem', color: 'var(--color-cyan-primary)', textDecoration: 'none' }}
                >
                  Ver todas ({activeAlerts.length})
                </Link>
              </div>

              <div style={{ maxHeight: '250px', overflowY: 'auto', padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {unifiedAlerts.length > 0 ? (
                  unifiedAlerts.slice(0, 5).map((item) => (
                    <div
                      key={item.key}
                      style={{
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--color-surface)',
                        borderLeft: `3px solid ${item.severity === 'critical' ? 'var(--color-red)' : 'var(--color-amber)'}`,
                        fontSize: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {item.title}
                          </span>
                          {item.count > 1 && (
                            <span
                              style={{
                                fontSize: '0.625rem',
                                padding: '1px 5px',
                                borderRadius: 'var(--radius-full)',
                                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                                color: 'var(--color-text-secondary)',
                                fontWeight: 600,
                              }}
                            >
                              x{item.count}
                            </span>
                          )}
                        </div>
                        <span style={{ color: 'var(--color-text-muted)', fontSize: '0.6875rem' }}>
                          {item.latestTimestamp ? new Date(item.latestTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'En vivo'}
                        </span>
                      </div>
                      <div style={{ color: 'var(--color-text-secondary)', fontSize: '0.6875rem', lineHeight: 1.3 }}>
                        {item.description}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '16px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                    Sin alertas activas en el tanque
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
