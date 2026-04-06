import { useState, useRef, useCallback } from "react";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";
import { uploadFile } from "../lib/api";
import type { ParsedLabResult } from "../types";

interface PdfUploadProps {
  onParsed: (result: ParsedLabResult) => void;
}

export function PdfUpload({ onParsed }: PdfUploadProps) {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf") {
        setStatus("error");
        setError("Please upload a PDF file");
        return;
      }

      setFileName(file.name);
      setStatus("uploading");
      setError("");

      try {
        const result = await uploadFile<ParsedLabResult>("/labs/parse-pdf", file);
        setStatus("success");
        onParsed(result);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Failed to parse PDF");
      }
    },
    [onParsed],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 transition-colors ${
        dragOver
          ? "border-blue-400 bg-blue-50"
          : status === "error"
            ? "border-red-300 bg-red-50"
            : status === "success"
              ? "border-green-300 bg-green-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        onChange={handleInputChange}
        className="hidden"
      />

      {status === "uploading" ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-600">
            Parsing <span className="font-medium">{fileName}</span>...
          </p>
        </>
      ) : status === "success" ? (
        <>
          <FileText className="h-8 w-8 text-green-500" />
          <p className="text-sm text-green-700">
            <span className="font-medium">{fileName}</span> parsed successfully
          </p>
          <p className="text-xs text-gray-500">Drop another PDF to replace</p>
        </>
      ) : status === "error" ? (
        <>
          <AlertCircle className="h-8 w-8 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
          <p className="text-xs text-gray-500">Click or drop to try again</p>
        </>
      ) : (
        <>
          <Upload className="h-8 w-8 text-gray-400" />
          <div className="text-center">
            <p className="text-sm text-gray-600">
              <span className="font-medium text-blue-600">Upload LabCorp PDF</span> or
              drag and drop
            </p>
            <p className="mt-1 text-xs text-gray-500">PDF files only</p>
          </div>
        </>
      )}
    </div>
  );
}
