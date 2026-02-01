import { useState, useEffect } from 'react';
import { useAPI } from '../../App';
import ActivityFeed from './ActivityFeed';
import MemoryGraph from './MemoryGraph';
import AgentsTable from './AgentsTable';
import RecentMemories from './RecentMemories';
import { Activity, Agent, Memory } from '../../types';
import { demoActivities, demoAgents, demoMemories } from '../../data/demoData';

const DashboardPanel = () => {
  const { baseUrl, apiStatus } = useAPI();
  const [activities, setActivities] = useState<Activity[]>(demoActivities);
  const [agents, setAgents] = useState<Agent[]>(demoAgents);
  const [memories, setMemories] = useState<Memory[]>(demoMemories);
  const [stats, setStats] = useState({ entities: 0, loading: true });

  useEffect(() => {
    if (apiStatus !== 'connected') return;

    // Fetch real data from API
    fetch(`${baseUrl}/api/activity`)
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) setActivities(data);
      })
      .catch(console.error);

    fetch(`${baseUrl}/api/agents`)
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) setAgents(data);
      })
      .catch(console.error);

    fetch(`${baseUrl}/api/memories/recent?days=7`)
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          const formatted = data.map((m: any) => ({
            id: m.id,
            content: m.content || m.keyPoints?.[0] || 'Memory',
            timestamp: m.date,
            relativeTime: m.relativeTime
          }));
          setMemories(formatted);
        }
      })
      .catch(console.error);

    fetch(`${baseUrl}/api/memories/entities`)
      .then(res => res.json())
      .then(data => {
        setStats({ entities: data.entities?.length || 0, loading: false });
      })
      .catch(() => setStats({ entities: 0, loading: false }));

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetch(`${baseUrl}/api/activity`).then(r => r.json()).then(setActivities).catch(console.error);
      fetch(`${baseUrl}/api/agents`).then(r => r.json()).then(setAgents).catch(console.error);
    }, 30000);

    return () => clearInterval(interval);
  }, [apiStatus, baseUrl]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background-panel">
      {/* Top Stats Bar */}
      <div className="px-5 py-2 border-b border-border-subtle flex items-center justify-between bg-background-card">
        <div className="flex items-center gap-6 text-xs font-mono text-text-secondary">
          <span>
            <span className="text-text-primary">{stats.loading ? '...' : stats.entities}</span> entities
          </span>
          <span>|</span>
          <span>
            <span className="text-text-primary">{activities.length}</span> activities
          </span>
          <span>|</span>
          <span>
            <span className="text-text-primary">{agents.length}</span> agents
          </span>
        </div>
        <div className="text-[10px] text-text-muted">
          {apiStatus === 'connected' ? '🟢 Live data' : '⚪ Demo mode'}
        </div>
      </div>

      {/* Top row: Activity + Memory Graph side by side */}
      <div className="flex flex-1 min-h-0">
        {/* Left column: Activity Feed */}
        <div className="w-[40%] border-r border-border-subtle flex flex-col">
          <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Activity Feed</h2>
            <span className="text-[10px] text-text-muted">{activities.length} items</span>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <ActivityFeed activities={activities} />
          </div>
        </div>
        
        {/* Right column: Memory Graph + Agents */}
        <div className="flex-1 flex flex-col">
          {/* Memory Graph */}
          <div className="flex-1 border-b border-border-subtle">
            <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Memory Graph</h2>
              <span className="text-[10px] text-accent-orange animate-pulse">● Live</span>
            </div>
            <div className="h-[calc(100%-44px)]">
              <MemoryGraph apiUrl={baseUrl} />
            </div>
          </div>
          
          {/* Agents Table */}
          <div className="h-[180px] shrink-0">
            <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Active Agents</h2>
              <span className="text-[10px] text-text-muted">{agents.filter(a => a.status === 'run').length} running</span>
            </div>
            <AgentsTable agents={agents} />
          </div>
        </div>
      </div>
      
      {/* Bottom row: Recent Memories */}
      <div className="h-[200px] border-t border-border-subtle shrink-0">
        <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Recent Memories</h2>
          <span className="text-[10px] text-text-muted">{memories.length} recent</span>
        </div>
        <div className="overflow-y-auto scrollbar-thin h-[calc(100%-44px)]">
          <RecentMemories memories={memories} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
