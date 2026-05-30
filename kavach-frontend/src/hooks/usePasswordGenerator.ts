import { useState, useCallback } from 'react'

export type Preset = 'custom' | 'pin' | 'alphanumeric' | 'passphrase'

export interface CustomOptions {
  length: number
  includeUppercase: boolean
  includeLowercase: boolean
  includeNumbers: boolean
  includeSymbols: boolean
}

export interface PassphraseOptions {
  wordCount: number
  separator: string
}

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz'
const NUMBERS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?'

// 256 memorable 4-letter words -- indexed by a single random byte
const WORDS: string[] = [
  'able','acid','aged','also','area','army','aunt','away',
  'back','ball','band','bank','base','bath','bear','beat',
  'beef','bell','belt','best','bill','bird','blow','blue',
  'boat','body','bold','bolt','bomb','bond','bone','book',
  'boot','born','boss','both','bowl','bulk','bull','burn',
  'calm','came','camp','card','care','cart','case','cash',
  'cast','cave','cell','chat','chip','city','clay','clip',
  'club','clue','coal','coat','code','coil','cold','come',
  'cook','cool','copy','cord','core','corn','cost','coup',
  'crew','crop','cure','dark','data','date','dawn','days',
  'dead','deal','dean','dear','debt','deck','deed','deep',
  'deer','desk','diet','dirt','disk','dock','does','doll',
  'dome','done','door','dose','dove','down','draw','drew',
  'drip','drop','drum','duck','duel','dune','dusk','dust',
  'duty','each','earn','east','easy','edge','emit','epic',
  'even','exam','face','fact','fair','fall','fame','farm',
  'fast','fate','felt','file','fill','film','find','fine',
  'fire','firm','fish','fist','flag','flat','flew','flow',
  'foam','fold','folk','font','food','fool','ford','fore',
  'fork','form','fort','foul','four','free','frog','from',
  'fuel','full','fund','fuse','gain','gale','game','gang',
  'gate','gave','gear','glow','glue','goal','gold','golf',
  'gone','good','grab','gray','grew','grid','grin','grip',
  'gulf','guru','hack','hail','half','hall','halt','hand',
  'hang','hard','harm','harp','hash','haze','head','heal',
  'heap','heat','heel','help','hero','high','hill','hint',
  'hire','hold','hole','home','hood','hook','hope','horn',
  'host','hour','hull','hunt','hurt','icon','idea','idle',
  'inch','iris','iron','isle','item','jade','jail','jazz',
  'jest','join','joke','jump','just','keen','keep','kick',
  'kill','kind','king','knee','knew','knot','know','lack',
]

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n)
  crypto.getRandomValues(buf)
  return buf
}

function randomChars(charset: string, length: number): string {
  const buf = new Uint32Array(length)
  crypto.getRandomValues(buf)
  return Array.from(buf, (n) => charset[n % charset.length]).join('')
}

export function usePasswordGenerator() {
  const [preset, setPreset] = useState<Preset>('custom')

  const [customOptions, setCustomOptions] = useState<CustomOptions>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
  })

  const [pinLength, setPinLength] = useState(6)
  const [alphanumLength, setAlphanumLength] = useState(16)

  const [passphraseOptions, setPassphraseOptions] = useState<PassphraseOptions>({
    wordCount: 4,
    separator: '-',
  })

  const generate = useCallback((): string => {
    switch (preset) {
      case 'pin':
        return randomChars(NUMBERS, pinLength)

      case 'alphanumeric':
        return randomChars(UPPERCASE + LOWERCASE + NUMBERS, alphanumLength)

      case 'passphrase': {
        const bytes = randomBytes(passphraseOptions.wordCount)
        return Array.from(bytes, (b) => WORDS[b]).join(passphraseOptions.separator)
      }

      default: {
        let charset = ''
        if (customOptions.includeUppercase) charset += UPPERCASE
        if (customOptions.includeLowercase) charset += LOWERCASE
        if (customOptions.includeNumbers) charset += NUMBERS
        if (customOptions.includeSymbols) charset += SYMBOLS
        if (!charset) charset = LOWERCASE
        return randomChars(charset, customOptions.length)
      }
    }
  }, [preset, customOptions, pinLength, alphanumLength, passphraseOptions])

  return {
    preset,
    setPreset,
    customOptions,
    setCustomOptions,
    pinLength,
    setPinLength,
    alphanumLength,
    setAlphanumLength,
    passphraseOptions,
    setPassphraseOptions,
    generate,
  }
}
