import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PlusIcon, Cog6ToothIcon, ClockIcon } from '@heroicons/react/24/outline'

interface HeaderProps {
  isConnected: boolean
  onNewChat: () => void
  onLoadChat?: (chatId: string) => void
  chatHistory?: Array<{
    id: string
    title: string
    timestamp: Date
    preview?: string
  }>
}

export default function Header({ isConnected, onNewChat, onLoadChat, chatHistory = [] }: HeaderProps) {
  const [showHistory, setShowHistory] = useState(false)
  const historyRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (historyRef.current && !historyRef.current.contains(event.target as Node)) {
        setShowHistory(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`
    
    return date.toLocaleDateString()
  }

  return (
    <motion.header 
      className="flex items-center justify-between bg-bg-secondary border-b border-border px-6 py-3"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-4">
        <h1 className="text-lg font-medium text-text-primary">Claude Code</h1>
        <div className="flex items-center space-x-2">
          <div 
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-accent-green' : 'bg-accent-red'
            }`}
          />
          <span className="text-sm text-text-secondary">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* History Button */}
        <div className="relative" ref={historyRef}>
          <motion.button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-lg bg-bg-tertiary hover:bg-border transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ClockIcon className="w-4 h-4" />
          </motion.button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-80 bg-bg-secondary border border-border rounded-lg shadow-2xl overflow-hidden z-50"
              >
                <div className="p-3 border-b border-border">
                  <h3 className="font-medium text-text-primary">Chat History</h3>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {chatHistory.length === 0 ? (
                    <div className="p-4 text-center text-text-secondary text-sm">
                      No previous chats
                    </div>
                  ) : (
                    <div className="py-1">
                      {chatHistory.map((chat) => (
                        <button
                          key={chat.id}
                          onClick={() => {
                            onLoadChat?.(chat.id)
                            setShowHistory(false)
                          }}
                          className="w-full px-4 py-3 hover:bg-bg-tertiary transition-colors text-left group"
                        >
                          <div className="flex justify-between items-start mb-1">
                            <h4 className="font-medium text-text-primary text-sm group-hover:text-accent-blue transition-colors truncate">
                              {chat.title}
                            </h4>
                            <span className="text-xs text-text-secondary ml-2 flex-shrink-0">
                              {formatDate(chat.timestamp)}
                            </span>
                          </div>
                          {chat.preview && (
                            <p className="text-xs text-text-secondary truncate">
                              {chat.preview}
                            </p>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          onClick={onNewChat}
          className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-bg-tertiary hover:bg-border transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <PlusIcon className="w-4 h-4" />
          <span className="text-sm">New Chat</span>
        </motion.button>

        <motion.button
          className="p-2 rounded-lg bg-bg-tertiary hover:bg-border transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Cog6ToothIcon className="w-4 h-4" />
        </motion.button>
      </div>
    </motion.header>
  )
}