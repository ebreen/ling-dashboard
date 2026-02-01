import { Message } from '../../types';
import { Sparkles, Clock } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

const ChatMessage = ({ message }: ChatMessageProps) => {
  const isAgent = message.author === 'ling';

  const formatContent = (content: string) => {
    // Handle bold text (**text**)
    let formatted = content.replace(/\*\*(.+?)\*\*/g, '<strong class="text-text-primary font-semibold">$1</strong>');
    
    // Handle inline code (`code`)
    formatted = formatted.replace(/`(.+?)`/g, '<code class="bg-background-card px-1.5 py-0.5 rounded text-accent-orange text-xs">$1</code>');
    
    // Handle bullet points
    formatted = formatted.replace(/• /g, '<span class="text-text-secondary">•</span> ');
    
    // Handle line breaks
    formatted = formatted.replace(/\n/g, '<br />');
    
    return formatted;
  };

  return (
    <div className="flex gap-4 animate-fadeIn group">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0 ${
        isAgent 
          ? 'bg-accent-orange text-white' 
          : 'bg-accent-orange/80 text-white'
      }`}>
        {isAgent ? (
          <Sparkles className="w-4 h-4" />
        ) : (
          'Y'
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className={`text-sm font-semibold ${
            isAgent ? 'text-accent-orange' : 'text-accent-gold'
          }`}>
            {message.author}
          </span>
          <span className="text-xs text-text-muted">{message.timestamp}</span>
          
          {message.workedFor && (
            <span className="flex items-center gap-1 text-[10px] text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
              <Clock className="w-3 h-3" />
              worked for {message.workedFor}
            </span>
          )}
        </div>
        <div 
          className={`text-sm leading-relaxed ${
            isAgent ? 'text-text-secondary' : 'text-accent-gold/90'
          }`}
          dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
        />
        
        {message.spawnBadges && (
          <div className="flex flex-col gap-2 mt-3">
            {message.spawnBadges.map((badge) => (
              <div 
                key={badge.id}
                className="inline-flex items-center gap-2 bg-background-card px-3 py-2 rounded-md w-fit"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                <span className="text-xs text-text-secondary font-mono">{badge.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
