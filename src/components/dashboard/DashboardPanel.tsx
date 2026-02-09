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

interface TeamMember {
  agentId: string;
  agentName: string;
  teamRole?: string | null;
  agentRole?: string | null;
  agentStatus?: string | null;
}

interface TeamDetail {
  id: string;
  name: string;
  status: string;
  metadata?: { description?: string };
  agents?: TeamMember[];
  handoffStats?: {
    pending?: number;
    claimed?: number;
    completed?: number;
    total?: number;
    lastUpdatedAt?: string | null;
  };
}

interface TeamDetailResponse {
  ok?: boolean;
  team?: TeamDetail;
}

interface TeamHandoffItem {
  id: string;
  type?: string;
  fromAgentId?: string | null;
  toAgentId?: string | null;
  payload?: { text?: string };
  deliveryState?: string;
}

interface TeamHandoffsResponse {
  handoffs?: TeamHandoffItem[];
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
  const [teamEditName, setTeamEditName] = useState('');
  const [teamEditDescription, setTeamEditDescription] = useState('');
  const [teamEditStatus, setTeamEditStatus] = useState('active');
  const [detachAgentId, setDetachAgentId] = useState('');
  const [pendingHandoffs, setPendingHandoffs] = useState<TeamHandoffItem[]>([]);
  const [claimedHandoffs, setClaimedHandoffs] = useState<TeamHandoffItem[]>([]);
  const [selectedTeamDetail, setSelectedTeamDetail] = useState<TeamDetail | null>(null);
  const [teamActionAgentId, setTeamActionAgentId] = useState('');
  const [teamControlBusy, setTeamControlBusy] = useState<'create' | 'attach' | 'handoff' | 'claim' | 'complete' | 'update' | 'detach' | 'archive' | null>(null);
  const [teamControlNotice, setTeamControlNotice] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [showArchivedTeams, setShowArchivedTeams] = useState(false);
  const [missionControlWsStatus, setMissionControlWsStatus] = useState<MissionControlWsStatus>('disconnected');
  const [lastRealtimeUpdateAt, setLastRealtimeUpdateAt] = useState<string | null>(null);
  const [creatingTask, setCreatingTask] = useState(false);
  const [pendingTaskIds, setPendingTaskIds] = useState<Set<string>>(new Set());

  const selectedTeam = teamRuntimeTeams.find((team) => team.id === selectedTeamId);
  const selectedTeamStatus = (selectedTeamDetail?.status || selectedTeam?.status || 'unknown').toLowerCase();
  const selectedTeamIsArchived = selectedTeamStatus === 'archived';

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

  const fetchTeamDetail = useCallback(async (teamId: string) => {
    if (apiStatus !== 'connected' || !teamId) {
      setSelectedTeamDetail(null);
      return;
    }

    try {
      const res = await fetch(`${baseUrl}/teams/${encodeURIComponent(teamId)}`);
      if (!res.ok) return;
      const payload = (await res.json()) as TeamDetailResponse;
      if (payload.team) setSelectedTeamDetail(payload.team);
    } catch {
      // keep existing team detail when refresh fails
    }
  }, [apiStatus, baseUrl]);

  const fetchTeamHandoffs = useCallback(async (teamId: string, agentId?: string) => {
    if (apiStatus !== 'connected' || !teamId) {
      setPendingHandoffs([]);
      setClaimedHandoffs([]);
      return;
    }

    try {
      const claimedAgentId = agentId || teamActionAgentId || handoffTargetAgentId || selectedAgentId;
      const claimedQuery = claimedAgentId ? `&agentId=${encodeURIComponent(claimedAgentId)}` : '';

      const [pendingRes, claimedRes] = await Promise.all([
        fetch(`${baseUrl}/teams/${encodeURIComponent(teamId)}/handoffs/pending?limit=5`),
        fetch(`${baseUrl}/teams/${encodeURIComponent(teamId)}/handoffs/claimed?limit=5${claimedQuery}`),
      ]);

      if (pendingRes.ok) {
        const payload = (await pendingRes.json()) as TeamHandoffsResponse;
        setPendingHandoffs(Array.isArray(payload.handoffs) ? payload.handoffs : []);
      }

      if (claimedRes.ok) {
        const payload = (await claimedRes.json()) as TeamHandoffsResponse;
        setClaimedHandoffs(Array.isArray(payload.handoffs) ? payload.handoffs : []);
      }
    } catch {
      // Keep existing handoff list when network hiccups occur.
    }
  }, [apiStatus, baseUrl, handoffTargetAgentId, selectedAgentId, teamActionAgentId]);

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

