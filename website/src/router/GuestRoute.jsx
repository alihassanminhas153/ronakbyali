import { useEffect, useRef, useState } from "react";
import { Navigate, Outlet } from "react-router";
import useSession from "./useSession";

// Sign in / sign up are for logged-out people only.
//
//  - Someone who is ALREADY logged in when they open these pages (typed the URL,
//    pressed back, followed an old link) is sent to their own panel:
//    staff -> /team/:username, everyone else -> /:username.
//  - Someone who logs in or signs up ON these pages is not redirected here.
//    Signin / Signup / ProfileStep send them on themselves (staff -> admin panel,
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

  if (!isReady) return null;

  if (isLoggedIn && arrivedLoggedIn) {
    return <Navigate to={panel} replace />;
  }
  return <Outlet />;
}