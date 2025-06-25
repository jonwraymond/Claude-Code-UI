import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { XMarkIcon, PlusIcon } from '@heroicons/react/24/outline'

export interface Tab {
  id: string
  title: string
  isActive: boolean
}

interface TabBarProps {
  tabs: Tab[]
  activeTabId: string
  onTabClick: (tabId: string) => void
  onTabClose: (tabId: string) => void
  onNewTab: () => void
}

export default function TabBar({ tabs, activeTabId, onTabClick, onTabClose, onNewTab }: TabBarProps) {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null)

  return (
    <div className="flex items-center bg-bg-primary border-b border-border">
      <div className="flex-1 flex items-center min-w-0">
        <AnimatePresence mode="popLayout">
          {tabs.map((tab) => (
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="relative flex items-center"
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
            >
              <button
                onClick={() => onTabClick(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 border-r border-border
                  transition-all duration-200 min-w-[120px] max-w-[200px]
                  ${tab.id === activeTabId 
                    ? 'bg-bg-secondary text-text-primary' 
                    : 'bg-bg-primary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }
                `}
              >
                <span className="truncate text-sm">{tab.title}</span>
                {(tab.id === activeTabId || hoveredTab === tab.id) && tabs.length > 1 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onTabClose(tab.id)
                    }}
                    className="ml-auto -mr-1 p-0.5 rounded hover:bg-bg-tertiary"
                  >
                    <XMarkIcon className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </button>
              {tab.id === activeTabId && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-blue"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        <motion.button
          onClick={onNewTab}
          className="p-2.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <PlusIcon className="w-4 h-4" />
        </motion.button>
      </div>
    </div>
  )
}