import { AIModel, AI_MODELS } from '@/types/chat'

interface ModelSelectorProps {
  currentModel: AIModel
  onModelChange: (model: AIModel) => void
}

export function ModelSelector({ currentModel, onModelChange }: ModelSelectorProps) {
  return (
    <select
      value={currentModel}
      onChange={(e) => onModelChange(e.target.value as AIModel)}
      className="px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {Object.entries(AI_MODELS).map(([id, config]) => (
        <option key={id} value={id}>
          {config.name}
        </option>
      ))}
    </select>
  )
}