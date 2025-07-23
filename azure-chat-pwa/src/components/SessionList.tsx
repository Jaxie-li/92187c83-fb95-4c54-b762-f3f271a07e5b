import { ChatSession, AIModel } from '@/types/chat'

interface SessionListProps {
  sessions: ChatSession[]
  currentSessionId?: string
  onSelectSession: (sessionId: string) => void
  onCreateSession: (model: AIModel) => void
  onDeleteSession: (sessionId: string) => void
}

export function SessionList({
  sessions,
  currentSessionId,
  onSelectSession,
  onCreateSession,
  onDeleteSession,
}: SessionListProps) {
  return (
    <div className="w-64 bg-gray-100 dark:bg-gray-800 h-full p-4 overflow-y-auto">
      <button
        onClick={() => onCreateSession('gpt-4.1')}
        className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        New Chat
      </button>
      
      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              session.id === currentSessionId
                ? 'bg-white dark:bg-gray-700 shadow-md'
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <div
              onClick={() => onSelectSession(session.id)}
              className="flex justify-between items-start"
            >
              <div className="flex-1 mr-2">
                <h3 className="font-medium text-sm truncate">{session.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(session.updatedAt).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {session.model}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDeleteSession(session.id)
                }}
                className="text-red-500 hover:text-red-700 text-sm"
                title="Delete session"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {sessions.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 mt-8">
          No chat sessions yet
        </p>
      )}
    </div>
  )
}