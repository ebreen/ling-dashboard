import { Send } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

const ChatInput = ({ onSend, disabled }: ChatInputProps) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 border-t border-border-subtle">
      <div className="flex items-end gap-3 bg-background-deepest rounded-lg px-4 py-3">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? 'Waiting for response...' : 'Message ling...'}
          disabled={disabled}
          className="flex-1 bg-transparent text-sm text-text-primary placeholder-text-muted resize-none outline-none min-h-[20px] max-h-[120px] disabled:opacity-50"
          rows={1}
        />
        
        <button 
          onClick={handleSubmit}
          disabled={disabled || !message.trim()}
          className="text-text-muted hover:text-accent-orange transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
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
