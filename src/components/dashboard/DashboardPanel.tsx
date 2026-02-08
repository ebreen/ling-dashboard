import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useAPI } from '../../App';
import ActivityFeed from './ActivityFeed';
import MemoryGraph from './MemoryGraph';
import AgentsTable from './AgentsTable';
import RecentMemories from './RecentMemories';
import TaskBoard from './TaskBoard';
import { Activity, Agent, Memory, TaskBoardColumns, TaskBoardTask, TaskBoardStatus } from '../../types';
import { demoActivities, demoAgents, demoMemories } from '../../data/demoData';

type MissionControlWsStatus = 'connected' | 'reconnecting' | 'disconnected';

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

interface TeamRuntimeSummary {
  teamCount: number;
  activeTeams: number;
  pending: number;
  claimed: number;
  completed: number;
  total: number;
}

interface TeamRuntimeTeam {
  id: string;
  name: string;
  status: string;
  agentCount: number;
  handoffs: {
    pending: number;
    claimed: number;
    completed: number;
    total: number;
  };
}

interface TeamRuntimeRecent {
  id: string;
  teamName: string;
  state: string;
  updatedAt: string;
}

interface TeamRuntimeResponse {
  summary?: Partial<TeamRuntimeSummary>;
  teams?: TeamRuntimeTeam[];
  recent?: TeamRuntimeRecent[];
}

type MissionRuntime = NonNullable<NonNullable<MissionAgentsSummaryResponse['summary']>['runtime']>;

type RawTask = {
  id?: string | number;
  companyId?: string;
  title?: string;
  name?: string;
  status?: string;
  assigneeId?: string | null;
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

const EMPTY_TEAM_RUNTIME_SUMMARY: TeamRuntimeSummary = {
  teamCount: 0,
  activeTeams: 0,
  pending: 0,
  claimed: 0,
  completed: 0,
  total: 0,
};

const TASK_STATUSES: TaskBoardStatus[] = ['inbox', 'assigned', 'inProgress', 'review', 'done', 'blocked'];
const API_STATUS_BY_BOARD: Record<TaskBoardStatus, string> = {
  inbox: 'inbox',
  assigned: 'assigned',
  inProgress: 'in_progress',
  review: 'review',
  done: 'done',
  blocked: 'blocked',
};
const TASK_STATUS_FLOW: TaskBoardStatus[] = ['inbox', 'assigned', 'inProgress', 'review', 'done'];
const DEFAULT_COMPANY_ID = 'kirie-ai';
const DEFAULT_HANDOFF_TYPE = 'handoff.message';

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
      assigneeId: task.assigneeId ?? null,
      status: task.status,
      companyId: task.companyId,
    }));
  });

  return normalized;
};

const isAgentRunning = (agent: Agent & { runState?: string; status?: string }) => {
  const status = `${agent.status || ''}`.toLowerCase();
  const runState = `${agent.runState || ''}`.toLowerCase();
  return status === 'run' || status === 'running' || status === 'active' || runState === 'running' || runState === 'run';
};

const toRuntimeBucket = (bucket?: Partial<AgentRuntimeBucket>): AgentRuntimeBucket => ({
  running: bucket?.running || 0,
  idle: bucket?.idle || 0,
  total: bucket?.total || 0,
});

const findTaskColumn = (columns: TaskBoardColumns, taskId: string): TaskBoardStatus | null => {
  for (const status of TASK_STATUSES) {
    if (columns[status].some((task) => task.id === taskId)) return status;
  }
  return null;
};

const moveTaskInColumns = (
  columns: TaskBoardColumns,
  taskId: string,
  targetStatus: TaskBoardStatus,
  mutate?: (task: TaskBoardTask) => TaskBoardTask,
): TaskBoardColumns => {
  const next: TaskBoardColumns = {
    inbox: [...columns.inbox],
    assigned: [...columns.assigned],
    inProgress: [...columns.inProgress],
    review: [...columns.review],
    done: [...columns.done],
    blocked: [...columns.blocked],
  };

  let movedTask: TaskBoardTask | null = null;
  for (const status of TASK_STATUSES) {
    const idx = next[status].findIndex((task) => task.id === taskId);
    if (idx >= 0) {
      movedTask = next[status][idx];
      next[status].splice(idx, 1);
      break;
    }
  }

  if (!movedTask) return columns;

  const finalTask = mutate ? mutate(movedTask) : movedTask;
  next[targetStatus] = [finalTask, ...next[targetStatus]];
  return next;
};

