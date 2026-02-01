import { Brain, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  wsStatus?: string;
}

const Header = ({ wsStatus }: HeaderProps) => {
  return (
    <header className="h-[60px] bg-background-panel border-b border-border-subtle flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-accent-orange" />
          <span className="text-sm font-semibold text-text-primary">Blanco</span>
        </div>
        
        <nav className="flex items-center gap-6">
          {['Files', 'Graph', 'Costs', 'Cascade'].map((tab, idx) => (
            <button
              key={tab}
              className={`text-sm font-medium transition-colors ${
                idx === 0 
                  ? 'text-text-primary' 
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>
      
      <div className="flex items-center gap-4 font-mono text-xs text-text-secondary">
        {/* Connection Status */}
        <div className="flex items-center gap-2 mr-2">
          {wsStatus === 'connected' ? (
            <Wifi className="w-3 h-3 text-accent-green" />
          ) : (
            <WifiOff className="w-3 h-3 text-text-muted" />
          )}
          <span className={wsStatus === 'connected' ? 'text-accent-green' : 'text-text-muted'}>
            {wsStatus === 'connected' ? 'live' : wsStatus}
          </span>
        </div>
        
        <span>|</span>
        <span className="text-accent-orange">opus</span>
        <span>|</span>
        <span><span className="text-text-primary">572</span> memories</span>
        <span>|</span>
        <span><span className="text-text-primary">228</span> episodes</span>
        <span>|</span>
        <span>— today</span>
        <span>|</span>
        <span>next: <span className="text-text-primary">9:00pm</span></span>
        <span>|</span>
        <span className="text-text-primary">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      </div>
    </header>
  );
};

export default Header;
