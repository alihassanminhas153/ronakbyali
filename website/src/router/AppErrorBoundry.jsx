import { Component } from "react";
import ServerError from "../pages/shared/structure/ServerError";

/* Catches uncaught errors thrown while React renders its children and shows the
   "Something went wrong" page instead of a blank screen.

   It does NOT handle: missing routes (NotFound), failed API calls that already
   show their own message, or errors inside event handlers / async code.

     <AppErrorBoundary>
       <App />
     </AppErrorBoundary>

   resetKey (optional): when this value changes the boundary clears itself, so
   navigating to another page recovers automatically. Example: resetKey={location.pathname}
*/
export default class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("[AppErrorBoundary] UI crashed:", error, info?.componentStack);
    // TODO: send to an error-reporting service here (Sentry, LogRocket, ...).
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.reset();
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return <ServerError error={this.state.error} onRetry={this.reset} />;
    }
    return this.props.children;
  }
}