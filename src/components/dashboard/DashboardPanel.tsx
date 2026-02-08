import { useState, useEffect, useCallback } from 'react';
import { useAPI } from '../../App';
import ActivityFeed from './ActivityFeed';
import MemoryGraph from './MemoryGraph';
import AgentsTable from './AgentsTable';
import RecentMemories from './RecentMemories';
import TaskBoard from './TaskBoard';
import { Activity, Agent, Memory, TaskBoardColumns, TaskBoardTask, TaskBoardStatus } from '../../types';
import { demoActivities, demoAgents, demoMemories } from '../../data/demoData';

interface MissionOverview {
  summary?: {
    tasks?: {
      inbox?: number;
      assigned?: number;
      inProgress?: number;
      review?: number;
      done?: number;
      blocked?: number;
    };
    realtimeTeams?: number;
    asyncAgents?: number;
    subAgentsRunning?: number;
    tokenSpendToday?: number;
  };
  timeline?: Array<{
    id: number | string;
    type: string;
    message: string;
    createdAt?: string;
    metadata?: Record<string, unknown>;
  }>;
}

interface AgentRuntimeBucket {
  running: number;
  idle: number;
  total: number;
}

interface MissionAgentsSummaryResponse {
  summary?: {
    runtime?: {
      realtime?: Partial<AgentRuntimeBucket>;
      async?: Partial<AgentRuntimeBucket>;
    };
  };
}

interface AgentRuntimeSummary {
  realtime: AgentRuntimeBucket;
  async: AgentRuntimeBucket;
}

type RawTask = {
  id?: string | number;
  title?: string;
  name?: string;
  assignee?: string | { name?: string; username?: string };
  assigneeName?: string;
};

type TaskBoardApiPayload = Partial<Record<TaskBoardStatus, RawTask[]>> & {
  columns?: Partial<Record<TaskBoardStatus, RawTask[]>>;
  board?: Partial<Record<TaskBoardStatus, RawTask[]>>;
};

const EMPTY_TASK_COLUMNS: TaskBoardColumns = {
  inbox: [],
  assigned: [],
  inProgress: [],
  review: [],
  done: [],
  blocked: [],
};

const EMPTY_AGENT_RUNTIME: AgentRuntimeSummary = {
  realtime: { running: 0, idle: 0, total: 0 },
  async: { running: 0, idle: 0, total: 0 },
};

const TASK_STATUSES: TaskBoardStatus[] = ['inbox', 'assigned', 'inProgress', 'review', 'done', 'blocked'];

const getAssigneeName = (task: RawTask, index: number) => {
  if (task.assigneeName) return task.assigneeName;
  if (typeof task.assignee === 'string' && task.assignee.trim()) return task.assignee;
  if (typeof task.assignee === 'object' && task.assignee) {
    if (task.assignee.name) return task.assignee.name;
    if (task.assignee.username) return task.assignee.username;
  }

  return `unassigned-${index + 1}`;
};

const normalizeTaskBoardPayload = (payload: TaskBoardApiPayload): TaskBoardColumns => {
  const normalized: TaskBoardColumns = { ...EMPTY_TASK_COLUMNS };

  TASK_STATUSES.forEach((status) => {
    const source = payload[status] || payload.columns?.[status] || payload.board?.[status] || [];
    normalized[status] = source.map((task, index): TaskBoardTask => ({
      id: String(task.id ?? `${status}-${index}`),
      title: task.title || task.name || 'Untitled task',
      assigneeName: getAssigneeName(task, index),
    }));
  });

  return normalized;
};

const isAgentRunning = (agent: Agent & { runState?: string; status?: string }) => {
  const status = `${agent.status || ''}`.toLowerCase();
  const runState = `${agent.runState || ''}`.toLowerCase();
  return status === 'run' || status === 'running' || status === 'active' || runState === 'running' || runState === 'run';
};

