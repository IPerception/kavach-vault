# Frontend Library Decisions

## Runtime Dependencies

### React 18 (`react`, `react-dom`)
**Purpose:** UI rendering framework.

React is the baseline choice here. The alternatives -- Vue, Svelte, Angular -- are all capable, but React's ecosystem depth (TanStack Query, Radix UI, React Hook Form all have first-class React support) meant we'd be fighting the grain with any other framework. React 18's concurrent features also give us `useTransition` if we need it later.

---

### React Router DOM v6 (`react-router-dom`)
**Purpose:** Client-side routing between screens (Dashboard, Add, Edit, Audit, Settings).

v6 is the current stable release. The alternative is TanStack Router, which has better type safety, but it's newer and less battle-tested. Since our routing is simple (8 routes, no nested data loading), React Router v6 is sufficient. We deliberately avoided file-based routing frameworks (Next.js, Remix) because Kavach is a local desktop app served as static files from a Spring Boot jar -- server-side rendering and a Node.js server are not available or desirable.

---

### TanStack Query v5 (`@tanstack/react-query`)
**Purpose:** All API server state -- fetching credentials, audit log, vault status; cache invalidation after mutations.

The alternative is SWR (by Vercel). Both solve the same problem. TanStack Query was chosen because it has a richer mutation API (`useMutation` with `onSuccess`/`onError`/`onSettled`), better devtools, and explicit cache invalidation via `queryClient.invalidateQueries()` which suits our pattern of "invalidate credentials after add/delete/update". SWR's mutation story is weaker and requires more manual cache management. We specifically did *not* use Redux Toolkit Query because RTK's boilerplate overhead (slices, store setup) isn't justified for a small app with no global action history needs.

---

### Zustand (`zustand`)
**Purpose:** Global vault state -- `status` (loading/setup/locked/unlocked) and `lastActivity` timestamp.

Alternatives considered: Redux, Jotai, Context + useReducer.

- **Redux** is excessive -- it requires actions, reducers, a store, and middleware for something that is literally two fields.
- **Context + useReducer** would work but causes full component-tree re-renders on any state change. With an inactivity watcher updating `lastActivity` frequently, this matters.
- **Jotai** is atom-based and would work fine, but Zustand's single-store model is simpler to reason about for auth/lock state, and Zustand's `getState()` (called outside React in the inactivity watcher interval) is a first-class API. Jotai's atoms can't be read outside a React context without a separate store reference.

Zustand's `getState()` is the specific reason it beats Jotai here -- the inactivity watcher interval fires outside the React render cycle and needs to read `lastActivity` without a hook.

---

### React Hook Form (`react-hook-form`)
**Purpose:** Form state, validation, and submission for all forms (Setup, Lock, Add/Edit Credential, Settings).

