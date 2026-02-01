interface ChatTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const ChatTabs = ({ activeTab, onTabChange }: ChatTabsProps) => {
  const tabs = ['CHAT', 'DIGEST', 'NEWS'];

  return (
    <div className="flex items-center gap-1 px-4 py-3 border-b border-border-subtle">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`relative px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
            activeTab === tab
              ? 'text-text-primary'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          {tab}
          {activeTab === tab && (
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-accent-orange" />
          )}
        </button>
      ))}
    </div>
  );
};

export default ChatTabs;