      if (selectedTeamId) {
        await Promise.all([
          fetchTeamDetail(selectedTeamId),
          fetchTeamHandoffs(selectedTeamId),
        ]);
      }
    } catch (error) {
      console.error('Mission fetch failed:', error);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  }, [apiStatus, baseUrl, applyOverview, applyAgentRuntimeSummary, applyTeamRuntime, fetchTeamDetail, fetchTeamHandoffs, selectedTeamId]);

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
      const nextDefaultTeam = teamRuntimeTeams.find((team) => team.status !== 'archived') || teamRuntimeTeams[0];
      setSelectedTeamId(nextDefaultTeam.id);
    }
  }, [teamRuntimeTeams, selectedTeamId]);

  useEffect(() => {
    if (!selectedTeamId) {
      setPendingHandoffs([]);
      setClaimedHandoffs([]);
      setSelectedTeamDetail(null);
    }
  }, [selectedTeamId]);

  useEffect(() => {
    if (!selectedAgentId && agents.length > 0) {
      setSelectedAgentId(agents[0].id);
      setHandoffTargetAgentId(agents[0].id);
      setDetachAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  useEffect(() => {
    if (!selectedTeamId) {
      setTeamEditName('');
      setTeamEditDescription('');
      setTeamEditStatus('active');
      return;
    }

    const selectedTeam = teamRuntimeTeams.find((team) => team.id === selectedTeamId);
    if (!selectedTeam) return;

    setTeamEditName(selectedTeam.name || '');
    setTeamEditDescription('');
    setTeamEditStatus(selectedTeam.status || 'active');
  }, [selectedTeamId, teamRuntimeTeams]);

  useEffect(() => {
    const memberIds = selectedTeamDetail?.agents?.map((member) => member.agentId) || [];
    if (memberIds.length === 0) return;

    if (!memberIds.includes(teamActionAgentId)) {
      setTeamActionAgentId(memberIds[0]);
    }

    if (!memberIds.includes(detachAgentId)) {
      setDetachAgentId(memberIds[0]);
    }

    if (handoffTargetAgentId && !memberIds.includes(handoffTargetAgentId)) {
      setHandoffTargetAgentId(memberIds[0]);
    }
  }, [selectedTeamDetail, teamActionAgentId, detachAgentId, handoffTargetAgentId]);

  useEffect(() => {
    if (!selectedTeamId) return;
    void Promise.all([
      fetchTeamDetail(selectedTeamId),
      fetchTeamHandoffs(selectedTeamId),
    ]);
  }, [fetchTeamDetail, fetchTeamHandoffs, selectedTeamId, selectedAgentId, handoffTargetAgentId, teamActionAgentId]);

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

    if (selectedTeamIsArchived) {
      setTeamControlNotice({ type: 'error', text: 'Archived teams are read-only' });
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
  }, [apiStatus, baseUrl, fetchMissionData, selectedAgentId, selectedTeamId, selectedTeamIsArchived]);

  const updateTeamConfig = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (apiStatus !== 'connected') {
      setTeamControlNotice({ type: 'error', text: 'Vortex API offline' });
      return;
    }

    if (!selectedTeamId) {
      setTeamControlNotice({ type: 'error', text: 'Select team first' });
      return;
    }

    if (selectedTeamIsArchived) {
      setTeamControlNotice({ type: 'error', text: 'Archived teams are read-only' });
      return;
    }

    const nextName = teamEditName.trim();
    const nextStatus = teamEditStatus.trim();
    const nextDescription = teamEditDescription.trim();

    if (!nextName) {
      setTeamControlNotice({ type: 'error', text: 'Team name is required' });
      return;
    }

    setTeamControlBusy('update');
    setTeamControlNotice(null);

    try {
      const res = await fetch(`${baseUrl}/teams/${encodeURIComponent(selectedTeamId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nextName,
          description: nextDescription || undefined,
          status: nextStatus || undefined,
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Update team failed');
      }

      setTeamControlNotice({ type: 'ok', text: 'Team updated' });
      await fetchMissionData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Update team failed';
      setTeamControlNotice({ type: 'error', text: message });
    } finally {
      setTeamControlBusy(null);
    }
  }, [apiStatus, baseUrl, fetchMissionData, selectedTeamId, selectedTeamIsArchived, teamEditDescription, teamEditName, teamEditStatus]);

  const detachAgentFromTeam = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (apiStatus !== 'connected') {
      setTeamControlNotice({ type: 'error', text: 'Vortex API offline' });
      return;
    }

    if (!selectedTeamId || !detachAgentId) {
      setTeamControlNotice({ type: 'error', text: 'Select team and agent' });
      return;
    }

    if (selectedTeamIsArchived) {
      setTeamControlNotice({ type: 'error', text: 'Archived teams are read-only' });
      return;
    }

    setTeamControlBusy('detach');
    setTeamControlNotice(null);

    try {
      const res = await fetch(`${baseUrl}/teams/${encodeURIComponent(selectedTeamId)}/agents/${encodeURIComponent(detachAgentId)}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Detach agent failed');
      }

      setTeamControlNotice({ type: 'ok', text: 'Agent detached' });
      await fetchMissionData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Detach agent failed';
      setTeamControlNotice({ type: 'error', text: message });
    } finally {
      setTeamControlBusy(null);
    }
  }, [apiStatus, baseUrl, detachAgentId, fetchMissionData, selectedTeamId, selectedTeamIsArchived]);

  const archiveSelectedTeam = useCallback(async () => {
    if (apiStatus !== 'connected') {
      setTeamControlNotice({ type: 'error', text: 'Vortex API offline' });
      return;
    }

    if (!selectedTeamId) {
      setTeamControlNotice({ type: 'error', text: 'Select team first' });
      return;
    }

    setTeamControlBusy('archive');
    setTeamControlNotice(null);

    try {
      const res = await fetch(`${baseUrl}/teams/${encodeURIComponent(selectedTeamId)}/archive`, {
        method: 'POST',
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Archive team failed');
      }

      setTeamControlNotice({ type: 'ok', text: 'Team archived' });
      await fetchMissionData();
      setPendingHandoffs([]);
      setClaimedHandoffs([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Archive team failed';
      setTeamControlNotice({ type: 'error', text: message });
    } finally {
      setTeamControlBusy(null);
    }
  }, [apiStatus, baseUrl, fetchMissionData, selectedTeamId]);

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

    if (selectedTeamIsArchived) {
      setTeamControlNotice({ type: 'error', text: 'Archived teams are read-only' });
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
      await fetchTeamHandoffs(selectedTeamId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Enqueue handoff failed';
      setTeamControlNotice({ type: 'error', text: message });
    } finally {
      setTeamControlBusy(null);
    }
  }, [apiStatus, baseUrl, fetchMissionData, fetchTeamHandoffs, handoffMessage, handoffTargetAgentId, selectedAgentId, selectedTeamId, selectedTeamIsArchived]);

  const claimPendingHandoff = useCallback(async (handoffId: string) => {
    if (apiStatus !== 'connected') {
      setTeamControlNotice({ type: 'error', text: 'Vortex API offline' });
      return;
    }

    if (!selectedTeamId) {
      setTeamControlNotice({ type: 'error', text: 'Select team first' });
      return;
    }

    if (selectedTeamIsArchived) {
      setTeamControlNotice({ type: 'error', text: 'Archived teams are read-only' });
      return;
    }

    setTeamControlBusy('claim');
    setTeamControlNotice(null);

    try {
      const res = await fetch(`${baseUrl}/teams/${encodeURIComponent(selectedTeamId)}/handoffs/${encodeURIComponent(handoffId)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimedByAgentId: teamActionAgentId || selectedAgentId || handoffTargetAgentId || 'operator' }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Claim handoff failed');
      }

      setTeamControlNotice({ type: 'ok', text: 'Handoff claimed' });
      await fetchMissionData();
      await fetchTeamHandoffs(selectedTeamId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Claim handoff failed';
      setTeamControlNotice({ type: 'error', text: message });
    } finally {
      setTeamControlBusy(null);
    }
  }, [apiStatus, baseUrl, fetchMissionData, fetchTeamHandoffs, handoffTargetAgentId, selectedAgentId, selectedTeamId, selectedTeamIsArchived, teamActionAgentId]);

  const completeClaimedHandoff = useCallback(async (handoffId: string) => {
    if (apiStatus !== 'connected') {
      setTeamControlNotice({ type: 'error', text: 'Vortex API offline' });
      return;
    }

    if (!selectedTeamId) {
      setTeamControlNotice({ type: 'error', text: 'Select team first' });
      return;
    }

    if (selectedTeamIsArchived) {
      setTeamControlNotice({ type: 'error', text: 'Archived teams are read-only' });
      return;
    }

    setTeamControlBusy('complete');
    setTeamControlNotice(null);

    try {
      const res = await fetch(`${baseUrl}/teams/${encodeURIComponent(selectedTeamId)}/handoffs/${encodeURIComponent(handoffId)}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedByAgentId: teamActionAgentId || selectedAgentId || handoffTargetAgentId || 'operator' }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Complete handoff failed');
      }

      setTeamControlNotice({ type: 'ok', text: 'Handoff completed' });
      await fetchMissionData();
      await fetchTeamHandoffs(selectedTeamId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Complete handoff failed';
      setTeamControlNotice({ type: 'error', text: message });
    } finally {
      setTeamControlBusy(null);
    }
  }, [apiStatus, baseUrl, fetchMissionData, fetchTeamHandoffs, handoffTargetAgentId, selectedAgentId, selectedTeamId, selectedTeamIsArchived, teamActionAgentId]);

  const visibleTeamRuntimeTeams = showArchivedTeams
    ? teamRuntimeTeams
    : teamRuntimeTeams.filter((team) => team.status !== 'archived');
  const selectedTeamMembers = selectedTeamDetail?.agents || [];
  const selectedTeamDescription = selectedTeamDetail?.metadata?.description || '';
  const selectedTeamHandoffStats = selectedTeamDetail?.handoffStats;
  const selectedTeamStatusBadgeClass = selectedTeamStatus === 'active'
    ? 'border-emerald-400/40 text-emerald-300'
    : selectedTeamStatus === 'paused'
      ? 'border-amber-400/40 text-amber-300'
      : selectedTeamStatus === 'archived'
        ? 'border-slate-500/40 text-slate-300'
        : 'border-border-subtle text-text-secondary';
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
            <label className="flex items-center gap-1 text-text-muted">
              <input
                type="checkbox"
                checked={showArchivedTeams}
                onChange={(event) => setShowArchivedTeams(event.target.checked)}
                className="h-3 w-3"
              />
              archived
            </label>
            <select
              value={selectedTeamId}
              onChange={(event) => setSelectedTeamId(event.target.value)}
              className="rounded border border-border-subtle bg-background-card px-2 py-1 text-text-primary focus:outline-none"
            >
              <option value="">team…</option>
              {visibleTeamRuntimeTeams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
              {!showArchivedTeams && selectedTeam && selectedTeam.status === 'archived' ? (
                <option value={selectedTeam.id}>{selectedTeam.name} (archived)</option>
              ) : null}
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
              disabled={teamControlBusy !== null || selectedTeamIsArchived}
              className="rounded border border-border-subtle px-2 py-1 text-text-primary hover:border-accent-orange disabled:cursor-not-allowed disabled:opacity-50"
            >
              attach
            </button>
          </form>

          <form className="flex items-center gap-1" onSubmit={enqueueTeamHandoff}>
            <select
              value={handoffTargetAgentId}
              onChange={(event) => setHandoffTargetAgentId(event.target.value)}
              disabled={selectedTeamIsArchived}
              className="rounded border border-border-subtle bg-background-card px-2 py-1 text-text-primary focus:outline-none"
            >
              <option value="">target…</option>
              {selectedTeamMembers.map((member) => (
                <option key={member.agentId} value={member.agentId}>{member.agentName}</option>
              ))}
            </select>
            <input
              value={handoffMessage}
              onChange={(event) => setHandoffMessage(event.target.value)}
              disabled={selectedTeamIsArchived}
              placeholder="handoff message"
              className="w-44 rounded border border-border-subtle bg-background-card px-2 py-1 text-text-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={teamControlBusy !== null || selectedTeamIsArchived}
              className="rounded border border-border-subtle px-2 py-1 text-text-primary hover:border-accent-orange disabled:cursor-not-allowed disabled:opacity-50"
            >
              enqueue
            </button>
          </form>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono text-text-secondary">
          <form className="flex items-center gap-1" onSubmit={updateTeamConfig}>
            <span className="text-text-muted">Maint</span>
            <input
              value={teamEditName}
              onChange={(event) => setTeamEditName(event.target.value)}
              placeholder="team name"
              className="w-28 rounded border border-border-subtle bg-background-card px-2 py-1 text-text-primary focus:outline-none"
            />
            <input
              value={teamEditDescription}
              onChange={(event) => setTeamEditDescription(event.target.value)}
              placeholder="description"
              className="w-36 rounded border border-border-subtle bg-background-card px-2 py-1 text-text-primary focus:outline-none"
            />
            <select
              value={teamEditStatus}
              onChange={(event) => setTeamEditStatus(event.target.value)}
              className="rounded border border-border-subtle bg-background-card px-2 py-1 text-text-primary focus:outline-none"
            >
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="draining">draining</option>
              <option value="archived">archived</option>
            </select>
            <button
              type="submit"
              disabled={teamControlBusy !== null || !selectedTeamId || selectedTeamIsArchived}
              className="rounded border border-border-subtle px-2 py-1 text-text-primary hover:border-accent-orange disabled:cursor-not-allowed disabled:opacity-50"
            >
              update
            </button>
          </form>

          <form className="flex items-center gap-1" onSubmit={detachAgentFromTeam}>
            <select
              value={detachAgentId}
              onChange={(event) => setDetachAgentId(event.target.value)}
              className="rounded border border-border-subtle bg-background-card px-2 py-1 text-text-primary focus:outline-none"
            >
              <option value="">detach agent…</option>
              {selectedTeamMembers.map((member) => (
                <option key={member.agentId} value={member.agentId}>{member.agentName}</option>
              ))}
            </select>
            <button
              type="submit"
              disabled={teamControlBusy !== null || !selectedTeamId || !detachAgentId || selectedTeamIsArchived}
              className="rounded border border-border-subtle px-2 py-1 text-text-primary hover:border-accent-orange disabled:cursor-not-allowed disabled:opacity-50"
            >
              detach
            </button>
          </form>

          <button
            type="button"
            onClick={archiveSelectedTeam}
            disabled={teamControlBusy !== null || !selectedTeamId || selectedTeam?.status === 'archived'}
            className="rounded border border-red-500/40 px-2 py-1 text-red-300 hover:border-red-400 disabled:cursor-not-allowed disabled:opacity-40"
            title="Archive selected team (backend may reject when guardrails trigger)"
          >
            archive team
          </button>

          <span className={teamControlNotice?.type === 'error' ? 'text-red-400' : 'text-accent-orange'}>
            {teamControlNotice ? teamControlNotice.text : 'Team controls ready'}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono text-text-secondary">
          <span className="text-text-muted">Handoff actor</span>
          <select
            value={teamActionAgentId}
            onChange={(event) => setTeamActionAgentId(event.target.value)}
            className="rounded border border-border-subtle bg-background-card px-2 py-1 text-text-primary focus:outline-none"
          >
            <option value="">operator…</option>
            {selectedTeamMembers.map((member) => (
              <option key={member.agentId} value={member.agentId}>{member.agentName}</option>
            ))}
          </select>

          <span className="text-text-muted">Team detail</span>
          <span className="text-text-primary">{selectedTeamDetail?.name || selectedTeam?.name || '—'}</span>
          <span className={`rounded border px-1.5 py-0.5 uppercase tracking-wide ${selectedTeamStatusBadgeClass}`}>
            {selectedTeamStatus}
          </span>
          <span className="text-text-muted">members</span>
          <span className="text-text-primary">{selectedTeamMembers.length}</span>
          <span className="text-text-muted">P/C/D/T</span>
          <span className="text-text-primary">
            {(selectedTeamHandoffStats?.pending ?? 0)}/{(selectedTeamHandoffStats?.claimed ?? 0)}/{(selectedTeamHandoffStats?.completed ?? 0)}/{(selectedTeamHandoffStats?.total ?? 0)}
          </span>
          {selectedTeamDescription ? <span className="text-text-muted">— {selectedTeamDescription}</span> : null}
        </div>

        <div className="mt-2 flex flex-wrap items-start gap-4 text-[10px] text-text-secondary">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">Pending</span>
            {pendingHandoffs.length === 0 ? (
              <span className="text-text-muted">—</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {pendingHandoffs.slice(0, 3).map((handoff) => (
                  <button
                    key={handoff.id}
                    type="button"
                    disabled={teamControlBusy !== null || selectedTeamIsArchived}
                    onClick={() => claimPendingHandoff(handoff.id)}
                    className="rounded border border-border-subtle px-2 py-1 text-text-primary hover:border-accent-orange disabled:cursor-not-allowed disabled:opacity-50"
                    title={handoff.payload?.text || handoff.type || handoff.id}
                  >
                    claim {handoff.id.slice(0, 6)}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-text-muted">Claimed</span>
            {claimedHandoffs.length === 0 ? (
              <span className="text-text-muted">—</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {claimedHandoffs.slice(0, 3).map((handoff) => (
                  <button
                    key={handoff.id}
                    type="button"
                    disabled={teamControlBusy !== null || selectedTeamIsArchived}
                    onClick={() => completeClaimedHandoff(handoff.id)}
                    className="rounded border border-border-subtle px-2 py-1 text-text-primary hover:border-accent-orange disabled:cursor-not-allowed disabled:opacity-50"
                    title={handoff.payload?.text || handoff.type || handoff.id}
                  >
                    complete {handoff.id.slice(0, 6)}
                  </button>
                ))}
              </div>
            )}
          </div>
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