The alternative is Formik. React Hook Form wins on two points: it uses uncontrolled inputs by default (zero re-renders per keystroke vs. Formik's controlled inputs that re-render the whole form), and it integrates directly with Zod via `@hookform/resolvers`. For a password manager, where typing in a password field triggers a strength meter, minimizing re-renders matters. Formik re-renders the entire form on every keystroke; RHF only re-renders the field being edited.

---

### `@hookform/resolvers`
**Purpose:** Adapter that connects React Hook Form's validation to Zod schemas.

This is a thin glue package -- there's no alternative; it's the official resolver package from the RHF team.

---

### Zod (`zod`)
**Purpose:** Schema validation for form inputs, with TypeScript type inference (`z.infer<typeof schema>`).

The alternative is Yup. Zod was chosen because: (1) it's TypeScript-first -- schemas produce types directly, no separate interface needed; (2) it's faster than Yup at runtime; (3) the API is more composable (`.refine()`, `.transform()`). Yup is fine but requires keeping a Yup schema and a TypeScript interface in sync. Zod eliminates that duplication. This also mirrors the backend: Spring's Bean Validation annotations play the same role as Zod schemas -- each side validates its own boundary.

---

### Axios (`axios`)
**Purpose:** HTTP client for all API calls, configured with `withCredentials: true` (for `httpOnly` cookies) and a 401 interceptor.

The alternative is the native `fetch` API. Axios was chosen for three reasons specific to this app:
1. **Interceptors** -- the 401 interceptor that locks the vault on session expiry is cleaner with Axios than with `fetch` wrappers.
2. **`withCredentials` default** -- setting this globally on an Axios instance is one line; with `fetch` you'd set it on every call.
3. **Automatic JSON parsing** -- `fetch` requires `await response.json()`; Axios puts the parsed body in `response.data` directly.

The tradeoff is bundle size (~13 KB vs. 0 for fetch), which is acceptable here.

---

### Radix UI Primitives (`@radix-ui/react-dialog`, `@radix-ui/react-label`)
**Purpose:** Accessible, unstyled UI primitives for the OTP modal and form labels.

Radix UI is a headless component library -- it handles keyboard navigation, focus trapping, ARIA attributes, and portal rendering without imposing any visual style. The OTP reveal modal uses `@radix-ui/react-dialog` because:
- Focus is automatically trapped inside the modal (security-relevant: prevents accidental interaction with the vault while the password is visible).
- Escape key closes the modal out of the box.
- Portal rendering prevents z-index stacking issues.

Alternatives: Headless UI (by Tailwind Labs), React Aria (by Adobe). Headless UI is tightly coupled to the Tailwind ecosystem (fine here, but limited to React+Vue). React Aria is more complete but significantly heavier. Radix hits the right balance of completeness and bundle size for our use (we only need Dialog and Label).

We deliberately avoided "batteries-included" libraries like Material UI, Chakra UI, or shadcn/ui. Those either impose a design system that conflicts with our Tailwind/zinc palette or require significant configuration to match our dark theme.

---

### `clsx`
**Purpose:** Conditional CSS class merging (`clsx('base', condition && 'extra')`).

Single-function utility, no alternative needed. `classnames` is the older equivalent and identical in API; `clsx` is smaller and actively maintained. Used in every component that has conditional variants.

---

### `tailwind-merge`
**Purpose:** Resolves Tailwind class conflicts when merging className props (e.g., `p-4` from a default being overridden by `p-6` from a prop).

Without `tailwind-merge`, passing `className="p-6"` to a Card that already has `p-4` would produce both classes in the DOM, and Tailwind would apply whichever one appears last in the generated CSS -- unpredictable. `tailwind-merge` detects that both are padding utilities and keeps only the last one. It's only needed in reusable components that accept `className` overrides (Button, Card, Input, Badge).

---

### Lucide React (`lucide-react`)
**Purpose:** Icon set (Shield, Lock, Eye, Copy, RefreshCw, etc.).

Lucide is a tree-shakeable icon library -- only the icons imported are included in the bundle. The alternative is Heroicons (by Tailwind) or Phosphor Icons. Lucide was chosen because it has a larger icon set, consistent stroke-width, and works identically with Tailwind classes. All icons are imported by name, so the bundle only pays for what is used.

---

## Dev Dependencies

### Vite (`vite`, `@vitejs/plugin-react`)
**Purpose:** Build tool and dev server.

Create React App is deprecated. Vite is the current standard for React projects: it uses native ES modules for near-instant dev server startup and esbuild for transforms. The proxy config (`/api` -> `localhost:8080`) means the frontend dev server and the Spring Boot backend share an origin, avoiding CORS entirely during development. Webpack-based setups (CRA, custom) would work but are slower and more complex to configure.

---

### Vitest (`vitest`)
**Purpose:** Test runner.

Vitest is configured in `vite.config.ts` alongside the build config, uses the same transform pipeline (esbuild, TypeScript), and shares Vite's module resolution. This means tests run without a separate Babel config and Jest setup. Jest is the alternative -- but Jest requires separate `ts-jest` or `babel-jest` transformers to handle TypeScript and ES modules, which adds configuration friction. Since we're already on Vite, Vitest is the natural choice.

---

### Testing Library (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`)
**Purpose:** Component testing via DOM queries and user interaction simulation.

Testing Library encourages testing from the user's perspective (find elements by role, label, text) rather than by implementation details (component state, CSS classes). This is the industry standard for React component testing. There is no real alternative at the same level of adoption.

---

### TypeScript (`typescript`)
**Purpose:** Static typing across the entire frontend.

TypeScript catches type mismatches between API response shapes and component props at compile time. Given that the backend is Java (strongly typed) and we defined `types.ts` interfaces that mirror the backend DTOs, TypeScript ensures the contract is honored on both ends without needing runtime validation on every response.

---

### Tailwind CSS (`tailwindcss`, `autoprefixer`, `postcss`)
**Purpose:** Utility-first CSS framework.

The entire UI uses Tailwind classes directly in JSX -- no separate CSS files, no CSS modules, no CSS-in-JS. This matches the Kavach design constraint: a minimal, dark (zinc-palette) UI that doesn't need a design system's component library. Tailwind generates only the classes actually used (via content scanning), keeping the CSS bundle small. The alternative would be plain CSS modules, which are fine but require naming and maintaining separate files. CSS-in-JS (styled-components, Emotion) adds a runtime cost that isn't justified here.

---

*This document covers all 20 runtime and dev packages in `package.json`.*
