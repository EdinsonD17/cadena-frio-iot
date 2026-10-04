import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useWebSocket } from '../services/websocket';
import {
  LayoutDashboard,
  History,
  AlertTriangle,
  TrendingUp,
  Radio,
  Cpu,
  BookOpen,
  Snowflake,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Server,
  X
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/',          Icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/history',   Icon: History,         label: 'Historial de Datos' },
  { to: '/alerts',    Icon: AlertTriangle,   label: 'Alertas' },
  { to: '/kpis',      Icon: TrendingUp,      label: 'KPIs y Rendimiento' },
  { to: '/mqtt',      Icon: Radio,           label: 'Consola MQTT' },
  { to: '/simulator', Icon: Cpu,             label: 'Simulador' },
  { to: '/knowledge', Icon: BookOpen,        label: 'Base de Conocimiento' },
];

export default function Sidebar({
  onOpenSearch,
  isMobileOpen = false,
  onCloseMobile
}) {
  const { isConnected } = useWebSocket();
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [env, setEnv] = useState('local');

  const isExpanded = isPinned || isHovered || isMobileOpen;

  return (
    <>
      {/* Backdrop para versión móvil */}
      {isMobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <nav
        className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'} ${isMobileOpen ? 'mobile-open' : ''}`}
        aria-label="Navegación principal"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Cabecera del Sidebar */}
        <div
          className="sidebar-header"
          style={{
            padding: isExpanded ? '14px 14px 12px' : '14px 0 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isExpanded ? 'space-between' : 'center',
            borderBottom: '1px solid var(--border-subtle)',
            minHeight: '58px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              overflow: 'hidden',
            }}
            onClick={() => setIsPinned(!isPinned)}
            title={isExpanded ? 'Fijar / Desfijar menú' : 'Expandir menú lateral'}
          >
            <div
              className="brand-icon"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--border-default)',
                color: 'var(--color-cyan-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                margin: isExpanded ? 0 : '0 auto',
              }}
              aria-hidden="true"
            >
              <Snowflake size={20} strokeWidth={1.5} />
            </div>

            {isExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
                <h2 style={{ fontSize: '0.8125rem', fontWeight: 700, margin: 0, color: 'var(--color-text-primary)', whiteSpace: 'nowrap' }}>
                  Cadena de Frío IoT
                </h2>
                <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                  Monitoreo Industrial
                </span>
              </div>
            )}
          </div>

          {/* Botón de pin o cierre en móvil */}
          {isExpanded && (
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {isMobileOpen ? (
                <button
                  onClick={onCloseMobile}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-text-muted)',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label="Cerrar menú móvil"
                >
                  <X size={18} strokeWidth={1.5} />
                </button>
              ) : (
                <button
                  onClick={() => setIsPinned(!isPinned)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isPinned ? 'var(--color-cyan-primary)' : 'var(--color-text-muted)',
                    padding: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  title={isPinned ? 'Desfijar menú (colapsar a 64px)' : 'Fijar menú expandido'}
                  aria-label={isPinned ? 'Desfijar menú' : 'Fijar menú'}
                >
                  {isPinned ? <PanelLeftClose size={16} strokeWidth={1.5} /> : <PanelLeftOpen size={16} strokeWidth={1.5} />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Selector de entorno (expandido y botón accesible en colapsado) */}
        {isExpanded ? (
          <div className="sidebar-env" style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-subtle)' }}>
            <label
              htmlFor="env-select"
              style={{
                fontSize: 'var(--font-size-label)',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--letter-spacing-label)',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Entorno Activo
            </label>
            <select
              id="env-select"
              value={env}
              onChange={(e) => setEnv(e.target.value)}
              style={{
                width: '100%',
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--color-surface-raised)',
                color: 'var(--color-text-primary)',
                fontSize: '0.75rem',
                fontFamily: 'inherit',
                cursor: 'pointer',
                outline: 'none',
              }}
              aria-label="Seleccionar entorno de simulación"
            >
              <option value="local">ESP32 Virtual (Local)</option>
              <option value="adafruit">Adafruit IO (Simulado)</option>
            </select>
          </div>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setEnv(e => e === 'local' ? 'adafruit' : 'local')}
              style={{
                background: 'transparent',
                border: 'none',
                color: env === 'local' ? 'var(--color-cyan-primary)' : 'var(--color-amber)',
                padding: '6px',
                cursor: 'pointer',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title={`Entorno activo: ${env === 'local' ? 'ESP32 Virtual (Local)' : 'Adafruit IO (Simulado)'}. Clic para alternar.`}
              aria-label="Alternar entorno de simulación"
            >
              <Server size={18} strokeWidth={1.5} />
            </button>
          </div>
        )}

        {/* Acceso a Paleta de Búsqueda rápida (Ctrl+K) */}
        <div style={{ padding: isExpanded ? '8px 12px' : '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          {isExpanded ? (
            <button
              onClick={onOpenSearch}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--border-default)',
                color: 'var(--color-text-secondary)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textAlign: 'left',
              }}
              aria-label="Abrir paleta de comandos y búsqueda (Ctrl+K)"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Search size={14} strokeWidth={1.5} color="var(--color-text-muted)" />
                <span>Buscar variable...</span>
              </div>
              <kbd
                style={{
                  fontSize: '0.625rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  padding: '1px 5px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--color-text-dim)',
                  fontWeight: 600,
                  border: '1px solid var(--border-subtle)',
                }}
              >
                Ctrl+K
              </kbd>
            </button>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={onOpenSearch}
                style={{
                  width: '40px',
                  height: '36px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'transparent',
                  border: '1px solid transparent',
                  color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)',
                }}
                title="Buscar variables o navegar (Ctrl+K)"
                aria-label="Abrir paleta de búsqueda (Ctrl+K)"
              >
                <Search size={18} strokeWidth={1.5} />
              </button>
            </div>
          )}
        </div>

        {/* Lista de Enlaces Verticales */}
        <div
          className="nav-links"
          role="menubar"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: isExpanded ? '10px 8px' : '10px 0',
            gap: '3px',
            overflowY: 'auto',
          }}
        >
          {isExpanded && (
            <div
              className="nav-links-label"
              style={{
                fontSize: 'var(--font-size-label)',
                fontWeight: 600,
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
                letterSpacing: 'var(--letter-spacing-label)',
                padding: '4px 10px',
              }}
            >
              Módulos
            </div>
          )}

          {NAV_ITEMS.map(({ to, Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              role="menuitem"
              title={!isExpanded ? label : undefined}
              aria-label={label}
              onClick={() => {
                if (isMobileOpen && onCloseMobile) {
                  onCloseMobile();
                }
              }}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: isExpanded ? 'flex-start' : 'center',
                padding: isExpanded ? '8px 12px' : '10px 0',
                gap: isExpanded ? '12px' : '0',
                color: isActive ? 'var(--color-cyan-primary)' : 'var(--color-text-secondary)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.8125rem',
                borderRadius: isExpanded ? 'var(--radius-md)' : '0',
                borderLeft: isActive ? '3px solid var(--color-cyan-primary)' : '3px solid transparent',
                backgroundColor: isActive ? 'rgba(56, 189, 248, 0.04)' : 'transparent',
                transition: 'all var(--transition-fast)',
                textDecoration: 'none',
                width: '100%',
              })}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <Icon size={19} strokeWidth={1.5} />
              </span>
              {isExpanded && (
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {label}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Pie del Menú Lateral */}
        <div
          className="sidebar-footer"
          style={{
            padding: isExpanded ? '10px 14px' : '12px 0',
            backgroundColor: 'var(--color-surface-raised)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: isExpanded ? 'flex-start' : 'center',
            fontSize: '0.6875rem',
            gap: '4px',
          }}
        >
          {isExpanded ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                <span className={`status-dot ${isConnected ? 'normal' : 'warning'}`} aria-hidden="true" />
                <span style={{ color: isConnected ? 'var(--color-cyan-primary)' : 'var(--color-amber)' }}>
                  {isConnected ? 'Broker Conectado' : 'Reconectando Broker'}
                </span>
              </div>
              <div className="mono" style={{ color: 'var(--color-text-dim)', fontSize: '0.625rem' }}>
                Puerto 1883 • 14ms
              </div>
            </>
          ) : (
            <div
              title={isConnected ? 'Broker Conectado (Puerto 1883)' : 'Broker Desconectado'}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span className={`status-dot ${isConnected ? 'normal' : 'warning'}`} aria-hidden="true" />
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
