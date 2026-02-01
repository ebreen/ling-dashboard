import { useState, useEffect, createContext, useContext, useRef } from 'react';
import Header from './components/layout/Header';
import ChatPanel from './components/chat/ChatPanel';
import DashboardPanel from './components/dashboard/DashboardPanel';

interface APIContextType {
  baseUrl: string;
  apiStatus: string;
  wsStatus: string;
  wsSend: (data: any) => void;
}

const APIContext = createContext<APIContextType>({ 
  baseUrl: 'http://localhost:3001', 
  apiStatus: 'checking',
  wsStatus: 'disconnected',
  wsSend: () => {}
});

export const useAPI = () => useContext(APIContext);

function App() {
  const [apiStatus, setApiStatus] = useState('checking');
  const [wsStatus, setWsStatus] = useState('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const baseUrl = 'http://localhost:3001';
  const wsUrl = 'ws://localhost:3001';

  useEffect(() => {
    // Check HTTP API
    fetch(`${baseUrl}/api/health`)
      .then(res => res.json())
      .then(data => {
        console.log('API Connected:', data);
        setApiStatus('connected');
      })
      .catch(() => {
        console.log('API not available, using demo mode');
        setApiStatus('offline');
      });

    // Connect WebSocket
    const connectWebSocket = () => {
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setWsStatus('connected');
        ws.send(JSON.stringify({ type: 'subscribe', channels: ['chat', 'updates'] }));
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setWsStatus('disconnected');
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsStatus('error');
      };
      
      wsRef.current = ws;
    };

    connectWebSocket();

    return () => {
      wsRef.current?.close();
    };
  }, []);

  const wsSend = (data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  };

  return (
    <APIContext.Provider value={{ baseUrl, apiStatus, wsStatus, wsSend }}>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background-dark">
        <Header wsStatus={wsStatus} />
        <main className="flex-1 flex overflow-hidden">
          <ChatPanel />
          <DashboardPanel />
        </main>
      </div>
    </APIContext.Provider>
  );
}

export default App;
