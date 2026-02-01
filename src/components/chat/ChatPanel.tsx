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
  const { wsStatus, wsSend } = useAPI();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for WebSocket messages
  useEffect(() => {
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'chat') {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            author: data.data.author === 'blanco' ? 'ling' : data.data.author,
            content: data.data.content,
            timestamp: data.data.timestamp,
            workedFor: data.data.workedFor
          }]);
          setIsTyping(false);
        }
      } catch (e) {
        console.error('Invalid message:', e);
      }
    };

    // This is a bit hacky - we need to access the WebSocket from context
    // In a real app, we'd expose the WebSocket instance properly
    window.addEventListener('websocket-message', handleWebSocketMessage as any);
    
    return () => {
      window.removeEventListener('websocket-message', handleWebSocketMessage as any);
    };
  }, []);

  const handleSendMessage = async (content: string) => {
    if (wsStatus === 'connected') {
      // Send via WebSocket
      wsSend({
        type: 'chat',
        message: content
      });
      setIsTyping(true);
    } else {
      // Fallback to HTTP or demo mode
      const userMessage: Message = {
        id: Date.now().toString(),
        author: 'you',
        content,
        timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
      };
      
      setMessages(prev => [...prev, userMessage]);
      setIsTyping(true);

      // Demo response
      setTimeout(() => {
        const agentMessage: Message = {
          id: (Date.now() + 1).toString(),
          author: 'ling',
          content: "I'm currently offline. Start the backend server (`node server.js`) to chat with me in real-time.",
          timestamp: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          workedFor: '0.1s'
        };
        setMessages(prev => [...prev, agentMessage]);
        setIsTyping(false);
      }, 500);
    }
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