const DashboardPanel = () => {
  const { baseUrl, wsUrl, apiStatus } = useAPI();
  const [activities, setActivities] = useState<Activity[]>(demoActivities);
  const [agents, setAgents] = useState<Agent[]>(demoAgents);
  const [memories, setMemories] = useState<Memory[]>(demoMemories);
  const [taskBoard, setTaskBoard] = useState<TaskBoardColumns>(EMPTY_TASK_COLUMNS);
  const [agentRuntime, setAgentRuntime] = useState<AgentRuntimeSummary>(EMPTY_AGENT_RUNTIME);
  const [stats, setStats] = useState({ entities: 0, loading: true, totalTasks: 0 });

  const applyOverview = useCallback((overview: MissionOverview) => {
    const timeline = overview.timeline || [];

    const nextActivities: Activity[] = timeline.map((item) => ({
      id: `act-${item.id}`,
      type: item.type.startsWith('task_') ? 'MAIN' : 'CRON',
      name: item.message,
      date: (item.createdAt || new Date().toISOString()).split(' ')[0].split('T')[0],
    }));

    const nextMemories: Memory[] = timeline.slice(0, 8).map((item) => ({
      id: `mem-${item.id}`,
      content: item.message,
      timestamp: item.createdAt || new Date().toISOString(),
      relativeTime: 'just now',
    }));

    const tasks = overview.summary?.tasks || {};
    const totalTasks =
      (tasks.inbox || 0) +
      (tasks.assigned || 0) +
      (tasks.inProgress || 0) +
      (tasks.review || 0) +
      (tasks.done || 0) +
      (tasks.blocked || 0);

    setActivities(nextActivities.length > 0 ? nextActivities : demoActivities);
    setMemories(nextMemories.length > 0 ? nextMemories : demoMemories);
    setStats((prev) => ({
      ...prev,
      totalTasks,
      entities: totalTasks + agents.length,
      loading: false,
    }));
  }, [agents.length]);

  const fetchMissionData = useCallback(async () => {
    if (apiStatus !== 'connected') return;

    try {
      const [overviewRes, agentsRes, taskBoardRes, agentsSummaryRes] = await Promise.all([
        fetch(`${baseUrl}/mission/overview`),
        fetch(`${baseUrl}/agents`),
        fetch(`${baseUrl}/mission/tasks-board`),
        fetch(`${baseUrl}/mission/agents-summary`),
      ]);

      if (overviewRes.ok) {
        const overview = await overviewRes.json();
        applyOverview(overview);
      }

      if (agentsRes.ok) {
        const agentsJson = await agentsRes.json();
        if (Array.isArray(agentsJson.agents) && agentsJson.agents.length > 0) {
          setAgents(agentsJson.agents);
        }
      }

      if (taskBoardRes.ok) {
        const boardPayload = await taskBoardRes.json();
        setTaskBoard(normalizeTaskBoardPayload(boardPayload as TaskBoardApiPayload));
      }

      if (agentsSummaryRes.ok) {
        const summaryPayload = (await agentsSummaryRes.json()) as MissionAgentsSummaryResponse;
        const runtime = summaryPayload.summary?.runtime;
        if (runtime) {
          setAgentRuntime({
            realtime: {
              running: runtime.realtime?.running || 0,
              idle: runtime.realtime?.idle || 0,
              total: runtime.realtime?.total || 0,
            },
            async: {
              running: runtime.async?.running || 0,
              idle: runtime.async?.idle || 0,
              total: runtime.async?.total || 0,
            },
          });
        }
      }
    } catch (error) {
      console.error('Mission fetch failed:', error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  }, [apiStatus, baseUrl, applyOverview]);

  useEffect(() => {
    fetchMissionData();

    if (apiStatus !== 'connected') return;

    const interval = setInterval(fetchMissionData, 30000);

    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'mission_overview' && payload.payload) {
            applyOverview(payload.payload as MissionOverview);
          }
          if (payload.type === 'tasks_board' && payload.payload) {
            setTaskBoard(normalizeTaskBoardPayload(payload.payload as TaskBoardApiPayload));
          }
        } catch {
          // ignore malformed packets
        }
      };
    } catch {
      // websocket optional
    }

    return () => {
      clearInterval(interval);
      if (ws && ws.readyState === WebSocket.OPEN) ws.close();
    };
  }, [apiStatus, wsUrl, fetchMissionData, applyOverview]);

  useEffect(() => {
    if (apiStatus === 'connected' && (agentRuntime.realtime.total > 0 || agentRuntime.async.total > 0)) return;

    const runningCount = agents.filter((agent) => isAgentRunning(agent)).length;
    const idleCount = Math.max(agents.length - runningCount, 0);

    setAgentRuntime((prev) => ({
      realtime: prev.realtime.total > 0 ? prev.realtime : { running: 0, idle: 0, total: 0 },
      async: prev.async.total > 0 ? prev.async : { running: runningCount, idle: idleCount, total: agents.length },
    }));
  }, [agents, apiStatus, agentRuntime.realtime.total, agentRuntime.async.total]);

  const runningAgentsTotal = agentRuntime.realtime.running + agentRuntime.async.running;

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
            <span className="text-text-primary">{stats.totalTasks}</span> tasks
          </span>
          <span>|</span>
          <span>
            <span className="text-text-primary">{agents.length}</span> agents
          </span>
          <span>|</span>
          <span>
            RT <span className="text-text-primary">{agentRuntime.realtime.running}</span>/<span className="text-text-primary">{agentRuntime.realtime.idle}</span> run/idle
          </span>
          <span>|</span>
          <span>
            ASYNC <span className="text-text-primary">{agentRuntime.async.running}</span>/<span className="text-text-primary">{agentRuntime.async.idle}</span> run/idle
          </span>
        </div>
        <div className="text-[10px] text-text-muted">
          {apiStatus === 'connected' ? '🟢 Vortex live' : '⚪ Demo mode'}
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
            <ActivityFeed
              activities={activities}
              onSessionClick={(sessionId) => {
                window.dispatchEvent(new CustomEvent('load-session', { detail: sessionId }));
              }}
            />
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
              <span className="text-[10px] text-text-muted">
                {runningAgentsTotal} running • RT {agentRuntime.realtime.running}/{agentRuntime.realtime.idle} • AS {agentRuntime.async.running}/{agentRuntime.async.idle}
              </span>
            </div>
            <AgentsTable agents={agents} />
          </div>
        </div>
      </div>

      {/* Task board row */}
      <div className="h-[250px] border-t border-border-subtle shrink-0">
        <div className="px-5 py-3 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Task Board</h2>
          <span className="text-[10px] text-text-muted">/mission/tasks-board</span>
        </div>
        <div className="h-[calc(100%-44px)]">
          <TaskBoard columns={taskBoard} />
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
