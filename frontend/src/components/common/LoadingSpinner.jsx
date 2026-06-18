import { PageLoader } from "./Loaders";

export default function LoadingSpinner({ message = "Loading...something" }) {
  return <PageLoader message={message} className="min-h-screen" />;
}
