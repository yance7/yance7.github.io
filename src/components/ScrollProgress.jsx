import { useScrollProgress } from '../hooks/useScrollProgress'

export default function ScrollProgress() {
  const progress = useScrollProgress()
  return (
    <div className="scroll-progress" aria-hidden="true">
      <div className="scroll-bar" style={{ transform: `scaleX(${progress})` }}></div>
    </div>
  )
}
