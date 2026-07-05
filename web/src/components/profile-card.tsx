import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

type ProfileCardStat = {
  label: string
  value: string | number
}

type ProfileCardAction = {
  label: string
  href?: string
  onClick?: () => void
  variant?: "default" | "secondary" | "outline" | "ghost" | "accent"
}

type ProfileCardProps = {
  name: string
  title?: string
  avatarUrl?: string | null
  bio?: string
  stats?: ProfileCardStat[]
  actions?: ProfileCardAction[]
  className?: string
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export function ProfileCard({
  name,
  title,
  avatarUrl,
  bio,
  stats = [],
  actions = [],
  className,
}: ProfileCardProps) {
  const initials = getInitials(name)

  return (
    <Card
      className={cn(
        "overflow-hidden border-border bg-card shadow-sm transition-[box-shadow,transform,border-color] duration-200  hover:shadow-md",
        className
      )}
    >
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <Avatar className="h-16 w-16 border border-border md:h-20 md:w-20">
            <AvatarImage src={avatarUrl ?? undefined} alt={`${name} avatar`} />
            <AvatarFallback className="bg-accent/15 text-lg font-semibold text-accent-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1 space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="min-w-0 flex-1 truncate text-xl font-semibold tracking-tight text-card-foreground">
                  {name}
                </h3>
                {title ? <Badge variant="secondary">{title}</Badge> : null}
              </div>
              {bio ? (
                <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                  {bio}
                </p>
              ) : null}
            </div>

            {stats.length > 0 ? (
              <>
                <Separator />
                <div className="flex flex-wrap gap-3">
                  {stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="min-w-[7rem] flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2"
                    >
                      <p className="text-lg font-semibold tabular-nums text-foreground">
                        {stat.value}
                      </p>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        {stat.label}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : null}

            {actions.length > 0 ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {actions.map((action) => {
                  const key = `${action.label}-${action.href ?? "button"}`
                  if (action.href) {
                    return (
                      <Button
                        key={key}
                        asChild
                        variant={action.variant ?? "outline"}
                        className="w-full sm:w-auto"
                      >
                        <a href={action.href}>{action.label}</a>
                      </Button>
                    )
                  }

                  return (
                    <Button
                      key={key}
                      type="button"
                      variant={action.variant ?? "default"}
                      onClick={action.onClick}
                      className="w-full sm:w-auto"
                    >
                      {action.label}
                    </Button>
                  )
                })}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
