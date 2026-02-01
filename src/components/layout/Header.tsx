import { Brain, Circle } from 'lucide-react';

interface HeaderProps {
  apiStatus?: string;
}

const Header = ({ apiStatus }: HeaderProps) => {
  return (
    <header className="h-[60px] bg-background-panel border-b border-border-subtle flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <Brain className="w-6 h-6 text-accent-orange" />
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
        {apiStatus && (
          <>
            <Circle className={`w-2 h-2 ${apiStatus === 'connected' ? 'text-accent-green fill-accent-green' : 'text-text-muted'}`} />
            <span className={apiStatus === 'connected' ? 'text-accent-green' : 'text-text-muted'}>
              {apiStatus === 'connected' ? 'live' : apiStatus}
            </span>
            <span>|</span>
          </>
        )}
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
