import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { Loader2 } from "lucide-react";
import useSession from "./useSession";

// Sign in / sign up are for logged-out people only.
//
//  - Someone who is ALREADY logged in when they open these pages (typed the URL,
//    pressed back, followed an old link) is sent to their own panel:
//    staff -> /team/:username, everyone else -> /:username.
//  - Someone who logs in or signs up ON these pages is not redirected here.
//    Signin / Signup send them on themselves (staff -> admin panel,
//    customers -> /products), so the two redirects can never fight each other.
export default function GuestRoute() {
  const { isReady, isLoggedIn, panel } = useSession();
  const seenLoggedIn = useRef(false);
  const [arrivedLoggedIn, setArrivedLoggedIn] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!seenLoggedIn.current) {
      seenLoggedIn.current = true;
      setArrivedLoggedIn(isLoggedIn);
    }
  }, [isReady, isLoggedIn]);

  if (!isReady) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fixed inset-0 z-[100] flex items-center justify-center bg-bg text-muted"
      >
        <Loader2 size={28} className="animate-spin text-accent" aria-hidden="true" />
        <span className="sr-only">Checking your session</span>
      </div>
    );
  }

  if (isLoggedIn && arrivedLoggedIn) {
    return <Navigate to={panel} replace />;
  }
  return <Outlet />;
}