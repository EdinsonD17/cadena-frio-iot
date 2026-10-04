const API_BASE = '/api';

export const api = {
  getStatus: () => fetch(`${API_BASE}/status`).then(r => r.json()),
  getCurrentSensors: () => fetch(`${API_BASE}/sensors/current`).then(r => r.json()),
  getHistory: (minutes) => fetch(`${API_BASE}/sensors/history?minutes=${minutes || ''}`).then(r => r.json()),
  getTelemetryHistory: (minutes) => fetch(`${API_BASE}/telemetry/history?minutes=${minutes || 15}`).then(r => r.json()),
  getKpis: () => fetch(`${API_BASE}/kpis`).then(r => r.json()),
  getEvents: () => fetch(`${API_BASE}/events`).then(r => r.json()),
  getAlerts: (status) => fetch(`${API_BASE}/alerts?status=${status || 'all'}`).then(r => r.json()),
  getConfiguration: () => fetch(`${API_BASE}/configuration`).then(r => r.json()),
  
  // Control
  setMode: (value) => fetch(`${API_BASE}/control/mode`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({value}) }).then(r => r.json()),
  setRefrigeration: (value) => fetch(`${API_BASE}/control/refrigeration`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({value}) }).then(r => r.json()),
  
  // Simulation
  simStart: () => fetch(`${API_BASE}/simulation/start`, {method:'POST'}).then(r => r.json()),
  simPause: () => fetch(`${API_BASE}/simulation/pause`, {method:'POST'}).then(r => r.json()),
  simReset: () => fetch(`${API_BASE}/simulation/reset`, {method:'POST'}).then(r => r.json()),
  simHighTemp: () => fetch(`${API_BASE}/simulation/high-temperature`, {method:'POST'}).then(r => r.json()),
  simOpenLid: () => fetch(`${API_BASE}/simulation/open-lid`, {method:'POST'}).then(r => r.json()),
  simCloseLid: () => fetch(`${API_BASE}/simulation/close-lid`, {method:'POST'}).then(r => r.json()),
  simLowLevel: () => fetch(`${API_BASE}/simulation/low-level`, {method:'POST'}).then(r => r.json()),
  simInvalidSensor: () => fetch(`${API_BASE}/simulation/invalid-sensor`, {method:'POST'}).then(r => r.json()),
  simValidSensor: () => fetch(`${API_BASE}/simulation/valid-sensor`, {method:'POST'}).then(r => r.json()),
  simMqttDisconnect: () => fetch(`${API_BASE}/simulation/mqtt-disconnect`, {method:'POST'}).then(r => r.json()),
  simMqttReconnect: () => fetch(`${API_BASE}/simulation/mqtt-reconnect`, {method:'POST'}).then(r => r.json()),
  simSetTemp: (value) => fetch(`${API_BASE}/simulation/set-temp`, {method:'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({value})}).then(r => r.json()),
  simSetLevel: (value) => fetch(`${API_BASE}/simulation/set-level`, {method:'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({value})}).then(r => r.json()),
  
  // MQTT Console
  getMqttMessages: () => fetch(`${API_BASE}/mqtt/messages`).then(r => r.json()),
  publishMqtt: (topic, message) => fetch(`${API_BASE}/mqtt/publish`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({topic, message}) }).then(r => r.json()),
  
  // Adafruit IO
  getAdafruitFeeds: () => fetch(`${API_BASE}/adafruit/feeds`).then(r => r.json()),
};
