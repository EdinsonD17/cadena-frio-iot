import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  LayoutDashboard,
  History,
  AlertTriangle,
  TrendingUp,
  Radio,
  Cpu,
  BookOpen,
  Thermometer,
  Layers,
  Shield,
  Zap,
  Activity,
  X,
  ArrowRight
} from 'lucide-react';

const PALETTE_ITEMS = [
  // NAVEGACIÓN
  {
    id: 'nav-dashboard',
    label: 'Dashboard Principal',
    category: 'Navegación',
    description: 'Monitoreo general del tanque y curva térmica en tiempo real',
    Icon: LayoutDashboard,
    type: 'nav',
    path: '/',
    keywords: ['inicio', 'dashboard', 'tanque', 'temperatura', 'curva', 'monitoreo']
  },
  {
    id: 'nav-history',
    label: 'Historial de Datos',
    category: 'Navegación',
    description: 'Registros históricos y telemetría de sensores',
    Icon: History,
    type: 'nav',
    path: '/history',
    keywords: ['historial', 'historico', 'registros', 'datos', 'telemetria']
  },
  {
    id: 'nav-alerts',
    label: 'Gestión de Alertas',
    category: 'Navegación',
    description: 'Panel de incidencias, alertas térmicas y confirmación',
    Icon: AlertTriangle,
    type: 'nav',
    path: '/alerts',
    keywords: ['alertas', 'alarmas', 'incidencias', 'critico', 'advertencia']
  },
  {
    id: 'nav-kpis',
    label: 'KPIs y Rendimiento',
    category: 'Navegación',
    description: 'Métricas de estabilidad térmica, disponibilidad e integridad',
    Icon: TrendingUp,
    type: 'nav',
    path: '/kpis',
    keywords: ['kpis', 'metricas', 'rendimiento', 'disponibilidad', 'integridad']
  },
  {
    id: 'nav-mqtt',
    label: 'Consola MQTT',
    category: 'Navegación',
    description: 'Monitor de tópicos y flujo de mensajes en vivo',
    Icon: Radio,
    type: 'nav',
    path: '/mqtt',
    keywords: ['mqtt', 'broker', 'consola', 'topicos', 'mensajes', '1883']
  },
  {
    id: 'nav-simulator',
    label: 'Simulador de Fallas',
    category: 'Navegación',
    description: 'Inyección de escenarios térmicos y pruebas de perturbación',
    Icon: Cpu,
    type: 'nav',
    path: '/simulator',
    keywords: ['simulador', 'escenarios', 'pruebas', 'fallas', 'esp32']
  },
  {
    id: 'nav-knowledge',
    label: 'Base de Conocimiento',
    category: 'Navegación',
    description: 'Normativa OMS, arquitectura de hardware y especificaciones',
    Icon: BookOpen,
    type: 'nav',
    path: '/knowledge',
    keywords: ['conocimiento', 'documentacion', 'oms', 'hardware', 'norma']
  },

  // VARIABLES Y SENSORES DEL SISTEMA
  {
    id: 'var-temperature',
    label: 'Temperatura del Tanque',
    category: 'Variables del Sistema',
    description: 'Sensor digital sumergible Dallas DS18B20 (Rango objetivo 3.5 a 4.0 °C, límite 6.0 °C)',
    Icon: Thermometer,
    type: 'var',
    path: '/',
    keywords: ['temperatura', 'ds18b20', 'sensor', 'grados', 'celsius', 'termico']
  },
  {
    id: 'var-level',
    label: 'Nivel de Líquido',
    category: 'Variables del Sistema',
    description: 'Sensor ultrasónico HC-SR04 (Capacidad 1000 L, escala 0 a 100%)',
    Icon: Layers,
    type: 'var',
    path: '/',
    keywords: ['nivel', 'volumen', 'litros', 'hc-sr04', 'ultrasonico', 'capacidad']
  },
  {
    id: 'var-lid',
    label: 'Estado de Tapa Hermética',
    category: 'Variables del Sistema',
    description: 'Sensor magnético reed switch (Estado OPEN / CLOSED, previene pérdida térmica)',
    Icon: Shield,
    type: 'var',
    path: '/',
    keywords: ['tapa', 'reed switch', 'magnetico', 'abierta', 'cerrada', 'lid']
  },
  {
    id: 'var-cooling',
    label: 'Refrigeración Peltier',
    category: 'Variables del Sistema',
    // Escalado orientativo de la potencia nominal (~225 W est.)
    description: 'Etapa de potencia termoeléctrica (~225 W est.)',
    Icon: Zap,
    type: 'var',
    path: '/',
    keywords: ['refrigeracion', 'peltier', 'rele', 'enfriamiento', 'potencia', 'consumo']
  },
  {
    id: 'var-mode',
    label: 'Modo de Operación',
    category: 'Variables del Sistema',
    description: 'Estrategia de control del lazo de frío (Automático con histeresis / Manual)',
    Icon: Activity,
    type: 'var',
    path: '/',
    keywords: ['modo', 'automatico', 'manual', 'histeresis', 'control']
  },
  {
    id: 'var-integrity',
    label: 'Integridad de Cadena de Frío',
    category: 'Variables del Sistema',
    description: 'Porcentaje de lecturas válidas dentro de tolerancia normativa',
    Icon: TrendingUp,
    type: 'var',
    path: '/kpis',
    keywords: ['integridad', 'lecturas validas', 'calidad de datos', 'kpi']
  },
  {
    id: 'var-out-of-range',
    label: 'Tiempo Fuera de Rango',
    category: 'Variables del Sistema',
    description: 'Segundos acumulados de excursión térmica por encima de 6.0 °C',
    Icon: AlertTriangle,
    type: 'var',
    path: '/kpis',
    keywords: ['fuera de rango', 'excursion termica', 'tiempo acumulado', 'segundos']
  }
];

