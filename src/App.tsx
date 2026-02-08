import { useState, useEffect, createContext, useContext } from 'react';
import Header from './components/layout/Header';
import ChatPanel from './components/chat/ChatPanel';
import DashboardPanel from './components/dashboard/DashboardPanel';
import { MessageProvider, useMessages } from './context/MessageContext';

// API context for Vortex Mission Control requests
interface APIContextType {
  baseUrl: string;
  wsUrl: string;
  apiStatus: 'checking' | 'connected' | 'offline';
}

const APIContext = createContext<APIContextType>({
  baseUrl: 'http://localhost:8787',
  wsUrl: 'ws://localhost:8787/ws',
  apiStatus: 'checking',
});

export const useAPI = () => useContext(APIContext);

// Inner app component that uses MessageProvider
function AppContent() {
  const [activeTab, setActiveTab] = useState('CHAT');
  const { connectionStatus } = useMessages();

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background-dark">
      <Header wsStatus={connectionStatus} />
      <main className="flex-1 flex overflow-hidden">
        <ChatPanel activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="hidden md:block">
          <DashboardPanel />
        </div>
      </main>
    </div>
  );
}

function App() {
  const [apiStatus, setApiStatus] = useState<'checking' | 'connected' | 'offline'>('checking');

  // Existing chat backend (legacy ling-dashboard stack)
  const chatBaseUrl =
    window.location.hostname === 'localhost'
      ? 'http://localhost:3001'
      : `http://${window.location.host}`;

  const chatWsUrl =
    window.location.hostname === 'localhost'
      ? 'ws://localhost:3001'
      : `ws://${window.location.host}`;

  // New Vortex backend
  const vortexBaseUrl =
    window.location.hostname === 'localhost'
      ? 'http://localhost:8787'
      : `http://${window.location.hostname}:8787`;

  const vortexWsUrl =
    window.location.hostname === 'localhost'
      ? 'ws://localhost:8787/ws'
      : `ws://${window.location.hostname}:8787/ws`;

  // Check Vortex API health on mount
  useEffect(() => {
    fetch(`${vortexBaseUrl}/health`)
      .then((res) => res.json())
      .then((data) => {
        console.log('Vortex API Connected:', data);
        setApiStatus('connected');
      })
      .catch(() => {
        console.log('Vortex API not available, dashboard demo mode');
        setApiStatus('offline');
      });
  }, [vortexBaseUrl]);

  return (
    <APIContext.Provider value={{ baseUrl: vortexBaseUrl, wsUrl: vortexWsUrl, apiStatus }}>
      <MessageProvider baseUrl={chatBaseUrl} wsUrl={chatWsUrl}>
        <AppContent />
      </MessageProvider>
    </APIContext.Provider>
  );
}

export default App;
