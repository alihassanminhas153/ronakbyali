import { Link } from "react-router";
import { PATHS } from "../../../router/path";

export default function NotFound() {
  return (
    <div>
      <h1>Page not found</h1>
      <Link to={PATHS.home}>Back to the store</Link>
    </div>
  );
}