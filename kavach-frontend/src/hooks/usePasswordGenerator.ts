import { useState, useCallback } from 'react'

interface GeneratorOptions {
  length?: number
  includeUppercase?: boolean
  includeLowercase?: boolean
  includeNumbers?: boolean
  includeSymbols?: boolean
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?'

export function usePasswordGenerator(defaults: GeneratorOptions = {}) {
  const [options, setOptions] = useState({
    length: defaults.length ?? 16,
    includeUppercase: defaults.includeUppercase ?? true,
    includeLowercase: defaults.includeLowercase ?? true,
    includeNumbers: defaults.includeNumbers ?? true,
    includeSymbols: defaults.includeSymbols ?? true,
  })

  const generate = useCallback((): string => {
    let charset = ''
    if (options.includeUppercase) charset += UPPERCASE
    if (options.includeLowercase) charset += LOWERCASE
    if (options.includeNumbers) charset += NUMBERS
    if (options.includeSymbols) charset += SYMBOLS
    if (!charset) charset = LOWERCASE

    // window.crypto.getRandomValues — browser Web Crypto API (available globally as crypto)
    const array = new Uint32Array(options.length)
    window.crypto.getRandomValues(array)
    return Array.from(array, (n) => charset[n % charset.length]).join('')
  }, [options])

  return { options, setOptions, generate }
}
