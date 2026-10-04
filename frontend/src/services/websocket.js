import { useState, useEffect, useRef } from 'react';

export function useWebSocket() {
  const [lastMessage, setLastMessage] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messageHistory, setMessageHistory] = useState([]);
  const ws = useRef(null);

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      ws.current = new WebSocket(`${protocol}//${host}/ws`);

      ws.current.onopen = () => setIsConnected(true);
      
      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastMessage(data);
          setMessageHistory(prev => {
            const newHistory = [data, ...prev];
            if (newHistory.length > 200) newHistory.length = 200;
            return newHistory;
          });
        } catch (e) {
          console.error("Error parsing websocket message", e);
        }
      };

      ws.current.onclose = () => {
        setIsConnected(false);
        setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  return { lastMessage, isConnected, messageHistory };
}
