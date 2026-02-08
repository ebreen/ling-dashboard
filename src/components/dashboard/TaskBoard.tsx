import { TaskBoardColumns, TaskBoardStatus } from '../../types';

interface TaskBoardProps {
  columns: TaskBoardColumns;
}

const STATUS_META: Array<{ key: TaskBoardStatus; label: string }> = [
  { key: 'inbox', label: 'Inbox' },
  { key: 'assigned', label: 'Assigned' },
  { key: 'inProgress', label: 'In Progress' },
  { key: 'review', label: 'Review' },
  { key: 'done', label: 'Done' },
  { key: 'blocked', label: 'Blocked' },
];

const TaskBoard = ({ columns }: TaskBoardProps) => {
  return (
    <div className="h-full overflow-x-auto scrollbar-thin">
      <div className="min-w-[980px] h-full grid grid-cols-6 gap-3 p-3">
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
                  tasks.map((task) => (
                    <div key={task.id} className="p-2 rounded border border-border-subtle bg-background-panel/70">
                      <p className="text-xs text-text-primary leading-snug">{task.title}</p>
                      <p className="text-[10px] text-text-muted mt-1">@{task.assigneeName}</p>
                    </div>
                  ))
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
