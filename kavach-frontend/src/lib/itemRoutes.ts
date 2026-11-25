import { matchPath, type Location } from 'react-router-dom'

// New item / Edit open as dialogs on top of the current screen, but keep their own URLs
// (/add, /edit/7, ...) so Back closes them and a refresh reopens them. A link that opens
// one passes { background: <the screen underneath> } in its location state; App renders
// the normal screens at that background location and the dialog route on top.
export const ITEM_PATHS = ['/add', '/add-note', '/edit/:id', '/edit-note/:id'] as const

export interface ItemRouteState {
  background?: Location
}

export function isItemPath(pathname: string): boolean {
  return ITEM_PATHS.some((path) => matchPath(path, pathname) !== null)
}

/** The background a dialog was opened over, if it was opened from inside the app. */
export function backgroundOf(location: Location): Location | undefined {
  return (location.state as ItemRouteState | null)?.background
}

/**
 * Location state for a link that opens an item dialog. From inside a dialog (the
 * Password / Secure note switch) it keeps the original background instead of stacking.
 */
export function itemLinkState(location: Location): ItemRouteState {
  return { background: backgroundOf(location) ?? location }
}
