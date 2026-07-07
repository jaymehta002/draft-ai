import type { DashboardSection } from "@/components/app-sidebar"

export const DASHBOARD_SECTION_PATHS: Record<DashboardSection, string> = {
  analytics: "/dashboard",
  pipeline: "/dashboard/pipeline",
  drafts: "/dashboard/drafts",
  templates: "/dashboard/templates",
  emails: "/dashboard/emails",
  dms: "/dashboard/dms",
  profile: "/dashboard/profile",
  extension: "/dashboard/extension",
}

export function dashboardPathForSection(section: DashboardSection): string {
  return DASHBOARD_SECTION_PATHS[section]
}

export function dashboardSectionFromSearchParam(value: string | null): DashboardSection | null {
  if (!value) return null
  const normalized = value.trim()
  if (!normalized) return null
  if (normalized in DASHBOARD_SECTION_PATHS) return normalized as DashboardSection
  return null
}

export function dashboardSectionFromPathname(pathname: string): DashboardSection {
  const path = pathname.split("?")[0] || ""
  if (path === "/dashboard") return "analytics"
  if (path.startsWith("/dashboard/")) {
    const seg = path.slice("/dashboard/".length).split("/")[0]
    switch (seg) {
      case "pipeline":
        return "pipeline"
      case "drafts":
        return "drafts"
      case "templates":
        return "templates"
      case "emails":
        return "emails"
      case "dms":
        return "dms"
      case "profile":
        return "profile"
      case "extension":
        return "extension"
    }
  }
  return "analytics"
}