const DashboardPanel = () => {
  const { baseUrl, wsUrl, apiStatus } = useAPI();
  const [activities, setActivities] = useState<Activity[]>(demoActivities);
  const [agents, setAgents] = useState<Agent[]>(demoAgents);
  const [memories, setMemories] = useState<Memory[]>(demoMemories);
  const [taskBoard, setTaskBoard] = useState<TaskBoardColumns>(EMPTY_TASK_COLUMNS);
  const [agentRuntime, setAgentRuntime] = useState<AgentRuntimeSummary>(EMPTY_AGENT_RUNTIME);
  const [teamRuntimeSummary, setTeamRuntimeSummary] = useState<TeamRuntimeSummary>(EMPTY_TEAM_RUNTIME_SUMMARY);
  const [teamRuntimeRecent, setTeamRuntimeRecent] = useState<TeamRuntimeRecent[]>([]);
  const [teamRuntimeTeams, setTeamRuntimeTeams] = useState<TeamRuntimeTeam[]>([]);
  const [stats, setStats] = useState({ entities: 0, loading: true, totalTasks: 0 });
  const [teamNameInput, setTeamNameInput] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [handoffTargetAgentId, setHandoffTargetAgentId] = useState('');
  const [handoffMessage, setHandoffMessage] = useState('');
  const [teamControlBusy, setTeamControlBusy] = useState<'create' | 'attach' | 'handoff' | null>(null);
  const [teamControlNotice, setTeamControlNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [missionControlWsStatus, setMissionControlWsStatus] = useState<MissionControlWsStatus>('disconnected');
  const [lastRealtimeUpdateAt, setLastRealtimeUpdateAt] = useState<string | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());

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

  const applyAgentRuntimeSummary = useCallback((summaryPayload: MissionAgentsSummaryResponse) => {
    const runtime = summaryPayload.summary?.runtime;
    if (!runtime) return;

    setAgentRuntime({
      realtime: toRuntimeBucket(runtime.realtime),
      async: toRuntimeBucket(runtime.async),
    });
  }, []);

  const applyTeamRuntime = useCallback((payload: TeamRuntimeResponse) => {
    setTeamRuntimeSummary({
      teamCount: payload.summary?.teamCount ?? 0,
      activeTeams: payload.summary?.activeTeams ?? 0,
      pending: payload.summary?.pending ?? 0,
      claimed: payload.summary?.claimed ?? 0,
      completed: payload.summary?.completed ?? 0,
      total: payload.summary?.total ?? 0,
    });

    const recent = Array.isArray(payload.recent) ? payload.recent.slice(0, 6) : [];
    setTeamRuntimeRecent(recent);
    setTeamRuntimeTeams(Array.isArray(payload.teams) ? payload.teams : []);
  }, []);

  const fetchMissionData = useCallback(async () => {
    if (apiStatus !== 'connected') return;

    try {
      const [overviewRes, agentsRes, taskBoardRes, agentsSummaryRes, teamRuntimeRes] = await Promise.all([
        fetch(`${baseUrl}/mission/overview`),
        fetch(`${baseUrl}/agents`),
        fetch(`${baseUrl}/mission/tasks-board`),
        fetch(`${baseUrl}/mission/agents-summary`),
        fetch(`${baseUrl}/mission/team-runtime`),
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
        applyAgentRuntimeSummary(summaryPayload);
      }

      if (teamRuntimeRes.ok) {
        const teamRuntimePayload = (await teamRuntimeRes.json()) as TeamRuntimeResponse;
        applyTeamRuntime(teamRuntimePayload);
      }
    } catch (error) {
      console.error('Mission fetch failed:', error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  }, [apiStatus, baseUrl, applyOverview, applyAgentRuntimeSummary, applyTeamRuntime]);

  useEffect(() => {
    fetchMissionData();

    if (apiStatus !== 'connected') {
      setMissionControlWsStatus('disconnected');
      return;
    }

    const interval = setInterval(fetchMissionData, 30000);

    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let shouldReconnect = true;

    const scheduleReconnect = () => {
      if (!shouldReconnect) return;
      setMissionControlWsStatus('reconnecting');
      reconnectTimer = window.setTimeout(connectWebSocket, 2500);
    };

    const connectWebSocket = () => {
      if (!shouldReconnect) return;

      setMissionControlWsStatus((prev) => (prev === 'connected' ? 'connected' : 'reconnecting'));

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setMissionControlWsStatus('connected');
        };

        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            let hasRealtimeUpdate = false;

            if (payload.type === 'mission_overview' && payload.payload) {
              applyOverview(payload.payload as MissionOverview);
              hasRealtimeUpdate = true;
            }
            if (payload.type === 'tasks_board' && payload.payload) {
              setTaskBoard(normalizeTaskBoardPayload(payload.payload as TaskBoardApiPayload));
              hasRealtimeUpdate = true;
            }
            if (payload.type === 'agents_summary' && payload.payload) {
              const incoming = payload.payload as Record<string, unknown>;

              if ((incoming as MissionAgentsSummaryResponse).summary?.runtime) {
                applyAgentRuntimeSummary(incoming as MissionAgentsSummaryResponse);
                hasRealtimeUpdate = true;
              } else if (incoming.runtime || incoming.realtime || incoming.async) {
                applyAgentRuntimeSummary({
                  summary: {
                    runtime: (incoming.runtime || incoming) as MissionRuntime,
                  },
                });
                hasRealtimeUpdate = true;
              }
            }
            if (payload.type === 'team_runtime' && payload.payload) {
              applyTeamRuntime(payload.payload as TeamRuntimeResponse);
              hasRealtimeUpdate = true;
            }

            if (hasRealtimeUpdate) {
              setLastRealtimeUpdateAt(new Date().toISOString());
            }
          } catch {
            // ignore malformed packets
          }
        };

        ws.onerror = () => {
          ws?.close();
        };

        ws.onclose = () => {
          if (!shouldReconnect) {
            setMissionControlWsStatus('disconnected');
            return;
          }

          scheduleReconnect();
        };
      } catch {
        scheduleReconnect();
      }
    };

    connectWebSocket();

    return () => {
      shouldReconnect = false;
      clearInterval(interval);
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) ws.close();
      setMissionControlWsStatus('disconnected');
    };
  }, [apiStatus, wsUrl, fetchMissionData, applyOverview, applyAgentRuntimeSummary, applyTeamRuntime]);

  useEffect(() => {
    if (apiStatus === 'connected' && (agentRuntime.realtime.total > 0 || agentRuntime.async.total > 0)) return;

    const runningCount = agents.filter((agent) => isAgentRunning(agent)).length;
    const idleCount = Math.max(agents.length - runningCount, 0);

    setAgentRuntime((prev) => ({
      realtime: prev.realtime.total > 0 ? prev.realtime : { running: 0, idle: 0, total: 0 },
      async: prev.async.total > 0 ? prev.async : { running: runningCount, idle: idleCount, total: agents.length },
    }));
  }, [agents, apiStatus, agentRuntime.realtime.total, agentRuntime.async.total]);

  useEffect(() => {
    if (!selectedTeamId && teamRuntimeTeams.length > 0) {
      setSelectedTeamId(teamRuntimeTeams[0].id);
    }
  }, [teamRuntimeTeams, selectedTeamId]);

  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id);
      setHandoffTargetAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  const createTask = useCallback(async (title: string) => {
    if (apiStatus !== 'connected') throw new Error('Vortex API offline');

    setCreatingTask(true);
    try {
      const res = await fetch(`${baseUrl}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: DEFAULT_COMPANY_ID, title }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Create task failed');
      }

      const payload = await res.json();
      const createdTask = payload.task as RawTask;
      setTaskBoard((prev) => ({
        ...prev,
        inbox: [{
          id: String(createdTask.id),
          title: createdTask.title || title,
          assigneeName: getAssigneeName(createdTask, 0),
          assigneeId: createdTask.assigneeId ?? null,
          status: createdTask.status,
          companyId: createdTask.companyId || DEFAULT_COMPANY_ID,
        }, ...prev.inbox],
      }));
      await fetchMissionData();
    } finally {
      setCreatingTask(false);
    }
  }, [apiStatus, baseUrl, fetchMissionData]);

  const assignTask = useCallback(async (task: TaskBoardTask, agentId: string) => {
    if (apiStatus !== 'connected') throw new Error('Vortex API offline');

    const agent = agents.find((item) => item.id === agentId);
    setPendingTaskIds((prev) => new Set(prev).add(task.id));

    const previousBoard = taskBoard;
    setTaskBoard((prev) =>
      moveTaskInColumns(prev, task.id, 'assigned', (item) => ({
        ...item,
        assigneeId: agentId,
        assigneeName: agent?.name || item.assigneeName,
        status: 'assigned',
      }))
    );

    try {
      const res = await fetch(`${baseUrl}/tasks/${task.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Assign failed');
      }

      await fetchMissionData();
    } catch (error) {
      setTaskBoard(previousBoard);
      throw error;
    } finally {
      setPendingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }, [apiStatus, agents, baseUrl, fetchMissionData, taskBoard]);

  const moveTask = useCallback(async (task: TaskBoardTask, direction: 'backward' | 'forward') => {
    if (apiStatus !== 'connected') throw new Error('Vortex API offline');

    const from = findTaskColumn(taskBoard, task.id);
    if (!from) return;

    const flowIdx = TASK_STATUS_FLOW.indexOf(from);
    if (flowIdx < 0) return;

    const targetIdx = direction === 'forward' ? flowIdx + 1 : flowIdx - 1;
    if (targetIdx < 0 || targetIdx >= TASK_STATUS_FLOW.length) return;

    const targetStatus = TASK_STATUS_FLOW[targetIdx];
    const apiStatusValue = API_STATUS_BY_BOARD[targetStatus];

    setPendingTaskIds((prev) => new Set(prev).add(task.id));

    const previousBoard = taskBoard;
    setTaskBoard((prev) => moveTaskInColumns(prev, task.id, targetStatus, (item) => ({ ...item, status: apiStatusValue })));

    try {
      const res = await fetch(`${baseUrl}/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: apiStatusValue, agentId: task.assigneeId ?? null }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Status update failed');
      }

      await fetchMissionData();
    } catch (error) {
      setTaskBoard(previousBoard);
      throw error;
    } finally {
      setPendingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
    }
  }, [apiStatus, baseUrl, fetchMissionData, taskBoard]);

  const createTeam = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (apiStatus !== 'connected') {
      setTeamControlNotice({ type: 'error', text: 'Vortex API offline' });
      return;
    }

    const name = teamNameInput.trim();
    if (!name) {
      setTeamControlNotice({ type: 'error', text: 'Team name is required' });
      return;
    }

    setTeamControlBusy('create');
    setTeamControlNotice(null);

    try {
      const res = await fetch(`${baseUrl}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Create team failed');
      }

      const payload = await res.json();
      const createdTeamId = String(payload.team?.id || payload.id || '');
      if (createdTeamId) setSelectedTeamId(createdTeamId);
      setTeamNameInput('');
      setTeamControlNotice({ type: 'ok', text: 'Team created' });
      await fetchMissionData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Create team failed';
      setTeamControlNotice({ type: 'error', text: message });
    } finally {
      setTeamControlBusy(null);
    }
  }, [apiStatus, baseUrl, fetchMissionData, teamNameInput]);

  const attachAgentToTeam = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (apiStatus !== 'connected') {
      setTeamControlNotice({ type: 'error', text: 'Vortex API offline' });
      return;
    }

    if (!selectedTeamId || !selectedAgentId) {
      setTeamControlNotice({ type: 'error', text: 'Select team and agent' });
      return;
    }

    setTeamControlBusy('attach');
    setTeamControlNotice(null);

    try {
      const res = await fetch(`${baseUrl}/teams/${encodeURIComponent(selectedTeamId)}/agents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: selectedAgentId }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Attach agent failed');
      }

      setTeamControlNotice({ type: 'ok', text: 'Agent attached' });
      await fetchMissionData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Attach agent failed';
      setTeamControlNotice({ type: 'error', text: message });
    } finally {
      setTeamControlBusy(null);
    }
  }, [apiStatus, baseUrl, fetchMissionData, selectedAgentId, selectedTeamId]);

  const enqueueTeamHandoff = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (apiStatus !== 'connected') {
      setTeamControlNotice({ type: 'error', text: 'Vortex API offline' });
      return;
    }

    if (!selectedTeamId) {
      setTeamControlNotice({ type: 'error', text: 'Select team first' });
      return;
    }

    const fromAgentId = selectedAgentId || 'operator';
    const toAgentId = handoffTargetAgentId || undefined;
    const text = handoffMessage.trim();
    if (!text) {
      setTeamControlNotice({ type: 'error', text: 'Handoff message is required' });
      return;
    }

    setTeamControlBusy('handoff');
    setTeamControlNotice(null);

    try {
      const res = await fetch(`${baseUrl}/teams/${encodeURIComponent(selectedTeamId)}/handoff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAgentId,
          toAgentId,
          type: DEFAULT_HANDOFF_TYPE,
          payload: { text },
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Enqueue handoff failed');
      }

      setHandoffMessage('');
      setTeamControlNotice({ type: 'ok', text: 'Handoff queued' });
      await fetchMissionData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Enqueue handoff failed';
      setTeamControlNotice({ type: 'error', text: message });
    } finally {
      setTeamControlBusy(null);
    }
  }, [apiStatus, baseUrl, fetchMissionData, handoffMessage, handoffTargetAgentId, selectedAgentId, selectedTeamId]);

  const runningAgentsTotal = agentRuntime.realtime.running + agentRuntime.async.running;

  const wsStatusColorClass = missionControlWsStatus === 'connected'
    ? 'text-accent-orange'
    : missionControlWsStatus === 'reconnecting'
      ? 'text-yellow-400'
      : 'text-text-muted';

  const lastRealtimeUpdateLabel = lastRealtimeUpdateAt
    ? new Date(lastRealtimeUpdateAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '—';

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
          <span>|</span>
          <span>
            Teams <span className="text-text-primary">{teamRuntimeSummary.teamCount}</span> ({teamRuntimeSummary.activeTeams} active)
          </span>
          <span>|</span>
          <span>
            Handoffs P/C/D <span className="text-text-primary">{teamRuntimeSummary.pending}</span>/<span className="text-text-primary">{teamRuntimeSummary.claimed}</span>/<span className="text-text-primary">{teamRuntimeSummary.completed}</span>
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] text-text-muted">
          <span className="whitespace-nowrap">
            <span className={wsStatusColorClass}>●</span> MC {missionControlWsStatus}
          </span>
          <span className="whitespace-nowrap">Last RT update {lastRealtimeUpdateLabel}</span>
          <span className="whitespace-nowrap">
            Recent handoffs {teamRuntimeRecent.slice(0, 3).map((item) => item.state[0].toUpperCase()).join('·') || '—'}
          </span>
          <span className="whitespace-nowrap">{apiStatus === 'connected' ? '🟢 Vortex live' : '⚪ Demo mode'}</span>
        </div>
      </div>

      <div className="px-5 py-2 border-b border-border-subtle bg-background-panel/80">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono text-text-secondary">
          <form className="flex items-center gap-1" onSubmit={createTeam}>
            <span className="text-text-muted">Team</span>
            <input
              value={teamNameInput}
              onChange={(event) => setTeamNameInput(event.target.value)}
              placeholder="new-team"
              className="w-28 rounded border border-border-subtle bg-background-card px-2 py-1 text-text-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={teamControlBusy !== null}
              className="rounded border border-border-subtle px-2 py-1 text-text-primary hover:border-accent-orange disabled:cursor-not-allowed disabled:opacity-50"
            >
              + create
            </button>
          </form>

          <form className="flex items-center gap-1" onSubmit={attachAgentToTeam}>
            <select
              value={selectedTeamId}
              onChange={(event) => setSelectedTeamId(event.target.value)}
              className="rounded border border-border-subtle bg-background-card px-2 py-1 text-text-primary focus:outline-none"
            >
              <option value="">team…</option>
              {teamRuntimeTeams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
            <select
              value={selectedAgentId}
              onChange={(event) => setSelectedAgentId(event.target.value)}
              className="rounded border border-border-subtle bg-background-card px-2 py-1 text-text-primary focus:outline-none"
            >
              <option value="">agent…</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={teamControlBusy !== null}
              className="rounded border border-border-subtle px-2 py-1 text-text-primary hover:border-accent-orange disabled:cursor-not-allowed disabled:opacity-50"
            >
              attach
            </button>
          </form>

          <form className="flex items-center gap-1" onSubmit={enqueueTeamHandoff}>
            <select
              value={handoffTargetAgentId}
              onChange={(event) => setHandoffTargetAgentId(event.target.value)}
              className="rounded border border-border-subtle bg-background-card px-2 py-1 text-text-primary focus:outline-none"
            >
              <option value="">target…</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
            <input
              value={handoffMessage}
              onChange={(event) => setHandoffMessage(event.target.value)}
              placeholder="handoff message"
              className="w-44 rounded border border-border-subtle bg-background-card px-2 py-1 text-text-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={teamControlBusy !== null}
              className="rounded border border-border-subtle px-2 py-1 text-text-primary hover:border-accent-orange disabled:cursor-not-allowed disabled:opacity-50"
            >
              enqueue
            </button>
          </form>

          <span className={teamControlNotice?.type === 'error' ? 'text-red-400' : 'text-accent-orange'}>
            {teamControlNotice ? teamControlNotice.text : 'Team controls ready'}
          </span>
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
          <TaskBoard
            columns={taskBoard}
            agents={agents}
            onCreateTask={createTask}
            onAssignTask={assignTask}
            onMoveTask={moveTask}
            pendingTaskIds={pendingTaskIds}
            creatingTask={creatingTask}
          />
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
