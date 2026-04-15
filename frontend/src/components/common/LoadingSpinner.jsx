import logo from "/afc-logo.jpg";

export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      
      {/* Heartbeat Animation */}
      <div className="animate-heartbeat text-red-500">
        {/* <Heart size={48} fill="currentColor" /> */}
        <img className="w-40" src={logo} alt="Loading" />
      </div>

      {/* Message */}
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}