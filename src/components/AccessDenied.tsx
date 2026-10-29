import { useAuthStore } from '../stores/authStore';

export default function AccessDenied() {
  const { user } = useAuthStore();
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V9a4 4 0 00-8 0v2" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Access Denied</h2>
        <p className="text-sm text-gray-500 mb-4">
          You don't have permission to access this module.
          {user && (
            <span className="block mt-1 text-xs text-gray-400">
              Signed in as {user.firstName} {user.lastName} ({user.role.replace(/_/g, ' ')})
            </span>
          )}
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
