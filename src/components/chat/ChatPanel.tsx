import { useState } from 'react';
import { demoMessages } from '../../data/demoData';
import ChatTabs from './ChatTabs';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

const ChatPanel = () => {
  const [activeTab, setActiveTab] = useState('CHAT');

  return (
    <div className="w-[55%] min-w-[500px] max-w-[700px] flex flex-col bg-background-dark border-r border-border-subtle">
      <ChatTabs activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <ChatMessages messages={demoMessages} />
        </div>
        <ChatInput />
      </div>
    </div>
  );
};

export default ChatPanel;
