import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../services/websocket';
import { api } from '../services/api';
import { ArrowRight, BookOpen, Layers } from 'lucide-react';

export default function KnowledgePage() {
  const { lastMessage } = useWebSocket();
  const [status, setStatus] = useState({});
  const [kpis, setKpis] = useState({});

  useEffect(() => {
    api.getStatus().then(setStatus).catch(() => {});
    api.getKpis().then(setKpis).catch(() => {});
    const iv = setInterval(() => {
      api.getStatus().then(setStatus).catch(() => {});
      api.getKpis().then(setKpis).catch(() => {});
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (lastMessage?.type === 'sensor_update') {
      const d = lastMessage.data;
      setStatus(s => ({
        ...s,
        temperature: d.temperature,
        cooling: d.cooling,
        mode: d.mode,
        system_state: d.system_state || s.system_state,
      }));
    }
  }, [lastMessage]);

  const temp = status.temperature;
  const warningTemp = 6.0;

  // Pirámide DIKW Dinámica en tiempo real
  const pyramid = [
    {
      title: 'DATO',
      value: temp != null ? `${temp.toFixed(1)} °C` : '-- °C',
      color: 'var(--color-cyan-primary)',
    },
    {
      title: 'INFORMACIÓN',
      value: temp != null
        ? temp >= warningTemp ? 'Temp. superior al límite'
        : temp <= 3.5 ? 'Temp. bajo el mínimo'
        : 'Temp. en rango seguro'
        : 'Sin datos',
      color: 'var(--color-text-primary)',
    },
    {
      title: 'CONOCIMIENTO',
      value: temp != null
        ? temp >= warningTemp ? 'Condición FUERA de rango'
        : 'Condición DENTRO de rango'
        : 'Evaluando...',
      color: 'var(--color-cyan-primary)',
    },
    {
      title: 'DECISIÓN',
      value: temp != null
        ? temp >= warningTemp ? 'Activar refrigeración'
        : temp <= 3.5 ? 'Apagar refrigeración'
        : 'Mantener estado actual'
        : 'Esperando datos',
      color: 'var(--color-text-secondary)',
    },
    {
      title: 'ACCIÓN',
      value: status.cooling ? 'Refrigeración ON' : 'Refrigeración OFF',
      color: 'var(--color-text-primary)',
    },
    {
      title: 'APRENDIZAJE',
      value: `Tiempo fuera de rango: ${kpis.out_of_range_seconds || 0}s`,
      color: 'var(--color-cyan-primary)',
    },
  ];

  const stages = [
    {
      title: '1. IDENTIFICACIÓN DEL CONOCIMIENTO',
      items: [
        'Variables clave: temperatura DS18B20, nivel HC-SR04, estado de tapa',
        'Parámetros objetivo: 4.0°C objetivo, 6.0°C alarma, 3.5°C corte',
        'Métricas: promedio, máximo, mínimo y tiempo fuera de rango',
      ],
    },
    {
      title: '2. CAPTURA / ADQUISICIÓN',
      items: [
        'Sensores simulados en tiempo real mediante modelos matemáticos de software',
        'Ciclo autónomo continuo cada 2.0s ejecutado por el ESP32 virtual',
      ],
    },
    {
      title: '3. ALMACENAMIENTO / ORGANIZACIÓN',
      items: [
        'Base de datos relacional SQLite local (cold_chain.db)',
        'Tablas estructuradas: sensor_readings, events, alerts, configuration',
      ],
    },
    {
      title: '4. COMPARTICIÓN / DIFUSIÓN',
      items: [
        'Dashboard web industrial en tiempo real con canal WebSocket',
        'Consola MQTT virtual con publicación y suscripción sobre broker local',
      ],
    },
    {
      title: '5. APLICACIÓN / USO',
      items: [
        'Control automático por reglas de umbral en ESP32 virtual',
        'Control manual forzado para pruebas del operador',
        'Generación de alertas al detectar aperturas o temperaturas anómalas',
      ],
    },
    {
      title: '6. EVALUACIÓN DE DESEMPEÑO',
      items: [
        `Temperatura Promedio: ${kpis.avg_temp ?? '--'}°C`,
        `Temperatura Máxima: ${kpis.max_temp ?? '--'}°C`,
        `Tiempo acumulado en riesgo: ${kpis.out_of_range_seconds ?? '--'}s`,
        `Disponibilidad MQTT: ${kpis.mqtt_availability_pct ?? '--'}%`,
      ],
    },
    {
      title: '7. ACTUALIZACIÓN / MEJORA',
      items: [
        'Inyección de 8 escenarios de prueba académicos',
        'Ajuste dinámico de consignas térmicas y niveles de tanque',
        'Restablecimiento instantáneo de la simulación para nuevas demostraciones',
      ],
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', padding: '16px 20px', overflowY: 'auto' }}>
      {/* Cabecera */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Base de Conocimiento (Modelo DIKW)
        </h1>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Arquitectura conceptual: Dato &rarr; Información &rarr; Conocimiento &rarr; Sabiduría / Acción
        </div>
      </div>

      {/* Pirámide DIKW */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} strokeWidth={1.5} color="var(--color-cyan-primary)" />
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Pirámide DIKW Dinámica en Tiempo Real
            </h3>
          </div>
          <span className="badge-cyan">FLUJO EN VIVO</span>
        </div>

        <div style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center',
          alignItems: 'center', gap: '8px',
        }}>
          {pyramid.map((step, i) => (
            <React.Fragment key={step.title}>
              <div style={{
                padding: '10px 14px', 
                borderRadius: 'var(--radius-md)', 
                textAlign: 'center',
                minWidth: '130px', 
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--color-surface-raised)',
              }}>
                <div style={{ color: step.color, fontWeight: 700, fontSize: 'var(--font-size-label)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>
                  {step.title}
                </div>
                <div className="mono tabular-nums" style={{ marginTop: '4px', fontSize: '0.8125rem', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                  {step.value}
                </div>
              </div>
              {i < pyramid.length - 1 && (
                <ArrowRight size={14} strokeWidth={1.5} color="var(--color-text-muted)" aria-hidden="true" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 7 Etapas del Ciclo de Gestión del Conocimiento */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={16} strokeWidth={1.5} color="var(--color-cyan-primary)" />
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              7 Etapas del Ciclo de Gestión del Conocimiento
            </h3>
          </div>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Marco metodológico</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '10px',
        }}>
          {stages.map((s, idx) => (
            <div 
              key={idx} 
              style={{
                padding: '12px', 
                borderRadius: 'var(--radius-md)', 
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <h4 style={{ margin: '0 0 6px', color: 'var(--color-text-primary)', fontSize: '0.8125rem', fontWeight: 600 }}>
                {s.title}
              </h4>
              <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--color-text-secondary)', fontSize: '0.75rem', lineHeight: 1.5 }}>
                {s.items.map((item, j) => (
                  <li key={j} style={{ marginBottom: '2px' }}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
