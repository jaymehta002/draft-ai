"use client"

import { useRef } from "react"
import Link from "next/link"
import { motion, useInView, useReducedMotion, type HTMLMotionProps } from "framer-motion"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { EASE_OUT, EASE_SPRING, FLOAT_TRANSITION, REVEAL_ANIMATE, REVEAL_INITIAL, STAGGER } from "@/lib/motion-tokens"

export { EASE_OUT, EASE_SPRING, STAGGER }

export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function ScrollReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      ref={ref}
      initial={REVEAL_INITIAL}
      animate={inView ? REVEAL_ANIMATE : REVEAL_INITIAL}
      transition={{ duration: 0.5, delay, ease: EASE_OUT }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerContainer({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: STAGGER } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 16 },
        show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

export function MotionCard(props: HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={EASE_SPRING}
      {...props}
    />
  )
}

export function FloatingCard({
  children,
  className,
  disabled,
}: {
  children: React.ReactNode
  className?: string
  disabled?: boolean
}) {
  const reduceMotion = useReducedMotion()

  if (disabled || reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      animate={{ y: [0, -6, 0] }}
      transition={FLOAT_TRANSITION}
    >
      {children}
    </motion.div>
  )
}

export function MagneticButton({
  children,
  className,
  href,
  onClick,
  size = "default",
  variant = "default",
}: {
  children: React.ReactNode
  className?: string
  href?: string
  onClick?: () => void
  size?: "default" | "sm" | "lg"
  variant?: "default" | "outline" | "ghost"
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  const handleMouseMove = (e: React.MouseEvent) => {
    if (reduceMotion || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    ref.current.style.transform = `translate(${x * 0.08}px, ${y * 0.08}px)`
  }

  const handleMouseLeave = () => {
    if (!ref.current) return
    ref.current.style.transform = "translate(0, 0)"
  }

  const button = href ? (
    <Button
      size={size}
      variant={variant}
      className={cn(
        "shadow-[0_2px_12px_rgba(20,71,230,0.25)] transition-[transform] duration-200 ease-out",
        className
      )}
      asChild
    >
      <Link href={href}>{children}</Link>
    </Button>
  ) : (
    <Button
      size={size}
      variant={variant}
      className={cn(
        "shadow-[0_2px_12px_rgba(20,71,230,0.25)] transition-[transform] duration-200 ease-out",
        className
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  )

  return (
    <div
      ref={ref}
      className="inline-block transition-[transform] duration-200 ease-out"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {button}
    </div>
  )
}

export function Marquee({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("overflow-hidden", className)}>
      <div className="flex animate-marquee gap-12 whitespace-nowrap">
        {children}
        {children}
      </div>
    </div>
  )
}

export function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse space-y-3 p-4", className)}>
      <div className="h-4 w-3/4 rounded-md bg-gradient-to-r from-zinc-100 via-zinc-50 to-zinc-100 bg-[length:200%_100%] animate-shimmer" />
      <div className="h-3 w-1/2 rounded-md bg-zinc-100" />
    </div>
  )
}

export function LayoutIndicator({ className }: { className?: string }) {
  return (
    <motion.span
      layoutId="sidebar-active-indicator"
      className={cn(
        "absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-full bg-primary",
        className
      )}
      transition={EASE_SPRING}
    />
  )
}
