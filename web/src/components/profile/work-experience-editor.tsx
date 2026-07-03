"use client"

import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { EntryCard, FormField, MonthYearSelect } from "@/components/profile/profile-fields"
import {
  emptyWorkExperience,
  type WorkExperienceEntry,
} from "@/lib/candidate-profile"
import { cn } from "@/lib/utils"

type WorkExperienceEditorProps = {
  entries: WorkExperienceEntry[]
  onChange: (entries: WorkExperienceEntry[]) => void
  compact?: boolean
}

export function WorkExperienceEditor({ entries, onChange, compact }: WorkExperienceEditorProps) {
  const update = (id: string, patch: Partial<WorkExperienceEntry>) => {
    onChange(
      entries.map((e) => {
        if (e.id !== id) {
          if (patch.isCurrent) return { ...e, isCurrent: false }
          return e
        }
        return { ...e, ...patch }
      })
    )
  }

  const addEntry = () => {
    onChange([...entries, emptyWorkExperience(false)])
  }

  const removeEntry = (id: string) => {
    if (entries.length <= 1) return
    onChange(entries.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-4">
      {!compact && (
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Work experience</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Add your roles with title, company, and what you did. Mark your current role.
          </p>
        </div>
      )}

      {entries.map((entry, index) => (
        <EntryCard
          key={entry.id}
          title={entry.isCurrent ? "Current role" : `Role ${index + 1}`}
          subtitle={entry.isCurrent ? "You are currently working here" : undefined}
          canRemove={entries.length > 1}
          onRemove={() => removeEntry(entry.id)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Job title">
              <Input
                value={entry.title}
                onChange={(e) => update(entry.id, { title: e.target.value })}
                placeholder="Senior Software Engineer"
                className="h-9"
              />
            </FormField>
            <FormField label="Company">
              <Input
                value={entry.company}
                onChange={(e) => update(entry.id, { company: e.target.value })}
                placeholder="Acme Inc."
                className="h-9"
              />
            </FormField>
          </div>

          <FormField label="Description" hint="Key responsibilities, impact, and technologies">
            <Textarea
              value={entry.description}
              onChange={(e) => update(entry.id, { description: e.target.value })}
              placeholder="Built and shipped features that..."
              className="min-h-24 resize-y"
            />
          </FormField>

          <MonthYearSelect
            month={entry.joinMonth}
            year={entry.joinYear}
            onMonthChange={(v) => update(entry.id, { joinMonth: v })}
            onYearChange={(v) => update(entry.id, { joinYear: v })}
            monthLabel="Start month"
            yearLabel="Start year"
          />

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={entry.isCurrent}
              onChange={(e) =>
                update(entry.id, {
                  isCurrent: e.target.checked,
                  endMonth: e.target.checked ? "" : entry.endMonth,
                  endYear: e.target.checked ? "" : entry.endYear,
                })
              }
              className="h-4 w-4 rounded border-border accent-foreground"
            />
            <span className="text-sm">I currently work here</span>
          </label>

          {entry.isCurrent ? (
            <FormField label="Current CTC" hint="Your current compensation (e.g. ₹18 LPA, $150k)">
              <Input
                value={entry.currentCtc}
                onChange={(e) => update(entry.id, { currentCtc: e.target.value })}
                placeholder="₹18 LPA / $150,000"
                className="h-9"
              />
            </FormField>
          ) : (
            <MonthYearSelect
              month={entry.endMonth}
              year={entry.endYear}
              onMonthChange={(v) => update(entry.id, { endMonth: v })}
              onYearChange={(v) => update(entry.id, { endYear: v })}
              monthLabel="End month"
              yearLabel="End year"
            />
          )}
        </EntryCard>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addEntry} className="rounded-full">
        <Plus className="h-4 w-4" />
        Add another role
      </Button>
    </div>
  )
}

export function isWorkExperienceStepValid(entries: WorkExperienceEntry[]): boolean {
  return entries.some(
    (e) =>
      e.title.trim() &&
      e.company.trim() &&
      e.description.trim() &&
      e.joinMonth &&
      e.joinYear &&
      (!e.isCurrent || e.currentCtc.trim())
  )
}
