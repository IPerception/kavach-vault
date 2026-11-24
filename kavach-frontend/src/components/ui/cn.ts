import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// tailwind-merge does not know the custom tokens in index.css. Without this it reads
// `text-2xs` and `text-soft` as the same group and silently drops one of them. Keep the
// lists below in step with the @theme blocks in index.css.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['2xs'],
      color: [
        'bg', 'side', 'panel', 'raised', 'input', 'border', 'line', 'text', 'soft', 'muted',
        'nav-active', 'chip', 'chip-border', 'row-hover', 'tile', 'tile-fg', 'track',
        'accent', 'accent-fg', 'accent-line', 'accent-text',
        'ok-bar', 'ok-text', 'fair-bar', 'fair-text', 'weak-bar', 'weak-text',
        'warn-bg', 'warn-border', 'warn-text', 'star-off', 'ring', 'navy', 'gold',
      ],
      radius: ['control', 'panel'],
      shadow: ['surface'],
    },
  },
})

/** Joins class names (clsx) and resolves Tailwind conflicts, aware of the Kavach tokens. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
