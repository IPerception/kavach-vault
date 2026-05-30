import { create } from 'zustand'
import { logout } from '../api/auth'

type VaultStatus = 'loading' | 'setup' | 'locked' | 'unlocked'
export type KavachTheme = 'amber' | 'sky' | 'emerald' | 'rose' | 'violet'
export type ColorMode = 'dark' | 'light'

interface KavachStore {
  status: VaultStatus
  lastActivity: number
  theme: KavachTheme
  colorMode: ColorMode
  setStatus: (status: VaultStatus) => void
  recordActivity: () => void
  lock: () => void
  doLogout: () => Promise<void>
  unlock: () => void
  setTheme: (theme: KavachTheme) => void
  setColorMode: (mode: ColorMode) => void
}

export const useKavachStore = create<KavachStore>((set) => ({
  status: 'loading',
  lastActivity: Date.now(),
  theme: (localStorage.getItem('kavach_theme') as KavachTheme) ?? 'amber',
  colorMode: (localStorage.getItem('kavach_color_mode') as ColorMode) ?? 'dark',

  setStatus: (status) => set({ status }),

  recordActivity: () => set({ lastActivity: Date.now() }),

  lock: () => set({ status: 'locked' }),

  doLogout: async () => {
    try {
      await logout()
    } catch {
      // ignore -- clear state regardless
    }
    set({ status: 'locked' })
  },

  unlock: () => set({ status: 'unlocked', lastActivity: Date.now() }),

  setTheme: (theme) => {
    localStorage.setItem('kavach_theme', theme)
    document.documentElement.dataset.theme = theme
    set({ theme })
  },

  setColorMode: (colorMode) => {
    localStorage.setItem('kavach_color_mode', colorMode)
    document.documentElement.classList.toggle('dark', colorMode === 'dark')
    set({ colorMode })
  },
}))