export default function CommandPalette({ isOpen, onClose, status = {}, kpis = {} }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();

  // Obtener valor real de la telemetría (o '--' si no existe)
  const getLiveValue = (itemId) => {
    switch (itemId) {
      case 'var-temperature':
        return status?.temperature != null ? `${Number(status.temperature).toFixed(1)} °C` : '--';
      case 'var-level':
        return status?.level != null ? `${Number(status.level).toFixed(1)}%` : '--';
      case 'var-lid':
        return status?.lid || status?.lid_state || '--';
      case 'var-cooling':
        // Escalado orientativo de la potencia nominal (~225 W est.)
        return status?.cooling != null ? (status.cooling ? 'ACTIVO (~225 W est.)' : 'STANDBY (0 W est.)') : '--';
      case 'var-mode':
        return status?.mode || '--';
      case 'var-integrity':
        return kpis?.valid_readings_pct != null ? `${Number(kpis.valid_readings_pct).toFixed(1)}%` : '--';
      case 'var-out-of-range':
        return kpis?.out_of_range_seconds != null ? `${kpis.out_of_range_seconds}s` : '--';
      default:
        return null;
    }
  };

  // Filtrado de elementos
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PALETTE_ITEMS;
    return PALETTE_ITEMS.filter(item => {
      const matchLabel = item.label.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some(k => k.toLowerCase().includes(q));
      return matchLabel || matchDesc || matchCategory || matchKeywords;
    });
  }, [query]);

  // Reset del índice seleccionado al cambiar la consulta
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Foco en el input al abrir y listener global de Ctrl+K
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Manejo de teclado (Flechas, Enter, Escape)
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + (filteredItems.length || 1)) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredItems[selectedIndex];
      if (selected) {
        navigate(selected.path);
        onClose();
      }
    }
  };

  // Scroll automático hacia el elemento seleccionado
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector('[data-selected="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de búsqueda y variables"
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          width: '90%',
          maxWidth: '560px',
          backgroundColor: '#0B1324',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-dropdown)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '75vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Campo de búsqueda */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-subtle)',
            gap: '10px',
          }}
        >
          <Search size={18} strokeWidth={1.5} color="var(--color-cyan-primary)" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar variable, sensor o navegar a sección..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--color-text-primary)',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
            }}
            aria-label="Buscar en el sistema"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
              aria-label="Limpiar búsqueda"
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          )}
          <span
            style={{
              fontSize: '0.6875rem',
              backgroundColor: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 6px',
              color: 'var(--color-text-muted)',
              fontWeight: 600,
            }}
          >
            ESC para salir
          </span>
        </div>

        {/* Lista de resultados */}
        <div
          ref={listRef}
          role="listbox"
          aria-label="Resultados de búsqueda"
          style={{
            overflowY: 'auto',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const { Icon } = item;
              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isSelected}
                  data-selected={isSelected}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'var(--color-surface-raised)' : 'transparent',
                    borderLeft: isSelected ? '3px solid var(--color-cyan-primary)' : '3px solid transparent',
                    transition: 'background-color var(--transition-fast)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? 'var(--color-cyan-primary)' : 'var(--color-text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon size={18} strokeWidth={1.5} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                          }}
                        >
                          {item.label}
                        </span>
                        <span
                          style={{
                            fontSize: '0.625rem',
                            textTransform: 'uppercase',
                            padding: '1px 5px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: 'rgba(255, 255, 255, 0.06)',
                            color: 'var(--color-text-dim)',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {item.category}
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          color: 'var(--color-text-muted)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.description}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                    {item.type === 'var' ? (
                      <span className="mono tabular-nums" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-cyan-primary)' }}>
                        {getLiveValue(item.id)}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.6875rem' }}>Ir a página</span>
                    )}
                    <ArrowRight size={14} strokeWidth={1.5} color={isSelected ? 'var(--color-cyan-primary)' : 'var(--color-text-dim)'} />
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8125rem' }}>
              No se encontraron variables ni páginas para "{query}"
            </div>
          )}
        </div>

        {/* Pie de navegación de la paleta */}
        <div
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.6875rem',
            color: 'var(--color-text-dim)',
          }}
        >
          <div style={{ display: 'flex', gap: '14px' }}>
            <span><strong style={{ color: 'var(--color-text-secondary)' }}>&uarr; &darr;</strong> Navegar</span>
            <span><strong style={{ color: 'var(--color-text-secondary)' }}>ENTER</strong> Seleccionar</span>
            <span><strong style={{ color: 'var(--color-text-secondary)' }}>ESC</strong> Cerrar</span>
          </div>
          <span>Búsqueda rápida</span>
        </div>
      </div>
    </div>
  );
}
