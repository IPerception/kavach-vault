import { create } from 'zustand'
import { logout } from '../api/auth'

type VaultStatus = 'loading' | 'setup' | 'locked' | 'unlocked'
export type KavachTheme = 'amber' | 'sky' | 'emerald' | 'rose' | 'violet'

interface KavachStore {
  status: VaultStatus
  lastActivity: number
  theme: KavachTheme
  setStatus: (status: VaultStatus) => void
  recordActivity: () => void
  lock: () => void
  doLogout: () => Promise<void>
  unlock: () => void
  setTheme: (theme: KavachTheme) => void
}

export const useKavachStore = create<KavachStore>((set) => ({
  status: 'loading',
  lastActivity: Date.now(),
  theme: (localStorage.getItem('kavach_theme') as KavachTheme) ?? 'amber',

  setStatus: (status) => set({ status }),

  recordActivity: () => set({ lastActivity: Date.now() }),

  lock: () => set({ status: 'locked' }),

  doLogout: async () => {
    try {
      await logout()
    } catch {
      // ignore — clear state regardless
    }
    set({ status: 'locked' })
  },

  unlock: () => set({ status: 'unlocked', lastActivity: Date.now() }),

  setTheme: (theme) => {
    localStorage.setItem('kavach_theme', theme)
    document.documentElement.dataset.theme = theme
    set({ theme })
  },
}))
