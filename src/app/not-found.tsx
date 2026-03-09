export default function NotFound() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-gray-900">
          Seite nicht gefunden
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Die angeforderte Seite existiert nicht.
        </p>
      </div>
    </div>
  );
}
