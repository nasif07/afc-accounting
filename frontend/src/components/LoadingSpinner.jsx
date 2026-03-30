import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Loading...' }) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="text-center">
        <div className="inline-flex items-center justify-center">
          <Loader2 size={48} className="text-blue-600 animate-spin" />
        </div>
        <p className="mt-4 text-lg font-medium text-slate-700">{message}</p>
        <p className="mt-2 text-sm text-slate-500">Please wait...</p>
      </div>
    </div>
  );
}
