import { PageLoader } from "./common/Loaders";

export default function LoadingSpinner({ message = "Loading..." }) {
  return <PageLoader message={message} className="min-h-screen" />;
}
