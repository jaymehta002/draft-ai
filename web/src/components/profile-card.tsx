"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { signOut } from "next-auth/react"
import { ChevronDown, LogOut, Settings, User } from "lucide-react"
import { cn } from "@/lib/utils"

type ProfileCardProps = {
  name?: string | null
  email?: string | null
  image?: string | null
  title?: string | null
  onNavigate?: (section: string) => void
}

export function ProfileCard({ name, email, image, title, onNavigate }: ProfileCardProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const initials = (name || email || "U")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full bg-card border border-border/60 pl-1 pr-3 py-1 shadow-sm hover:shadow transition-shadow"
      >
        <div className="relative h-8 w-8 overflow-hidden rounded-full bg-foreground flex items-center justify-center text-[11px] font-semibold text-background">
          {image ? (
            <Image src={image} alt="" fill className="object-cover" unoptimized />
          ) : (
            initials
          )}
        </div>
        <div className="hidden sm:block text-left max-w-[130px]">
          <p className="text-sm font-medium truncate leading-tight">{name || "Account"}</p>
          {title && <p className="text-[10px] text-muted-foreground truncate">{title}</p>}
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 rounded-xl border border-border/60 bg-card shadow-xl z-50 overflow-hidden">
          <div className="p-4 bg-muted/30">
            <p className="font-medium text-sm">{name || "Account"}</p>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>
          </div>
          <div className="p-1.5">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
              onClick={() => { onNavigate?.("profile"); setOpen(false) }}
            >
              <User className="h-4 w-4 text-muted-foreground" />
              Profile
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-muted transition-colors"
              onClick={() => { onNavigate?.("extension"); setOpen(false) }}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Extension
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
