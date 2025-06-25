export type ModelType = 
  | 'default'
  | 'opus' 
  | 'sonnet'
  | 'haiku'
  | 'claude-opus-4-20250514'
  | 'claude-sonnet-4-20250514'
  | 'claude-haiku-4-20250514'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-5-sonnet-20240620'
  | 'claude-3-5-haiku-20241022'
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  model?: string
}

export interface WebSocketMessage {
  type: string
  content?: string
  message?: string
  model?: string
  prompt?: string
  maxTurns?: number
}

export interface ModelOption {
  id: ModelType
  name: string
  description?: string
  category: 'claude-4' | 'claude-3.5' | 'claude-3'
}

export const MODEL_OPTIONS: ModelOption[] = [
  // Claude 4 Models
  { id: 'default', name: 'Default (Opus 4 → Sonnet 4)', category: 'claude-4' },
  { id: 'opus', name: 'Opus (Opus 4 only)', category: 'claude-4' },
  { id: 'sonnet', name: 'Sonnet (Sonnet 4 only)', category: 'claude-4' },
  { id: 'haiku', name: 'Haiku (Haiku 4)', category: 'claude-4' },
  
  // Claude 3.5 Models
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet (New)', category: 'claude-3.5' },
  { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet (Original)', category: 'claude-3.5' },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', category: 'claude-3.5' },
  
  // Claude 3 Models
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', category: 'claude-3' },
  { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', category: 'claude-3' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', category: 'claude-3' },
]

export const getModelName = (modelId: ModelType): string => {
  const model = MODEL_OPTIONS.find(m => m.id === modelId)
  return model?.name || modelId
}