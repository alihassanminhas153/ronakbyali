import { useSelector } from "react-redux";

/**
 * The only place the router reads the auth slice.
 */
export default function useSession() {
  const auth = useSelector((state) => state.auth);
  const user = auth.profile;
  const isLoggedIn = Boolean(user);
  const username = user?.username || "";
  const isAdmin = auth.roleFlags.isAdmin;
  const isReady = auth.authChecked;

  return { user, isLoggedIn, username, isAdmin, isReady };
}