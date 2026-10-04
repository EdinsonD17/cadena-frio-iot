/**
 * Utilidad compartida de semántica y transición cromática de temperatura.
 * Coincide estrictamente entre la Curva Térmica y el Termómetro.
 */

function interpolateHex(hex1, hex2, factor) {
  const f = Math.max(0, Math.min(1, factor));
  const r1 = parseInt(hex1.substring(1, 3), 16);
  const g1 = parseInt(hex1.substring(3, 5), 16);
  const b1 = parseInt(hex1.substring(5, 7), 16);

  const r2 = parseInt(hex2.substring(1, 3), 16);
  const g2 = parseInt(hex2.substring(3, 5), 16);
  const b2 = parseInt(hex2.substring(5, 7), 16);

  const r = Math.round(r1 + f * (r2 - r1));
  const g = Math.round(g1 + f * (g2 - g1));
  const b = Math.round(b1 + f * (b2 - b1));

  return `rgb(${r}, ${g}, ${b})`;
}

export function getTemperatureState(temperature, config = {}) {
  const hasData = temperature !== null && temperature !== undefined && !isNaN(Number(temperature));
  if (!hasData) {
    return {
      hasData: false,
      color: '#94A3B8',
      statusText: 'Sin telemetría',
      badgeClass: 'badge-muted',
      statusKey: 'NO_DATA'
    };
  }

  const temp = Number(temperature);
  const coolingOff = config?.temperature_cooling_off ?? 3.5;
  const target = config?.temperature_target ?? 4.0;
  const warning = config?.temperature_warning ?? 6.0;

  // 1. Por debajo del objetivo (< 3.5 °C): Azul frío
  if (temp < coolingOff) {
    return {
      hasData: true,
      color: '#0284C7', // Azul frío
      statusText: 'Bajo objetivo',
      badgeClass: 'badge-cyan',
      statusKey: 'LOW'
    };
  }

  // 2. Dentro del objetivo (3.5 a 4.0 °C): Cian
  if (temp <= target) {
    return {
      hasData: true,
      color: '#00F0FF', // Cian
      statusText: 'En rango objetivo',
      badgeClass: 'badge-cyan',
      statusKey: 'OPTIMAL'
    };
  }

  // 3. Por encima del objetivo y hasta el límite (4.0 a 6.0 °C): Transición suave de ámbar a naranja
  if (temp <= warning) {
    const ratio = (temp - target) / Math.max(0.01, (warning - target));
    const color = interpolateHex('#F59E0B', '#EA580C', ratio);
    return {
      hasData: true,
      color: color,
      statusText: 'Sobre objetivo',
      badgeClass: 'badge-warning',
      statusKey: 'WARNING'
    };
  }

  // 4. Sobre el límite (> 6.0 °C): Rojo
  return {
    hasData: true,
    color: '#EF4444', // Rojo
    statusText: 'Fuera de rango',
    badgeClass: 'badge-critical',
    statusKey: 'CRITICAL'
  };
}
