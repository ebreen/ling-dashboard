import { Send } from 'lucide-react';
import { useState } from 'react';

const ChatInput = () => {
  const [message, setMessage] = useState('');

  return (
    <div className="p-4 border-t border-border-subtle">
      <div className="flex items-end gap-3 bg-background-deepest rounded-lg px-4 py-3">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message ling..."
          className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted resize-none outline-none min-h-[24px] max-h-[120px]"
          rows={1}
        />
        <button className="text-text-muted hover:text-accent-orange transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
      <div className="text-xs text-text-muted mt-2 px-1">
        Enter send · Shift+Enter newline
      </div>
    </div>
  );
};

export default ChatInput;
