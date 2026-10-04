import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useWebSocket } from '../services/websocket';
import { Send, Terminal } from 'lucide-react';

const TOPICS = [
  'cadena-frio/control/modo',
  'cadena-frio/control/refrigeracion',
  'cadena-frio/configuracion/temperatura-objetivo',
  'cadena-frio/configuracion/limite-advertencia',
  'cadena-frio/monitoreo/temperatura',
  'cadena-frio/monitoreo/nivel',
  'cadena-frio/monitoreo/tapa',
  'cadena-frio/indicadores/temperatura-promedio',
  'cadena-frio/indicadores/temperatura-maxima',
  'cadena-frio/indicadores/tiempo-fuera-rango',
  'cadena-frio/alertas',
];

export default function MqttConsolePage() {
  const { messageHistory } = useWebSocket();
  const [messages, setMessages] = useState([]);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [payload, setPayload] = useState('');

  // Carga inicial de mensajes desde el backend - preservado 100%
  useEffect(() => {
    api.getMqttMessages().then(data => {
      if (Array.isArray(data)) setMessages(data.reverse());
    }).catch(() => {});
  }, []);

  // Incorporación reactiva de mensajes WebSocket - preservado 100%
  useEffect(() => {
    if (messageHistory.length > 0) {
      const latest = messageHistory[0];
      if (latest && (latest.type === 'mqtt_message' || latest.type === 'sensor_update')) {
        setMessages(prev => {
          const entry = {
            timestamp: latest.timestamp,
            topic: latest.topic || latest.data?.topic || 'cadena-frio/monitoreo/temperatura',
            message: typeof latest.payload === 'object'
              ? JSON.stringify(latest.payload)
              : typeof latest.data === 'object'
              ? JSON.stringify(latest.data)
              : String(latest.payload || latest.data),
          };
          return [entry, ...prev].slice(0, 200);
        });
      }
    }
  }, [messageHistory]);

  const handlePublish = async () => {
    if (!payload.trim()) return;
    await api.publishMqtt(topic, payload).catch(() => {});
    setPayload('');
  };

  const quickBtn = (label, value) => (
    <button
      style={{
        padding: '3px 8px',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--border-default)',
        color: 'var(--color-text-secondary)',
        fontSize: '0.75rem',
        cursor: 'pointer',
        fontFamily: 'var(--font-mono)',
        transition: 'all var(--transition-fast)',
      }}
      onClick={() => setPayload(value)}
    >
      {label}
    </button>
  );

  const getTopicAccent = (t) => {
    if (t.includes('control')) return 'var(--color-cyan-primary)';
    if (t.includes('alertas')) return 'var(--color-red)';
    if (t.includes('configuracion')) return 'var(--color-amber)';
    return 'var(--color-cyan-primary)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', height: '100%', padding: '16px 20px', overflowY: 'auto' }}>
      {/* Cabecera */}
      <div>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
          Consola MQTT — Telemetría en Vivo
        </h1>
        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          Inspección y publicación de paquetes de telemetría sobre el broker local (Puerto 1883)
        </div>
      </div>

      {/* Sección de Publicación */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Publicar Mensaje MQTT
          </h3>
          <span className="badge-cyan mono">QoS 0</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 240px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-label)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>
              Tópico (Topic)
            </label>
            <select
              value={topic}
              onChange={e => setTopic(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--color-surface-raised)',
                color: 'var(--color-text-primary)',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-mono)',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div style={{ flex: '2 1 320px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-label)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>
              Payload (Carga Útil)
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input
                type="text"
                value={payload}
                onChange={e => setPayload(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePublish()}
                placeholder='Escribe el payload o selecciona un valor...'
                style={{
                  flex: 1,
                  padding: '6px 10px',
                  backgroundColor: 'var(--color-surface-raised)',
                  color: 'var(--color-text-primary)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--font-mono)',
                  outline: 'none',
                }}
              />
              <button
                onClick={handlePublish}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  backgroundColor: 'var(--color-surface-raised)',
                  border: '1px solid var(--color-cyan-primary)',
                  color: 'var(--color-cyan-primary)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <Send size={13} strokeWidth={1.5} />
                <span>Publicar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Accesos Rápidos de Payload */}
        <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 'var(--font-size-label)', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>
            Accesos rápidos:
          </span>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {quickBtn('ON', 'ON')}
            {quickBtn('OFF', 'OFF')}
            {quickBtn('AUTO', 'AUTO')}
            {quickBtn('MANUAL', 'MANUAL')}
            {quickBtn('4.0 °C', '4.0')}
            {quickBtn('6.0 °C', '6.0')}
          </div>
        </div>
      </div>

      {/* Feed de Mensajes en Tiempo Real (100% Monoespaciado) */}
      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '14px 16px', minHeight: '360px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={16} strokeWidth={1.5} color="var(--color-cyan-primary)" />
            <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Registro de Mensajes MQTT
            </h3>
          </div>
          <span className="badge-cyan mono tabular-nums">{messages.length} paquetes</span>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', fontFamily: 'var(--font-mono)' }}>
          {messages.map((m, i) => (
            <div 
              key={i} 
              style={{
                padding: '6px 10px', 
                backgroundColor: 'var(--color-surface-raised)', 
                borderRadius: 'var(--radius-sm)',
                borderLeft: `3px solid ${getTopicAccent(m.topic || '')}`,
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'baseline',
                gap: '10px',
                borderTop: '1px solid var(--border-subtle)',
                borderRight: '1px solid var(--border-subtle)',
                borderBottom: '1px solid var(--border-subtle)',
              }}
            >
              <span className="tabular-nums" style={{ color: 'var(--color-text-muted)', fontSize: '0.6875rem', flexShrink: 0 }}>
                {m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : '00:00:00'}
              </span>
              <strong style={{ color: getTopicAccent(m.topic || ''), flexShrink: 0, fontSize: '0.75rem' }}>
                {m.topic}
              </strong>
              <span style={{ color: 'var(--color-text-primary)', wordBreak: 'break-all', fontSize: '0.75rem' }}>
                {typeof m.message === 'object' ? JSON.stringify(m.message) : m.message}
              </span>
            </div>
          ))}
          {messages.length === 0 && (
            <div style={{ color: 'var(--color-text-muted)', padding: '32px', textAlign: 'center', fontSize: '0.8125rem' }}>
              No hay mensajes MQTT registrados. Inicia el simulador para visualizar la transmisión de paquetes en vivo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
