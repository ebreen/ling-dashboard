import { useMemo, useState } from 'react';
import { Agent, TaskBoardColumns, TaskBoardStatus, TaskBoardTask } from '../../types';

interface TaskBoardProps {
  columns: TaskBoardColumns;
  agents: Agent[];
  onCreateTask: (title: string) => Promise<void>;
  onAssignTask: (task: TaskBoardTask, agentId: string) => Promise<void>;
  onMoveTask: (task: TaskBoardTask, direction: 'backward' | 'forward') => Promise<void>;
  pendingTaskIds?: Set<string>;
  creatingTask?: boolean;
}

const STATUS_META: Array<{ key: TaskBoardStatus; label: string }> = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
  { key: 'blocked', label: 'Blocked' },
];

const TaskBoard = ({
  columns,
  agents,
  onCreateTask,
  onAssignTask,
  onMoveTask,
  pendingTaskIds = new Set(),
  creatingTask = false,
}: TaskBoardProps) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const sortedAgents = useMemo(() => [...agents].sort((a, b) => a.name.localeCompare(b.name)), [agents]);

  const submitCreate = async () => {
    const title = newTaskTitle.trim();
    if (!title) return;

    setError(null);
    try {
      await onCreateTask(title);
      setNewTaskTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task');
    }
  };

  return (
    <div className="h-full overflow-x-auto scrollbar-thin">
      <div className="px-3 pt-3 pb-1 flex items-center gap-2">
        <input
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void submitCreate();
          }}
          placeholder="Create task..."
          className="flex-1 bg-background-card border border-border-subtle rounded px-2 py-1 text-xs text-text-primary"
        />
        <button
          onClick={() => void submitCreate()}
          disabled={creatingTask || !newTaskTitle.trim()}
          className="px-2 py-1 text-xs rounded border border-border-subtle bg-background-card disabled:opacity-50"
        >
          {creatingTask ? 'Creating…' : 'Create'}
        </button>
      </div>

      {error && <div className="px-3 pb-2 text-[10px] text-red-400">{error}</div>}

      <div className="min-w-[980px] h-[calc(100%-56px)] grid grid-cols-6 gap-3 p-3">
        {STATUS_META.map(({ key, label }) => {
          const tasks = columns[key] || [];

          return (
            <div key={key} className="bg-background-card border border-border-subtle rounded-md flex flex-col min-h-0">
              <div className="px-3 py-2 border-b border-border-subtle flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{label}</h3>
                <span className="text-[10px] text-text-muted">{tasks.length}</span>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-[11px] text-text-muted px-1">No tasks</div>
                ) : (
                  tasks.map((task) => {
                    const pending = pendingTaskIds.has(task.id);

                    return (
                      <div key={task.id} className="p-2 rounded border border-border-subtle bg-background-panel/70 space-y-2">
                        <p className="text-xs text-text-primary leading-snug">{task.title}</p>
                        <p className="text-[10px] text-text-muted">@{task.assigneeName}</p>

                        <div>
                          <select
                            value={task.assigneeId || ''}
                            disabled={pending}
                            onChange={(e) => {
                              const agentId = e.target.value;
                              if (!agentId) return;
                              void onAssignTask(task, agentId);
                            }}
                            className="w-full bg-background-card border border-border-subtle rounded px-1 py-1 text-[10px]"
                          >
                            <option value="">Assign…</option>
                            {sortedAgents.map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => void onMoveTask(task, 'backward')}
                            disabled={pending || key === 'inbox'}
                            className="flex-1 px-1 py-1 text-[10px] rounded border border-border-subtle disabled:opacity-50"
                          >
                            ← Back
                          </button>
                          <button
                            onClick={() => void onMoveTask(task, 'forward')}
                            disabled={pending || key === 'done' || key === 'blocked'}
                            className="flex-1 px-1 py-1 text-[10px] rounded border border-border-subtle disabled:opacity-50"
                          >
                            Next →
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TaskBoard;
