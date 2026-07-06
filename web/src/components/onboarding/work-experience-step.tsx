"use client"

import { motion } from "framer-motion"
import { WorkExperienceEditor, isWorkExperienceStepValid } from "@/components/profile/work-experience-editor"
import type { WorkExperienceEntry } from "@/lib/candidate-profile"

export function WorkExperienceStep({
  entries,
  onChange,
  aiFilled,
}: {
  entries: WorkExperienceEntry[]
  onChange: (entries: WorkExperienceEntry[]) => void
  aiFilled?: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 flex flex-col"
    >
      <WorkExperienceEditor entries={entries} onChange={onChange} aiFilled={aiFilled} />
    </motion.div>
  )
}

export { isWorkExperienceStepValid }
