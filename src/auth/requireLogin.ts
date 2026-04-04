/**
 * When live API is on, require JWT login unless VITE_REQUIRE_LOGIN=false.
 */
export function shouldRequireLogin(): boolean {
  if (import.meta.env.VITE_USE_LIVE_API !== 'true') return false
  return import.meta.env.VITE_REQUIRE_LOGIN !== 'false'
}
