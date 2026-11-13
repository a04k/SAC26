import { Canvas, useFrame, useLoader } from '@react-three/fiber'
import { OrbitControls, Html, Stars, Sparkles } from '@react-three/drei'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { Suspense, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { TextureLoader } from 'three'
import { api } from '../lib/api'
import { useUI } from '../lib/store'
import type { Dataset } from '../lib/types'
import { engine } from '../lib/audio/engine'

function Earth({ dataset, reduceMotion }: { dataset: Dataset; reduceMotion: boolean }) {
  const mesh = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.Mesh>(null)
  const texture = useLoader(TextureLoader, api.frameUrl(dataset.id))

  useMemo(() => {
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
  }, [texture])

  useFrame(({ clock }, delta) => {
    if (!mesh.current) return
    if (!reduceMotion) mesh.current.rotation.y += delta * 0.12
    const level = engine.getLevel()
    const s = 1 + Math.min(level, 0.4) * 0.16
    if (glow.current) {
      glow.current.scale.setScalar(s)
      const mat = glow.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.1 + Math.min(level, 0.5) * 0.5
    }
    mesh.current.position.y = Math.sin(clock.elapsedTime * 0.5) * 0.03
  })

  return (
    <group>
      <mesh ref={mesh} castShadow>
        <sphereGeometry args={[1.45, 96, 96]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.72}
          metalness={0.18}
          emissiveMap={texture}
          emissive="#3d5a8a"
          emissiveIntensity={0.38}
        />
      </mesh>
      {/* atmosphere */}
      <mesh ref={glow} scale={1.045}>
        <sphereGeometry args={[1.45, 64, 64]} />
        <meshBasicMaterial
          color={dataset.palette[0]}
          transparent
          opacity={0.16}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh scale={1.1}>
        <sphereGeometry args={[1.45, 48, 48]} />
        <meshBasicMaterial
          color={dataset.palette[1]}
          transparent
          opacity={0.045}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function TrackDisc({
  dataset,
  index,
  total,
  active,
  onSelect,
}: {
  dataset: Dataset
  index: number
  total: number
  active: boolean
  onSelect: () => void
}) {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  const angle = (index / total) * Math.PI * 2
  const radius = 3.1
  const reduceMotion = useUI((s) => s.reduceMotion)

  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const t = clock.elapsedTime
    const bob = reduceMotion ? 0 : Math.sin(t * 1.2 + index) * 0.09
    group.current.position.y = bob + (active ? 0.16 : 0)
    if (!reduceMotion) group.current.rotation.y += delta * (active ? 0.9 : 0.3)
    const scale = hovered || active ? 1.22 : 1
    group.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.12)
    // orbit drift
    const drift = reduceMotion ? 0 : Math.sin(t * 0.25 + index * 0.6) * 0.12
    group.current.position.x = Math.cos(angle + drift) * radius
    group.current.position.z = Math.sin(angle + drift) * radius
  })

  return (
    <group
      ref={group}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = 'pointer'
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = 'auto'
      }}
    >
      <mesh rotation={[Math.PI / 2.1, 0, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.035, 48]} />
        <meshStandardMaterial
          color={active ? dataset.palette[0] : dataset.palette[2]}
          emissive={dataset.palette[active ? 0 : 1]}
          emissiveIntensity={active ? 2.1 : hovered ? 1.2 : 0.45}
          roughness={0.25}
          metalness={0.85}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.1, 0, 0]}>
        <torusGeometry args={[0.3, 0.012, 8, 64]} />
        <meshBasicMaterial color={dataset.palette[0]} transparent opacity={active ? 1 : 0.55} />
      </mesh>
      {(hovered || active) && (
        <Html center distanceFactor={9} position={[0, 0.52, 0]} style={{ pointerEvents: 'none' }}>
          <div
            className="whitespace-nowrap rounded-full border border-white/20 bg-black/70 px-3 py-1 text-[11px] font-medium tracking-wide backdrop-blur"
            style={{ color: dataset.palette[0] }}
          >
            {dataset.short}
          </div>
        </Html>
      )}
    </group>
  )
}

