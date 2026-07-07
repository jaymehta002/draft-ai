"use client"

import { useEffect, useState } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useRef } from "react"
import type { Mesh } from "three"

function FluidGrid() {
  const meshRef = useRef<Mesh>(null)

  useFrame((state) => {
    if (!meshRef.current) return
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.15) * 0.08
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.04
  })

  return (
    <mesh ref={meshRef} rotation={[0.4, 0, 0]}>
      <planeGeometry args={[14, 10, 32, 24]} />
      <meshBasicMaterial color="#1447e6" wireframe transparent opacity={0.12} />
    </mesh>
  )
}

export function HeroEffects() {
  const [webglOk, setWebglOk] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    setReducedMotion(
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
    try {
      const canvas = document.createElement("canvas")
      const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl")
      setWebglOk(!!gl)
    } catch {
      setWebglOk(false)
    }
  }, [])

  if (reducedMotion) return null

  if (!webglOk) {
    return (
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-20"
        aria-hidden="true"
        style={{
          backgroundImage:
            "linear-gradient(rgba(20,71,230,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(20,71,230,0.3) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    )
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 opacity-60"
      aria-hidden="true"
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
      >
        <FluidGrid />
      </Canvas>
    </div>
  )
}
