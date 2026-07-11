import { cn } from "@/lib/utils"

/**
 * Restrained ambient background: a slow-drifting dot lattice, masked to fade
 * at the edges so it never competes with foreground content. Pure CSS
 * animation — inherits the site-wide prefers-reduced-motion override in
 * globals.css without extra JS.
 */
export function AmbientGrid({
  className,
  fade = "ellipse",
}: {
  className?: string
  fade?: "ellipse" | "top"
}) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}
    >
      <div
        className={cn(
          "absolute inset-0 animate-grid-drift opacity-[0.55]",
          "[background-image:radial-gradient(var(--border-strong)_1px,transparent_1px)]",
          "[background-size:28px_28px]",
          fade === "ellipse"
            ? "[mask-image:radial-gradient(ellipse_55%_45%_at_50%_0%,black_35%,transparent_100%)]"
            : "[mask-image:linear-gradient(to_bottom,black_0%,transparent_75%)]"
        )}
      />
    </div>
  )
}
