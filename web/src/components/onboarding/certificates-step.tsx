"use client"

import { motion } from "framer-motion"
import { CertificatesEditor } from "@/components/profile/certificates-editor"
import type { CertificateEntry } from "@/lib/candidate-profile"

export function CertificatesStep({
  entries,
  onChange,
}: {
  entries: CertificateEntry[]
  onChange: (entries: CertificateEntry[]) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col"
    >
      <CertificatesEditor entries={entries} onChange={onChange} />
    </motion.div>
  )
}
