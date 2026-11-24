// Kavach shield + padlock mark. Geometry is copied from the approved Logo-Mark canvas;
// each size picks the variant that stays legible at that pixel size. Rendered as inline
// JSX (not an img import) because the CSP and assetsInlineLimit: 0 rule out data: URIs.

export type KavachMarkSize = 16 | 24 | 32 | 64

interface KavachMarkProps {
  size?: KavachMarkSize
  /** Accessible name. Ignored when decorative. */
  title?: string
  /** Hide from assistive tech (use when a text label sits next to the mark). */
  decorative?: boolean
  className?: string
}

const SHIELD = 'M32 4 54 11v19c0 14-10 24-22 30C20 54 10 44 10 30V11z'
const NAVY = '#1E3354'
const GOLD = '#D4A94A'
// Outline follows the mode token (#B8892E light, #D4A94A dark) via the CSS variable.
const OUTLINE = 'var(--k-accent-line)'

const STROKE: Record<KavachMarkSize, number> = { 16: 5, 24: 4.5, 32: 4, 64: 3 }

export function KavachMark({
  size = 32,
  title = 'Kavach',
  decorative = false,
  className,
}: KavachMarkProps) {
  const a11y = decorative
    ? { 'aria-hidden': true as const }
    : { role: 'img' as const, 'aria-label': title }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      data-variant={size}
      {...a11y}
    >
      <path
        d={SHIELD}
        fill={NAVY}
        strokeWidth={STROKE[size]}
        strokeLinejoin="round"
        style={{ stroke: OUTLINE }}
      />
      {size === 64 && (
        <>
          <path d="M32 8v48" stroke="#2A4470" strokeWidth={1} />
          <path
            d="M16 22v6h4M48 22v6h-4M16 40h5l2 3M48 40h-5l-2 3"
            fill="none"
            stroke="#B8924A"
            strokeWidth={1}
            opacity={0.8}
          />
        </>
      )}
      {size === 16 ? (
        <>
          <rect x="22" y="28" width="20" height="17" rx="3" fill={GOLD} />
          <path d="M26 28v-4a6 6 0 0 1 12 0v4" fill="none" stroke={GOLD} strokeWidth={4.5} />
        </>
      ) : (
        <>
          <path
            d="M26.5 29v-4.5a5.5 5.5 0 0 1 11 0V29"
            fill="none"
            stroke={GOLD}
            strokeWidth={size === 24 ? 4 : size === 32 ? 3.5 : 3}
          />
          <rect x="23" y="29" width="18" height="15" rx="2.5" fill={GOLD} />
          {size >= 32 && (
            <>
              <circle cx="32" cy="35" r="2" fill={NAVY} />
              <rect x="31" y="35.5" width="2" height="4.5" fill={NAVY} />
            </>
          )}
        </>
      )}
    </svg>
  )
}
