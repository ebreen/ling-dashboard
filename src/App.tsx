import { useState, useEffect, createContext, useContext } from 'react';
import Header from './components/layout/Header';
import ChatPanel from './components/chat/ChatPanel';
import DashboardPanel from './components/dashboard/DashboardPanel';

interface APIContextType {
  baseUrl: string;
  apiStatus: string;
}

const APIContext = createContext<APIContextType>({ baseUrl: 'http://localhost:3001', apiStatus: 'checking' });

export const useAPI = () => useContext(APIContext);

function App() {
  const [apiStatus, setApiStatus] = useState('checking');
  const baseUrl = 'http://localhost:3001';

  useEffect(() => {
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
  }, []);

  return (
    <APIContext.Provider value={{ baseUrl, apiStatus }}>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background-dark">
        <Header apiStatus={apiStatus} />
        <main className="flex-1 flex overflow-hidden">
          <ChatPanel />
          <DashboardPanel />
        </main>
      </div>
    </APIContext.Provider>
  );
}

export default App;
