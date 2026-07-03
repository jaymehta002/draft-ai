"use client"

import { motion } from "framer-motion"
import { ProjectsEditor } from "@/components/profile/projects-editor"
import type { ProjectEntry } from "@/lib/candidate-profile"

export function ProjectsStep({
  entries,
  onChange,
}: {
  entries: ProjectEntry[]
  onChange: (entries: ProjectEntry[]) => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col"
    >
      <ProjectsEditor entries={entries} onChange={onChange} />
    </motion.div>
  )
}
