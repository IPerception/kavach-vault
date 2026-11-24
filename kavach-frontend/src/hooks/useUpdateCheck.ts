import { useCallback, useState } from 'react'

const RELEASES_URL =
  'https://api.github.com/repos/IPerception/kavach-vault/releases/latest'

export const RELEASES_PAGE = 'https://github.com/IPerception/kavach-vault/releases'

export type UpdateStatus =
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'current' }
  | { state: 'available'; version: string }
  | { state: 'error' }

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const [lMaj, lMin, lPatch] = parse(latest)
  const [cMaj, cMin, cPatch] = parse(current)
  if (lMaj !== cMaj) return lMaj > cMaj
  if (lMin !== cMin) return lMin > cMin
  return lPatch > cPatch
}

/**
 * Manual update check. Kavach is local-first, so nothing contacts GitHub until the user
 * calls check() (the "Check for updates" button in Settings). Notification only: it never
 * downloads or installs anything.
 */
export function useUpdateCheck(): { status: UpdateStatus; check: () => Promise<void> } {
  const [status, setStatus] = useState<UpdateStatus>({ state: 'idle' })

  const check = useCallback(async () => {
    setStatus({ state: 'checking' })
    try {
      const r = await fetch(RELEASES_URL)
      if (!r.ok) {
        setStatus({ state: 'error' })
        return
      }
      const data = (await r.json()) as { tag_name?: string }
      if (!data?.tag_name) {
        setStatus({ state: 'error' })
        return
      }
      const tag = data.tag_name.replace(/^v/, '')
      setStatus(isNewer(tag, __APP_VERSION__) ? { state: 'available', version: tag } : { state: 'current' })
    } catch {
      setStatus({ state: 'error' })
    }
  }, [])

  return { status, check }
}

export { isNewer }
