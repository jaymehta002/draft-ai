"use client"

import { motion } from "framer-motion"
import { Upload, FileText, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

export function ResumeUploadStep({
  onUpload,
  onManualEntry,
  uploading,
  error,
}: {
  onUpload: (file: File) => void
  onManualEntry: () => void
  uploading: boolean
  error: string | null
}) {
  const handleFile = (file: File | null) => {
    if (file) onUpload(file)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex-1 flex flex-col justify-center"
    >
      <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mb-3">
        Upload your resume
      </h1>
      <p className="text-muted-foreground text-lg mb-10">
        We&apos;ll read it and pre-fill your profile. PDF or plain text works best.
      </p>

      <label
        className={cn(
          "relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card px-6 py-16 cursor-pointer transition-colors",
          uploading ? "opacity-60 pointer-events-none" : "hover:border-primary/50 hover:bg-primary/5"
        )}
      >
        <input
          type="file"
          accept=".pdf,.txt,.md,application/pdf,text/plain"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
        {uploading ? (
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        ) : (
          <Upload className="h-10 w-10 text-primary mb-4" />
        )}
        <span className="text-base font-medium text-foreground">
          {uploading ? "Reading your resume..." : "Tap to upload PDF"}
        </span>
        <span className="text-sm text-muted-foreground mt-1">or drag and drop</span>
      </label>

      {error && (
        <p className="mt-4 text-sm text-destructive">{error}</p>
      )}

      <div className="mt-6 flex flex-col items-center gap-3">
        <span className="text-sm text-muted-foreground">or</span>
        <button
          type="button"
          onClick={onManualEntry}
          disabled={uploading}
          className="text-sm font-medium text-primary hover:underline disabled:opacity-50"
        >
          Enter details manually
        </button>
      </div>

      <div className="mt-8 flex items-start gap-3 text-sm text-muted-foreground">
        <FileText className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Scanned or image-only PDFs may not parse well. If that happens, we&apos;ll ask you each question manually.
        </p>
      </div>
    </motion.div>
  )
}
