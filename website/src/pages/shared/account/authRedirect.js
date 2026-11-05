const STAFF_ROLES = ['admin', 'support', 'manager'];
const AUTH_PATHS = ['/welcome-back', '/create-account', '/auth/callback'];

// Where to send someone right after they log in.
//  1. the page they were trying to reach (`from`), if it is a safe local path
//  2. staff  -> /team/:username
//  3. others -> /:username
export function homePathFor(profile, from) {
  if (
    typeof from === 'string' &&
    from.startsWith('/') &&
    !from.startsWith('//') &&
    !AUTH_PATHS.some((p) => from.startsWith(p))
  ) {
    return from;
  }
  const username = profile?.username;
  if (!username) return '/';
  return STAFF_ROLES.includes(profile.role) ? `/team/${username}` : `/${username}`;
}