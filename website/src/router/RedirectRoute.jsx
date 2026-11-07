import { Navigate, useParams, useLocation } from "react-router";

export default function RedirectRoute({ to }) {
  const params = useParams();
  const { search, hash } = useLocation();
  const pathname = typeof to === "function" ? to(params) : to;
  // keeps ?q=...&category=... when redirecting
  return <Navigate to={{ pathname, search, hash }} replace />;
}