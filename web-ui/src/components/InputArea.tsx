import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PaperAirplaneIcon, ChevronUpIcon, PaperClipIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
import type { ModelType } from '../types'
import { getModelName } from '../types'
import ModelSelector from './ModelSelector'

interface AttachedFile {
  id: string
  name: string
  type: 'file' | 'image'
  size: number
  preview?: string
}

interface InputAreaProps {
  onSendMessage: (content: string, attachments?: AttachedFile[]) => void
  currentModel: ModelType
  onModelChange: (model: ModelType) => void
  disabled?: boolean
}

export default function InputArea({ 
  onSendMessage, 
  currentModel, 
  onModelChange, 
  disabled = false 
}: InputAreaProps) {
  const [message, setMessage] = useState('')
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false)
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSendMessage(message.trim(), attachedFiles.length > 0 ? attachedFiles : undefined)
      setMessage('')
      setAttachedFiles([])
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    
    // Auto-resize
    const textarea = e.target
    textarea.style.height = 'auto'
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 52), 200)
    textarea.style.height = newHeight + 'px'
  }

  // Handle file selection
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newFiles: AttachedFile[] = []
    Array.from(files).forEach(file => {
      const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const isImage = file.type.startsWith('image/')
      
      newFiles.push({
        id,
        name: file.name,
        type: isImage ? 'image' : 'file',
        size: file.size,
      })

      // Generate preview for images
      if (isImage) {
        const reader = new FileReader()
        reader.onload = (e) => {
          setAttachedFiles(prev => prev.map(f => 
            f.id === id ? { ...f, preview: e.target?.result as string } : f
          ))
        }
        reader.readAsDataURL(file)
      }
    })

    setAttachedFiles(prev => [...prev, ...newFiles])
  }

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.currentTarget === e.target) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const removeFile = (id: string) => {
    setAttachedFiles(prev => prev.filter(f => f.id !== id))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  return (
    <div 
      className="bg-bg-secondary border-t border-border"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto p-4">
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center pointer-events-none"
            >
              <div className="bg-bg-secondary border-2 border-dashed border-accent-blue rounded-xl p-8">
                <PhotoIcon className="w-16 h-16 text-accent-blue mx-auto mb-4" />
                <p className="text-lg font-medium text-text-primary">Drop files to attach</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Attached files */}
        <AnimatePresence>
          {attachedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 flex flex-wrap gap-2"
            >
              {attachedFiles.map(file => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-2 bg-bg-tertiary border border-border rounded-lg px-3 py-2"
                >
                  {file.type === 'image' && file.preview ? (
                    <img src={file.preview} alt={file.name} className="w-8 h-8 rounded object-cover" />
                  ) : (
                    <PaperClipIcon className="w-4 h-4 text-text-secondary" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{file.name}</p>
                    <p className="text-xs text-text-secondary">{formatFileSize(file.size)}</p>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-1 hover:bg-bg-primary rounded transition-colors"
                  >
                    <XMarkIcon className="w-4 h-4 text-text-secondary" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} className="relative">
          <div className="relative flex items-end gap-2">
            {/* Attachment button */}
            <motion.button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mb-1 p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Attach files"
            >
              <PaperClipIcon className="w-5 h-5" />
            </motion.button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
              accept="*"
            />

            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                placeholder={disabled ? "Please authenticate to continue..." : "Ask Claude anything..."}
                disabled={disabled}
                className="w-full bg-bg-tertiary border border-border rounded-xl px-4 py-3 pr-20 text-text-primary placeholder-text-secondary resize-none focus:outline-none focus:border-accent-blue transition-colors text-base leading-6 min-h-[52px] max-h-[200px]"
                style={{ height: '52px' }}
              />
              
              {/* Send Button */}
              <motion.button
                type="submit"
                disabled={!message.trim() || disabled}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-accent-blue text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent-blue/80 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <PaperAirplaneIcon className="w-4 h-4" />
              </motion.button>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 text-sm text-text-secondary">
            <span>Drag and drop files or click 📎 to attach</span>
            
            {/* Model Selector */}
            <div className="relative">
              <motion.button
                type="button"
                onClick={() => setIsModelSelectorOpen(!isModelSelectorOpen)}
                className="flex items-center space-x-1 px-3 py-1 bg-bg-tertiary border border-border rounded-lg hover:border-accent-blue/50 transition-colors"
                whileHover={{ scale: 1.02 }}
              >
                <span className="text-accent-blue font-medium">
                  {getModelName(currentModel)}
                </span>
                <ChevronUpIcon className={`w-3 h-3 transition-transform ${isModelSelectorOpen ? 'rotate-180' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {isModelSelectorOpen && (
                  <ModelSelector
                    currentModel={currentModel}
                    onModelChange={(model) => {
                      onModelChange(model)
                      setIsModelSelectorOpen(false)
                    }}
                    onClose={() => setIsModelSelectorOpen(false)}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}