import { useState, useEffect, useRef } from 'react';
import { useAPI } from '../../App';
import { demoMessages } from '../../data/demoData';
import { Message } from '../../types';
import ChatTabs from './ChatTabs';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';

const ChatPanel = () => {
  const [activeTab, setActiveTab] = useState('CHAT');
  const [messages, setMessages] = useState<Message[]>(demoMessages);
  const [isTyping, setIsTyping] = useState(false);
  const { baseUrl, apiStatus } = useAPI();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      author: 'you',
      content,
      timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    if (apiStatus === 'connected') {
      try {
        const startTime = performance.now();
        const res = await fetch(`${baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: content })
        });
        const endTime = performance.now();
        const workedFor = ((endTime - startTime) / 1000).toFixed(1);
        
        const data = await res.json();
        
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          author: 'ling',
          content: data.content,
          timestamp: data.timestamp,
          workedFor: data.workedFor || `${workedFor}s`
        };
        
        setMessages(prev => [...prev, agentMessage]);
      } catch (error) {
        // Fallback response
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          author: 'ling',
          content: 'I\'m having trouble connecting to the knowledge graph. Try asking about memories, agents, or status.',
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          workedFor: '0.1s'
        };
        setMessages(prev => [...prev, agentMessage]);
      }
    } else {
      // Demo mode responses
      setTimeout(() => {
        let response = '';
        if (content.toLowerCase().includes('hello') || content.toLowerCase().includes('hi')) {
          response = 'Hello! I\'m connected to the Knowledge Graph. I can help you search memories, check agent status, or explore the graph.';
        } else if (content.toLowerCase().includes('search') || content.toLowerCase().includes('find')) {
          response = 'In demo mode. Start the API server (`node server.js`) to search the real Knowledge Graph.';
        } else if (content.toLowerCase().includes('agent')) {
          response = 'Demo mode: 2 agents shown. Start the API to see real active agents from tmux sessions.';
        } else {
          response = 'I understand. The Knowledge Graph API is currently offline (demo mode). Start the backend server to enable full functionality.';
        }
        
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          author: 'ling',
          content: response,
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          workedFor: '0.5s'
        };
        setMessages(prev => [...prev, agentMessage]);
        setIsTyping(false);
      }, 500);
      return;
    }
    
    setIsTyping(false);
  };

  return (
    <div className="w-[55%] min-w-[500px] max-w-[700px] flex flex-col bg-background-dark border-r border-border-subtle">
      <ChatTabs activeTab={activeTab} onTabChange={setActiveTab} />      
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          <ChatMessages messages={messages} />
          
          {isTyping && (
            <div className="flex gap-4 px-6 py-4">
              <div className="w-8 h-8 rounded-lg bg-accent-orange flex items-center justify-center">
                <span className="text-white text-sm">🧠</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        <ChatInput onSend={handleSendMessage} disabled={isTyping} />
      </div>
    </div>
  );
};

export default ChatPanel;
