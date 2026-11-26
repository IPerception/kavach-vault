import type { ReactNode } from 'react'
import { ColorModeToggle } from './ColorModeToggle'

/** Mono footer facts shared by the lock screen and the setup wizard. */
function TrustFooter() {
  return (
    <footer className="flex flex-wrap justify-center gap-x-4 gap-y-1 font-mono text-2xs text-muted">
      <span>v{__APP_VERSION__}</span>
      <span>{window.location.origin}</span>
      <span>PBKDF2 600k + AES-256-GCM</span>
      <span>local only</span>
    </footer>
  )
}

interface BrandHeroProps {
  children: ReactNode
  /** Wider card and a shorter banner crop: the setup wizard's longer forms. */
  wide?: boolean
}

/**
 * Full-page frame for the screens shown before the vault opens (lock, setup): the gold
 * banner on top of the card, the colour mode switch in the corner, the trust footer below.
 * The banner keeps its own near-black in both modes; it is the brand, not a surface.
 */
export function BrandHero({ children, wide = false }: BrandHeroProps) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-4 bg-bg px-4 py-8">
      <ColorModeToggle className="absolute right-4 top-4" />
      <main
        className={`w-full ${wide ? 'max-w-2xl' : 'max-w-xl'} overflow-hidden rounded-panel border border-border bg-panel shadow-surface`}
      >
        <img
          src="/kavach-banner.webp"
          width={1120}
          height={560}
          alt="Kavach - Personalized Password Management"
          className={`block w-full bg-[#010911] object-cover ${wide ? 'aspect-[5/2]' : 'aspect-[2/1]'}`}
        />
        <div className="p-7">{children}</div>
      </main>
      <TrustFooter />
    </div>
  )
}
