"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Etwas ist schiefgelaufen
        </h2>
        <p className="text-sm text-gray-500">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          Erneut versuchen
        </button>
      </div>
    </div>
  );
}