function NoteRibbons() {
  const points = useRef<THREE.Points>(null)
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(160 * 3), 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(160 * 3), 3))
    return g
  }, [])

  useFrame(() => {
    const notes = engine.getNotes()
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    const col = geo.getAttribute('color') as THREE.BufferAttribute
    for (let i = 0; i < 160; i++) {
      const n = notes.length ? notes[i % notes.length] : null
      const dup = notes.length ? Math.floor(i / notes.length) : 0
      if (!n) {
        pos.setXYZ(i, 0, -99, 0)
        continue
      }
      const t = Math.min(n.age, 2.4)
      const p = ((n.pitch - 40) / 52) * Math.PI * 2
      const y = 1.9 + ((n.pitch - 40) / 52) * 1.4
      const r = 2.1 + t * 0.35
      pos.setXYZ(
        i,
        Math.cos(p + t * 0.4) * r + n.pan * 1.2 + dup * 0.012,
        y - t * 0.25 + dup * 0.008,
        Math.sin(p + t * 0.4) * r,
      )
      const hue = (n.kind === 'bass' ? 0.55 : n.kind === 'perc' ? 0.08 : n.kind === 'shimmer' ? 0.85 : 0.5)
      const c = new THREE.Color().setHSL(hue, 0.8, 0.55)
      const fade = Math.max(0, 1 - t / 2.4)
      col.setXYZ(i, c.r * fade, c.g * fade, c.b * fade)
    }
    pos.needsUpdate = true
    col.needsUpdate = true
  })

  return (
    <points ref={points} geometry={geo}>
      <pointsMaterial
        size={0.13}
        vertexColors
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  )
}

function Rings({ color }: { color: string }) {
  const g = useRef<THREE.Group>(null)
  const reduceMotion = useUI((s) => s.reduceMotion)
  useFrame((_, delta) => {
    if (g.current && !reduceMotion) g.current.rotation.z += delta * 0.06
  })
  return (
    <group ref={g} rotation={[Math.PI / 2.6, 0, 0]}>
      {[2.35, 2.9, 3.6].map((r, i) => (
        <mesh key={r} rotation={[0, 0, (i * Math.PI) / 7]}>
          <torusGeometry args={[r, 0.004 + i * 0.002, 3, 160]} />
          <meshBasicMaterial color={color} transparent opacity={0.28 - i * 0.06} />
        </mesh>
      ))}
    </group>
  )
}

export function Jukebox3D({ datasets }: { datasets: Dataset[] }) {
  const selectedId = useUI((s) => s.selectedId)
  const select = useUI((s) => s.select)
  const reduceMotion = useUI((s) => s.reduceMotion)
  const announce = useUI((s) => s.announce)
  const dataset = datasets.find((d) => d.id === selectedId) ?? datasets[0]

  return (
    <div className="absolute inset-0" aria-hidden="true">
      <Canvas
        dpr={[1, 1.8]}
        camera={{ position: [0, 2.2, 7.4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={['#05070f']} />
        <fog attach="fog" args={['#05070f', 9, 20]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 4, 5]} intensity={2.1} color="#fff4e0" />
        <pointLight position={[-6, -2, -4]} intensity={18} color={dataset.palette[0]} distance={16} />
        <pointLight position={[4, 3, -5]} intensity={9} color={dataset.palette[1]} distance={14} />

        <Suspense fallback={null}>
          {dataset && <Earth dataset={dataset} reduceMotion={reduceMotion} />}
          {datasets.map((d, i) => (
            <TrackDisc
              key={d.id}
              dataset={d}
              index={i}
              total={datasets.length}
              active={d.id === selectedId}
              onSelect={() => {
                select(d.id)
                announce(`Loaded ${d.short}. ${d.accessibility}`)
              }}
            />
          ))}
          <Rings color={dataset?.palette[0] ?? '#22d3ee'} />
          <NoteRibbons />
        </Suspense>

        <Stars radius={42} depth={40} count={2600} factor={3.2} saturation={0} fade speed={0.4} />
        <Sparkles count={70} scale={9} size={1.6} speed={0.24} color={dataset?.palette[0] ?? '#8ee9ff'} opacity={0.5} />

        <OrbitControls
          enablePan={false}
          minDistance={4.2}
          maxDistance={13}
          enableDamping
          dampingFactor={0.06}
          autoRotate={!reduceMotion}
          autoRotateSpeed={0.35}
          target={[0, 0, 0]}
        />

        <EffectComposer>
          <Bloom intensity={0.85} luminanceThreshold={0.28} luminanceSmoothing={0.5} mipmapBlur />
          <Vignette eskil={false} offset={0.24} darkness={0.82} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
