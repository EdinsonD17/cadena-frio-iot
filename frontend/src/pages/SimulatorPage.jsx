import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useWebSocket } from '../services/websocket';
import { Play, Pause, RotateCcw, WifiOff, Wifi, AlertOctagon, CheckCircle2, Sliders, Cpu } from 'lucide-react';

export default function SimulatorPage() {
  const { lastMessage } = useWebSocket();
  const [simStatus, setSimStatus] = useState('running');
  const [currentValues, setCurrentValues] = useState({
    temperature: 4.0,
    level: 80.0,
    lid: 'CLOSED',
    cooling: false,
    mode: 'AUTO',
    mqtt_status: 'CONNECTED'
  });
  const [targetTempInput, setTargetTempInput] = useState(4.0);
  const [levelInput, setLevelInput] = useState(80.0);
  const [feedback, setFeedback] = useState(null);

  const notify = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    api.getStatus().then((s) => {
      if (s) {
        setCurrentValues({
          temperature: s.temperature ?? 4.0,
          level: s.level ?? 80.0,
          lid: s.lid ?? 'CLOSED',
          cooling: s.cooling ?? false,
          mode: s.mode ?? 'AUTO',
          mqtt_status: s.mqtt_status ?? 'CONNECTED'
        });
        if (s.temperature) setTargetTempInput(s.temperature);
        if (s.level) setLevelInput(s.level);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'sensor_update') {
      const d = lastMessage.data;
      const newLid = d.lid || d.lid_state;
      setCurrentValues({
        temperature: d.temperature ?? currentValues.temperature,
        level: d.level ?? currentValues.level,
        lid: newLid || currentValues.lid,
        cooling: d.cooling !== undefined ? d.cooling : currentValues.cooling,
        mode: d.mode || currentValues.mode,
        mqtt_status: (d.mqtt_status || 'CONNECTED').toUpperCase()
      });
    }
  }, [lastMessage]);

  const handleApplyTemp = () => {
    api.simSetTemp(targetTempInput).then(() => notify(`Temperatura inyectada: ${targetTempInput}°C`));
  };

  const handleApplyLevel = () => {
    api.simSetLevel(levelInput).then(() => notify(`Nivel inyectado: ${levelInput}%`));
  };

  const scenarios = [
    {
      num: 1,
      title: 'Operación Normal (4.0°C)',
      desc: 'Temperatura nominal ≈4°C, tapa cerrada, nivel de leche al 80%, refrigeración automática.',
      action: () => {
        api.simSetTemp(4.0);
        api.simSetLevel(80.0);
        api.simCloseLid();
        api.simValidSensor();
        api.simMqttReconnect();
        api.setMode('AUTO');
        notify("Escenario 1: Operación Normal restablecida");
      }
    },
    {
      num: 2,
      title: 'Temperatura Alta (>6.0°C)',
      desc: 'Inyecta 7.5°C. Al superar 6.0°C, el ESP32 genera alerta inmediata y activa la refrigeración.',
      action: () => {
        api.simHighTemp();
        notify("Escenario 2: Temperatura Alta (7.5°C)");
      }
    },
    {
      num: 3,
      title: 'Ciclo de Enfriamiento (3.5°C)',
      desc: 'Enfriamiento continuo hacia 3.5°C, momento en el cual el relé apaga el módulo Peltier.',
      action: () => {
        api.simSetTemp(3.6);
        api.setRefrigeration('ON');
        notify("Escenario 3: Enfriando hacia 3.5°C");
      }
    },
    {
      num: 4,
      title: 'Apertura de Tapa (Pérdida Térmica)',
      desc: 'Simula apertura de tapa. La tasa de transferencia térmica ambiental se incrementa x3.',
      action: () => {
        api.simOpenLid();
        notify("Escenario 4: Tapa del tanque abierta");
      }
    },
    {
      num: 5,
      title: 'Nivel Crítico (<20%)',
      desc: 'Sensor ultrasónico detecta nivel bajo (15%). El sistema emite advertencia visual.',
      action: () => {
        api.simLowLevel();
        notify("Escenario 5: Nivel bajo (15%)");
      }
    },
    {
      num: 6,
      title: 'Falla de Sensor DS18B20',
      desc: 'El sensor envía tramas corruptas. El sistema detecta la anomalía y descarta la lectura.',
      action: () => {
        api.simInvalidSensor();
        notify("Escenario 6: Sensor defectuoso inyectado");
      }
    },
    {
      num: 7,
      title: 'Desconexión de Enlace MQTT',
      desc: 'Interrupción de red MQTT. El ESP32 virtual conmuta automáticamente a control autónomo local.',
      action: () => {
        api.simMqttDisconnect();
        notify("Escenario 7: MQTT Desconectado (Control Local)");
      }
    },
    {
      num: 8,
      title: 'Control Manual Forzado',
      desc: 'Conmuta a modo MANUAL permitiendo control directo del actuador Peltier por el operador.',
      action: () => {
        api.setMode('MANUAL');
        api.setRefrigeration('ON');
        notify("Escenario 8: Modo MANUAL activo");
      }
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', padding: '16px 20px', overflowY: 'auto' }}>
      
      {/* Cabecera */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>
            Panel de Control del Simulador IoT
          </h1>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
            Inyección de perturbaciones, ajuste fino de variables y ejecución de escenarios de prueba
          </div>
        </div>

        {feedback && (
          <span className="badge-cyan mono" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
            {feedback}
          </span>
        )}
      </div>

      {/* Barra de Estado en Vivo de la Simulación */}
      <div className="card" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '8px',
        padding: '12px 14px'
      }}>
        <div style={{ textAlign: 'center', padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-raised)' }}>
          <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>Temperatura</div>
          <div className="mono tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>
            {currentValues.temperature != null ? `${currentValues.temperature.toFixed(1)}°C` : '--'}
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-raised)' }}>
          <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>Nivel Tanque</div>
          <div className="mono tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-cyan-primary)', marginTop: '2px' }}>
            {currentValues.level != null ? `${currentValues.level.toFixed(1)}%` : '--'}
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-raised)' }}>
          <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>Estado Tapa</div>
          <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: currentValues.lid === 'OPEN' ? 'var(--color-amber)' : 'var(--color-text-primary)', marginTop: '2px' }}>
            {currentValues.lid}
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-raised)' }}>
          <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>Peltier</div>
          <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: currentValues.cooling ? 'var(--color-cyan-primary)' : 'var(--color-text-muted)', marginTop: '2px' }}>
            {currentValues.cooling ? 'ON' : 'OFF'}
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-raised)' }}>
          <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>Modo</div>
          <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)', marginTop: '2px' }}>
            {currentValues.mode}
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--color-surface-raised)' }}>
          <div style={{ fontSize: 'var(--font-size-label)', color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 'var(--letter-spacing-label)' }}>MQTT</div>
          <div className="mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: currentValues.mqtt_status === 'CONNECTED' ? 'var(--color-cyan-primary)' : 'var(--color-amber)', marginTop: '2px' }}>
            {currentValues.mqtt_status}
          </div>
        </div>
      </div>

      {/* Ajuste Fino y Control de Ciclo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px' }}>
        
        {/* Deslizadores Manuales */}
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sliders size={16} strokeWidth={1.5} color="var(--color-cyan-primary)" />
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Ajuste Manual de Variables
              </h3>
            </div>
            <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>Inyección directa</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Temperatura */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Temperatura consigna:</label>
                <strong className="mono tabular-nums" style={{ color: 'var(--color-text-primary)', fontSize: '0.875rem' }}>{Number(targetTempInput).toFixed(1)}°C</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="range"
                  min="0"
                  max="12"
                  step="0.1"
                  value={targetTempInput}
                  onChange={(e) => setTargetTempInput(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--color-cyan-primary)' }}
                />
                <button
                  onClick={handleApplyTemp}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-cyan-primary)',
                    color: 'var(--color-cyan-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Inyectar
                </button>
              </div>
            </div>

            {/* Nivel */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Nivel de tanque:</label>
                <strong className="mono tabular-nums" style={{ color: 'var(--color-cyan-primary)', fontSize: '0.875rem' }}>{Number(levelInput).toFixed(0)}%</strong>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={levelInput}
                  onChange={(e) => setLevelInput(parseFloat(e.target.value))}
                  style={{ flex: 1, accentColor: 'var(--color-cyan-primary)' }}
                />
                <button
                  onClick={handleApplyLevel}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-cyan-primary)',
                    color: 'var(--color-cyan-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Inyectar
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Ciclo del Simulador */}
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={16} strokeWidth={1.5} color="var(--color-cyan-primary)" />
              <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                Ciclo de Ejecución
              </h3>
            </div>
            <span className={simStatus === 'running' ? 'badge-cyan' : 'badge-warning'}>
              {simStatus === 'running' ? 'ACTIVO (2.0s)' : 'PAUSADO'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
            <button 
              onClick={() => { api.simStart(); setSimStatus('running'); notify("Simulador en ejecución"); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--color-cyan-primary)',
                color: 'var(--color-cyan-primary)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Play size={13} strokeWidth={1.5} />
              <span>Iniciar</span>
            </button>
            <button 
              onClick={() => { api.simPause(); setSimStatus(s => s === 'paused' ? 'running' : 'paused'); notify("Simulador pausado"); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--border-default)',
                color: 'var(--color-text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Pause size={13} strokeWidth={1.5} />
              <span>Pausar</span>
            </button>
            <button 
              onClick={() => { api.simReset(); setSimStatus('running'); notify("Simulador reiniciado"); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--border-default)',
                color: 'var(--color-text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <RotateCcw size={13} strokeWidth={1.5} />
              <span>Reiniciar</span>
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            <button 
              onClick={() => { api.simMqttDisconnect(); notify("MQTT Desconectado"); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-default)',
                color: 'var(--color-text-secondary)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <WifiOff size={13} strokeWidth={1.5} />
              <span>Cortar MQTT</span>
            </button>
            <button 
              onClick={() => { api.simMqttReconnect(); notify("MQTT Reconectado"); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--border-default)',
                color: 'var(--color-cyan-primary)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Wifi size={13} strokeWidth={1.5} />
              <span>Reconectar</span>
            </button>
            <button 
              onClick={() => { api.simInvalidSensor(); notify("Sensor defectuoso inyectado"); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'transparent',
                border: '1px solid var(--border-default)',
                color: 'var(--color-amber)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <AlertOctagon size={13} strokeWidth={1.5} />
              <span>Error Sensor</span>
            </button>
            <button 
              onClick={() => { api.simValidSensor(); notify("Sensor normal"); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--color-surface-raised)',
                border: '1px solid var(--border-default)',
                color: 'var(--color-cyan-primary)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <CheckCircle2 size={13} strokeWidth={1.5} />
              <span>Sensor Normal</span>
            </button>
          </div>
        </div>
      </div>

      {/* 8 Escenarios Académicos */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Escenarios de Prueba Académicos
          </h3>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-muted)' }}>
            Validación de perturbaciones del informe técnico
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
          {scenarios.map((s) => (
            <div 
              key={s.num} 
              style={{
                padding: '12px', 
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                backgroundColor: 'var(--color-surface-raised)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span className="badge-cyan mono" style={{ fontSize: '0.625rem' }}>
                    ESCENARIO {s.num}
                  </span>
                </div>
                <h4 style={{ margin: '4px 0', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  {s.title}
                </h4>
                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: '0.75rem', lineHeight: 1.4 }}>
                  {s.desc}
                </p>
              </div>

              <button
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--color-cyan-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all var(--transition-fast)',
                }}
                onClick={s.action}
              >
                Ejecutar Escenario {s.num}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
