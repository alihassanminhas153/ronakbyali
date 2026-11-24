import { PATHS } from '../../../router/path';
import { isStaffLabels } from '../../../lib/appwrite/user';

const AUTH_PATHS = [PATHS.signin, PATHS.signup, '/auth/callback'];

const isSafeLocalPath = (p) =>
  typeof p === 'string' &&
  p.startsWith('/') &&
  !p.startsWith('//') &&
  !AUTH_PATHS.some((a) => p.startsWith(a));

// Where to send someone right after they log in or create an account.
//  1. the page they were trying to reach (`from`), if it is a safe local path
//     (customers never get sent to /team/..., they would only be bounced back)
//  2. staff (admin / support / manager) -> admin panel  /team/:username
//  3. everyone else (customers, new accounts) -> /products
//
// Signin, GuestRoute, AuthCallback and Signup all use this one function,
// so they can never disagree about where a person lands.
export function homePathFor(profile, from) {
  const staff = isStaffLabels(Array.isArray(profile?.labels) ? profile.labels : []);

  if (isSafeLocalPath(from) && (staff || !/^\/team(\/|$)/.test(from))) {
    return from;
  }
  if (staff && profile?.username) return PATHS.admin.overview(profile.username);
  return PATHS.products;
}