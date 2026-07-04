"use client"

import { signOut } from "next-auth/react"
import { ChevronDown, LogOut, Settings, User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type AccountMenuProps = {
  name?: string | null
  email?: string | null
  image?: string | null
  title?: string | null
  onNavigate?: (section: string) => void
}

function getInitials(name?: string | null, email?: string | null) {
  const base = (name || email || "User").trim()
  return base
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function AccountMenu({ name, email, image, title, onNavigate }: AccountMenuProps) {
  const initials = getInitials(name, email)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-3 rounded-full border border-border bg-card px-1.5 py-1.5 text-left shadow-sm transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-border/80 hover:shadow-md hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]"
          aria-label="Open account menu"
        >
          <Avatar className="h-9 w-9 border border-border/60">
            <AvatarImage src={image ?? undefined} alt={name ? `${name} avatar` : "User avatar"} />
            <AvatarFallback className="bg-accent/15 font-medium text-accent-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-medium leading-tight text-foreground">
              {name || "Account"}
            </p>
            {title ? (
              <p className="truncate text-xs text-muted-foreground">{title}</p>
            ) : null}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-64 rounded-xl border-border bg-popover p-1 shadow-lg"
      >
        <DropdownMenuLabel className="space-y-1 rounded-lg px-3 py-2">
          <p className="truncate text-sm font-medium text-foreground">{name || "Account"}</p>
          {title ? <p className="truncate text-xs text-muted-foreground">{title}</p> : null}
          {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="rounded-lg px-3 py-2.5"
          onSelect={() => onNavigate?.("profile")}
        >
          <User className="h-4 w-4 text-muted-foreground" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem
          className="rounded-lg px-3 py-2.5"
          onSelect={() => onNavigate?.("extension")}
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
          Extension
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn(
            "rounded-lg px-3 py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
          )}
          onSelect={() => signOut({ callbackUrl: "/" })}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
