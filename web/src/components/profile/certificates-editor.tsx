"use client"

import { Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EntryCard, FormField, MonthYearSelect } from "@/components/profile/profile-fields"
import { emptyCertificate, type CertificateEntry } from "@/lib/candidate-profile"

type CertificatesEditorProps = {
  entries: CertificateEntry[]
  onChange: (entries: CertificateEntry[]) => void
  compact?: boolean
}

export function CertificatesEditor({ entries, onChange, compact }: CertificatesEditorProps) {
  const update = (id: string, patch: Partial<CertificateEntry>) => {
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  const addEntry = () => onChange([...entries, emptyCertificate()])
  const removeEntry = (id: string) => onChange(entries.filter((e) => e.id !== id))

  return (
    <div className="space-y-4">
      {!compact && (
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Certificates</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Professional certifications and credentials worth highlighting.
          </p>
        </div>
      )}

      {entries.length === 0 && (
        <div className="rounded-xl border border-dashed border-border/60 p-8 text-center">
          <p className="text-sm text-muted-foreground">No certificates added yet</p>
        </div>
      )}

      {entries.map((entry, index) => (
        <EntryCard
          key={entry.id}
          title={`Certificate ${index + 1}`}
          canRemove
          onRemove={() => removeEntry(entry.id)}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Certificate name">
              <Input
                value={entry.name}
                onChange={(e) => update(entry.id, { name: e.target.value })}
                placeholder="AWS Solutions Architect"
                className="h-9"
              />
            </FormField>
            <FormField label="Issuing organization">
              <Input
                value={entry.issuer}
                onChange={(e) => update(entry.id, { issuer: e.target.value })}
                placeholder="Amazon Web Services"
                className="h-9"
              />
            </FormField>
          </div>

          <MonthYearSelect
            month={entry.issueMonth}
            year={entry.issueYear}
            onMonthChange={(v) => update(entry.id, { issueMonth: v })}
            onYearChange={(v) => update(entry.id, { issueYear: v })}
            monthLabel="Issue month"
            yearLabel="Issue year"
          />

          <FormField label="Credential URL (optional)">
            <Input
              value={entry.url}
              onChange={(e) => update(entry.id, { url: e.target.value })}
              placeholder="https://credly.com/badges/..."
              className="h-9"
            />
          </FormField>
        </EntryCard>
      ))}

      <Button type="button" variant="outline" size="sm" onClick={addEntry} className="rounded-full">
        <Plus className="h-4 w-4" />
        Add certificate
      </Button>
    </div>
  )
}
