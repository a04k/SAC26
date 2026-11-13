import { Disc3 } from 'lucide-react'

/** A short, charming wait while the engine measures the frame. */
export function LoadingDoor({ label = 'Winding the cabinet…' }: { label?: string }) {
  return (
    <div className="flex min-h-[52vh] flex-col items-center justify-center gap-3 text-ink-soft">
      <Disc3 size={30} className="animate-spin text-[#b57a3a] [animation-duration:2.4s]" />
      <p className="font-display text-sm font-semibold">{label}</p>
    </div>
  )
}
