import { useEffect, useState } from 'react'

const RELEASES_URL =
  'https://api.github.com/repos/IPerception/kavach-vault/releases/latest'

function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => v.replace(/^v/, '').split('.').map(Number)
  const [lMaj, lMin, lPatch] = parse(latest)
  const [cMaj, cMin, cPatch] = parse(current)
  if (lMaj !== cMaj) return lMaj > cMaj
  if (lMin !== cMin) return lMin > cMin
  return lPatch > cPatch
}

export function useUpdateCheck(): string | null {
  const [latestVersion, setLatestVersion] = useState<string | null>(null)

  useEffect(() => {
    fetch(RELEASES_URL)
      .then((r) => {
        if (!r.ok) return null
        return r.json() as Promise<{ tag_name?: string }>
      })
      .then((data) => {
        if (!data?.tag_name) return
        const tag = data.tag_name.replace(/^v/, '')
        if (isNewer(tag, __APP_VERSION__)) {
          setLatestVersion(tag)
        }
      })
      .catch(() => {})
  }, [])

  return latestVersion
}

export { isNewer }
