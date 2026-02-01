import Header from './components/layout/Header';
import ChatPanel from './components/chat/ChatPanel';
import DashboardPanel from './components/dashboard/DashboardPanel';

function App() {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background-dark">
      <Header />
      <main className="flex-1 flex overflow-hidden">
        <ChatPanel />
        <DashboardPanel />
      </main>
    </div>
  );
}

export default App;
