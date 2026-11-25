function parse(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

/**
 * The URL to link to, or undefined. Only http and https are linkable: a stored URL comes
 * from user input and CSV import, so javascript:, data: and the like must never become an href.
 */
export function safeHref(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim()
  if (!trimmed) return undefined
  const parsed = parse(trimmed)
  return parsed && (parsed.protocol === 'http:' || parsed.protocol === 'https:') ? parsed.href : undefined
}

/**
 * The hostname to display for a stored URL, or undefined when there is nothing sensible
 * to show. A value without a scheme ("github.com/login") is read as https.
 */
export function hostOf(url: string | null | undefined): string | undefined {
  const trimmed = url?.trim()
  if (!trimmed) return undefined
  const parsed = parse(trimmed)
  if (parsed === null) return parse(`https://${trimmed}`)?.hostname || undefined
  return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.hostname : undefined
}
