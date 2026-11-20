import { Component } from "react";
import { isRouteErrorResponse } from "react-router";

import NotFound from "../pages/shared/structure/NotFound";
import ServerError from "../pages/shared/structure/ServerError";

export default class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error) {
    if (!(isRouteErrorResponse(error) && error.status === 404)) console.error(error);
  }

  render() {
    if (this.state.hasError) {
      const { error } = this.state;
      if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;
      return <ServerError error={error} />;
    }

    return this.props.children;
  }
}
