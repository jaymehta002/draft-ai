"use client"

import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { EntryCard, FormField } from "@/components/profile/profile-fields"
import { emptyProject, type ProjectEntry } from "@/lib/candidate-profile"

type ProjectsEditorProps = {
  entries: ProjectEntry[]
  onChange: (entries: ProjectEntry[]) => void
  compact?: boolean
}

export function ProjectsEditor({ entries, onChange, compact }: ProjectsEditorProps) {
  const update = (id: string, patch: Partial<ProjectEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const addEntry = () => onChange([...entries, emptyProject()])
  const removeEntry = (id: string) => onChange(entries.filter((e) => e.id !== id))

  return (
    <div className="space-y-4">
      {!compact && (
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Projects</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Showcase personal or professional projects that highlight your skills.
          </p>
        </div>
      )}

      {entries.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">No projects added yet</p>
        </div>
      )}

      {entries.map((entry, index) => (
        <EntryCard
          key={entry.id}
          title={`Project ${index + 1}`}
          canRemove
          onRemove={() => removeEntry(entry.id)}
        >
          <FormField label="Project name">
            <Input
              value={entry.name}
              onChange={(e) => update(entry.id, { name: e.target.value })}
              placeholder="E-commerce platform"
              className="h-9"
            />
          </FormField>

          <FormField label="Description">
            <Textarea
              value={entry.description}
              onChange={(e) => update(entry.id, { description: e.target.value })}
              placeholder="What you built and the impact..."
              className="min-h-20 resize-y"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Technologies">
              <Input
                value={entry.technologies}
                onChange={(e) => update(entry.id, { technologies: e.target.value })}
                placeholder="React, Node.js, PostgreSQL"
                className="h-9"
              />
            </FormField>
            <FormField label="Link (optional)">
              <Input
                value={entry.url}
                onChange={(e) => update(entry.id, { url: e.target.value })}
                placeholder="https://github.com/..."
                className="h-9"
              />
            </FormField>
          </div>
        </EntryCard>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addEntry} className="rounded-full">
        <Plus className="h-4 w-4" />
        Add project
      </Button>
    </div>
  )
}
