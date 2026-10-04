import { useState, useEffect } from 'react';
import { api } from '../services/api';

const DEFAULT_CONFIG = {
  temperature_cooling_off: 3.5,
  temperature_target: 4.0,
  temperature_warning: 6.0,
};

export function useThresholds() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isDefaultConfig, setIsDefaultConfig] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let didResolve = false;

    const timer = setTimeout(() => {
      if (isMounted && !didResolve) {
        setIsDefaultConfig(true);
      }
    }, 2000);

    api.getConfiguration()
      .then(cfg => {
        didResolve = true;
        if (isMounted) {
          if (cfg && (cfg.temperature_target != null || cfg.temperature_warning != null)) {
            setConfig({
              temperature_cooling_off: Number(cfg.temperature_cooling_off ?? 3.5),
              temperature_target: Number(cfg.temperature_target ?? 4.0),
              temperature_warning: Number(cfg.temperature_warning ?? 6.0),
            });
            setIsDefaultConfig(false);
          } else {
            setIsDefaultConfig(true);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsDefaultConfig(true);
        }
      });

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, []);

  return { config, isDefaultConfig };
}
