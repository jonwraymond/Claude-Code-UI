import { motion } from 'framer-motion'
import { useEffect, useRef } from 'react'
import type { ModelType } from '../types'
import { MODEL_OPTIONS } from '../types'

interface ModelSelectorProps {
  currentModel: ModelType
  onModelChange: (model: ModelType) => void
  onClose: () => void
}

export default function ModelSelector({ currentModel, onModelChange, onClose }: ModelSelectorProps) {
  const ref = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // Group models by category
  const groupedModels = MODEL_OPTIONS.reduce((acc, model) => {
    if (!acc[model.category]) {
      acc[model.category] = []
    }
    acc[model.category].push(model)
    return acc
  }, {} as Record<string, typeof MODEL_OPTIONS>)

  const categoryLabels = {
    'claude-4': 'Claude 4 Models',
    'claude-3.5': 'Claude 3.5 Models',
    'claude-3': 'Claude 3 Models'
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="absolute bottom-full right-0 mb-2 bg-bg-secondary border border-border rounded-xl shadow-2xl min-w-[280px] max-h-80 overflow-y-auto z-50"
    >
      {Object.entries(groupedModels).map(([category, models]) => (
        <div key={category}>
          {/* Category Header */}
          <div className="px-4 py-2 bg-bg-tertiary text-xs font-semibold text-text-secondary uppercase tracking-wide border-b border-border">
            {categoryLabels[category as keyof typeof categoryLabels]}
          </div>
          
          {/* Models in Category */}
          <div className="py-1">
            {models.map((model) => (
              <motion.button
                key={model.id}
                onClick={() => onModelChange(model.id)}
                className={`w-full text-left px-4 py-3 hover:bg-bg-tertiary transition-colors ${
                  currentModel === model.id ? 'bg-accent-blue/10 border-r-2 border-accent-blue' : ''
                }`}
                whileHover={{ x: 4 }}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${
                    currentModel === model.id ? 'text-accent-blue' : 'text-text-primary'
                  }`}>
                    {model.name}
                  </span>
                  {currentModel === model.id && (
                    <div className="w-2 h-2 bg-accent-blue rounded-full" />
                  )}
                </div>
                {model.description && (
                  <p className="text-xs text-text-secondary mt-1">{model.description}</p>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      ))}
      
      {/* Footer */}
      <div className="px-4 py-3 bg-bg-tertiary border-t border-border text-xs text-text-secondary">
        Switch between Claude models to optimize for speed, capability, or cost
      </div>
    </motion.div>
  )
}