import { Activity } from '../../types';

interface ActivityFeedProps {
  activities: Activity[];
}

const ActivityFeed = ({ activities }: ActivityFeedProps) => {
  return (
    <div className="flex flex-col">
      {activities.map((activity, idx) => (
        <div 
          key={activity.id}
          className={`flex items-center gap-4 px-5 py-3 hover:bg-background-hover transition-colors cursor-pointer ${
            idx !== activities.length - 1 ? 'border-b border-border-subtle/50' : ''
          }`}
        >
          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${
            activity.type === 'MAIN' 
              ? 'bg-accent-orange/20 text-accent-orange' 
              : 'bg-background-card text-text-muted'
          }`}>
            {activity.type}
          </span>
          <span className="flex-1 text-xs font-mono text-text-secondary truncate">
            {activity.name}
          </span>
          <span className="text-[11px] text-text-muted font-mono shrink-0">
            {activity.date.split('-').slice(1).join('-')}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ActivityFeed;
