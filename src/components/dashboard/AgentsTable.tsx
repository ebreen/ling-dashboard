import { Agent } from '../../types';

interface AgentsTableProps {
  agents: Agent[];
}

const AgentsTable = ({ agents }: AgentsTableProps) => {
  return (
    <div className="px-5 py-2">
      <table className="w-full">
        <thead>
          <tr className="text-[10px] text-text-muted uppercase tracking-wider">
            <th className="text-left py-2 font-semibold">Agent</th>
            <th className="text-left py-2 font-semibold">Status</th>
            <th className="text-left py-2 font-semibold">Time</th>
            <th className="text-left py-2 font-semibold">Model</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr 
              key={agent.id} 
              className="hover:bg-background-hover/50 cursor-pointer"
            >
              <td className="py-2 text-xs font-mono text-text-primary">
                {agent.name}
              </td>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    agent.status === 'run' 
                      ? 'bg-accent-green animate-pulse' 
                      : 'bg-text-muted'
                  }`} />
                  <span className="text-xs text-text-secondary">{agent.status}</span>
                </div>
              </td>
              <td className="py-2 text-xs font-mono text-text-secondary">
                {agent.runtime}
              </td>
              <td className="py-2 text-xs font-mono text-text-muted">
                {agent.model}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AgentsTable;
