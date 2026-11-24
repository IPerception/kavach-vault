import { z } from 'zod'

// Zod 4 probes for eval support with `Function('')` before its first object parse, to
// decide whether it can JIT-compile a fast parser. Our CSP (default-src 'self', no
// 'unsafe-eval') blocks that, as intended. Zod catches the error and falls back, but
// the browser still logs a CSP violation. jitless skips the probe; validation results
// are identical. Imported first in main.tsx, before any schema is parsed.
z.config({ jitless: true })
