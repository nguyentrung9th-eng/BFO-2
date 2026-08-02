import { useState, useEffect } from 'react';

export const useOnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState<number>(0);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsUrl = '';
    
    if (window.location.protocol.includes('extension')) {
      wsUrl = 'wss://bfo-online-2.up.railway.app/api/ws';
    } else {
      wsUrl = window.location.hostname === 'localhost' ? 'ws://localhost:10000/api/ws' : `${protocol}//${window.location.host}/api/ws`;
    }

    let ws: WebSocket;
    let reconnectTimer: any;

    const connect = () => {
      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.online_users !== undefined) {
            setOnlineUsers(data.online_users);
          }
        } catch (e) {
          console.error(e);
        }
      };

      ws.onclose = () => {
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, []);

  return onlineUsers;
};
