import { ChatMessage as ChatMessageType } from '@/types/chat'
import { MarkdownRenderer } from './MarkdownRenderer'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
        }`}
      >
        {message.images && message.images.length > 0 && (
          <div className="mb-2 grid grid-cols-2 gap-2">
            {message.images.map((image, index) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={index}
                src={image}
                alt={`Attachment ${index + 1}`}
                className="rounded-md max-h-40 object-cover"
              />
            ))}
          </div>
        )}
        <div className={isUser ? 'whitespace-pre-wrap break-words' : ''}>
          {isUser ? (
            message.content
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>
        <div className={`text-xs mt-1 ${isUser ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
          {message.model && ` • ${message.model}`}
        </div>
      </div>
    </div>
  )
}