/**
 * FileUpload -- F2: DXF-Datei hochladen.
 *
 * Bietet einen Upload-Button und eine Drag-and-Drop-Zone.
 * Akzeptiert nur .dxf-Dateien. Liest den Dateiinhalt mit FileReader.
 */

"use client";

import { useCallback, useRef, useState } from "react";

interface FileUploadProps {
  onFileLoaded: (content: string, fileName: string) => void;
}

export function FileUpload({ onFileLoaded }: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(
    (file: File) => {
      // Validate file extension
      if (!file.name.toLowerCase().endsWith(".dxf")) {
        setError("Nur .dxf-Dateien werden akzeptiert.");
        return;
      }

      // Validate file size (max 50 MB)
      if (file.size > 50 * 1024 * 1024) {
        setError("Datei zu gross (max. 50 MB)");
        return;
      }

      setError(null);
      setIsLoading(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === "string") {
          onFileLoaded(content, file.name);
        } else {
          setError("Datei konnte nicht gelesen werden.");
        }
        setIsLoading(false);
      };
      reader.onerror = () => {
        setError("Fehler beim Lesen der Datei.");
        setIsLoading(false);
      };
      reader.readAsText(file);
    },
    [onFileLoaded],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-gray-900">
          DXF-Datei hochladen
        </h2>
        <p className="text-sm text-gray-500">
          Waehlen Sie eine DXF-Datei (R12 ASCII) aus oder ziehen Sie sie in das
          Feld.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={[
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors",
          isDragOver
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100",
        ].join(" ")}
      >
        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span className="text-sm text-gray-500">Datei wird geladen...</span>
          </div>
        ) : (
          <>
            <svg
              className="mb-3 h-10 w-10 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              Datei hierher ziehen oder klicken
            </span>
            <span className="mt-1 text-xs text-gray-400">
              Nur .dxf-Dateien (R12 ASCII)
            </span>
          </>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".dxf"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <p className="text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
