import { useState, useCallback } from 'react'
import type { Message } from '../types'

export interface ChatTab {
  id: string
  title: string
  messages: Message[]
  sessionId?: string
}

export function useTabs() {
  const [tabs, setTabs] = useState<ChatTab[]>([
    {
      id: 'tab_1',
      title: 'New Chat',
      messages: []
    }
  ])
  const [activeTabId, setActiveTabId] = useState('tab_1')

  const createTab = useCallback(() => {
    const newTab: ChatTab = {
      id: `tab_${Date.now()}`,
      title: 'New Chat',
      messages: []
    }
    setTabs(prev => [...prev, newTab])
    setActiveTabId(newTab.id)
    return newTab.id
  }, [])

  const closeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const newTabs = prev.filter(tab => tab.id !== tabId)
      
      // If we're closing the active tab, switch to another one
      if (tabId === activeTabId && newTabs.length > 0) {
        const currentIndex = prev.findIndex(tab => tab.id === tabId)
        const newIndex = currentIndex >= newTabs.length ? newTabs.length - 1 : currentIndex
        setActiveTabId(newTabs[newIndex].id)
      }
      
      // Always keep at least one tab
      if (newTabs.length === 0) {
        const newTab = {
          id: `tab_${Date.now()}`,
          title: 'New Chat',
          messages: []
        }
        setActiveTabId(newTab.id)
        return [newTab]
      }
      
      return newTabs
    })
  }, [activeTabId])

  const updateTab = useCallback((tabId: string, updates: Partial<ChatTab>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, ...updates } : tab
    ))
  }, [])

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId)
  }, [])

  const getActiveTab = useCallback(() => {
    return tabs.find(tab => tab.id === activeTabId)
  }, [tabs, activeTabId])

  return {
    tabs,
    activeTabId,
    createTab,
    closeTab,
    updateTab,
    switchTab,
    getActiveTab
  }
}