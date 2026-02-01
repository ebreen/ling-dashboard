import ActivityFeed from './ActivityFeed';
import MemoryGraph from './MemoryGraph';
import AgentsTable from './AgentsTable';
import RecentMemories from './RecentMemories';
import { demoActivities, demoAgents, demoMemories } from '../../data/demoData';

const DashboardPanel = () => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background-panel">
      {/* Top row: Activity + Memory Graph side by side */}
      <div className="flex flex-1 min-h-0">
        {/* Left column: Activity Feed */}
        <div className="w-[40%] border-r border-border-subtle flex flex-col">
          <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Activity</h2>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            <ActivityFeed activities={demoActivities} />
          </div>
        </div>
        
        {/* Right column: Memory Graph + Agents */}
        <div className="flex-1 flex flex-col">
          {/* Memory Graph */}
          <div className="flex-1 border-b border-border-subtle">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Memory Graph</h2>
            </div>
            <div className="h-[calc(100%-52px)]">
              <MemoryGraph />
            </div>
          </div>
          
          {/* Agents Table */}
          <div className="h-[160px] shrink-0">
            <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Agents</h2>
            </div>
            <AgentsTable agents={demoAgents} />
          </div>
        </div>
      </div>
      
      {/* Bottom row: Recent Memories */}
      <div className="h-[180px] border-t border-border-subtle shrink-0">
        <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Recent Memories</h2>
        </div>
        <div className="overflow-y-auto scrollbar-thin h-[calc(100%-44px)]">
          <RecentMemories memories={demoMemories} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPanel;
