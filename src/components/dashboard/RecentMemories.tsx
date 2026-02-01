import { Memory } from '../../types';

interface RecentMemoriesProps {
  memories: Memory[];
}

const RecentMemories = ({ memories }: RecentMemoriesProps) => {
  return (
    <div className="grid grid-cols-2 gap-3 px-5 py-3">
      {memories.map((memory) => (
        <div 
          key={memory.id}
          className="bg-background-card p-3 rounded-lg border-l-2 border-accent-orange hover:bg-background-hover transition-colors cursor-pointer"
        >
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">
            {memory.content}
          </p>
          <span className="text-[10px] text-text-muted font-mono mt-2 block">
            {memory.relativeTime}
          </span>
        </div>
      ))}
    </div>
  );
};

export default RecentMemories;
