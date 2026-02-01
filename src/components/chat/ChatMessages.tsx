import { Message } from '../../types';
import ChatMessage from './ChatMessage';

interface ChatMessagesProps {
  messages: Message[];
}

const ChatMessages = ({ messages }: ChatMessagesProps) => {
  return (
    <div className="flex flex-col gap-6 p-6">
      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} />
      ))}
    </div>
  );
};

export default ChatMessages;
