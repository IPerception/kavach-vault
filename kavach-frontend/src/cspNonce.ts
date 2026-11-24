import { setNonce } from 'get-nonce'

// The backend stamps a per-request CSP nonce into this meta tag (SpaController).
// react-style-singleton, used by the Radix dialog scroll lock, reads it through
// get-nonce so its injected <style> element passes style-src. The Vite dev server
// serves the raw placeholder (and sends no CSP), so it is ignored there.
const PLACEHOLDER = '__CSP_NONCE__'

const nonce = document
  .querySelector<HTMLMetaElement>('meta[name="csp-nonce"]')
  ?.content

if (nonce && nonce !== PLACEHOLDER) {
  setNonce(nonce)
}
