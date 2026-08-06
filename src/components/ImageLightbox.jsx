import { useEffect, useRef, useState } from 'react'

export default function ImageLightbox({ images, index, meta, onClose, onPrev, onNext }) {
  const [loading, setLoading] = useState(true)
  const lastFocus = useRef(null)

  useEffect(() => {
    lastFocus.current = document.activeElement
    document.body.style.overflow = 'hidden'
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') onPrev()
      else if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
      if (lastFocus.current && lastFocus.current.focus) lastFocus.current.focus()
    }
  }, [onClose, onPrev, onNext])

  useEffect(() => { setLoading(true) }, [index])

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="演唱会海报大图"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <button className="lb-close" type="button" aria-label="关闭灯箱" onClick={onClose}>×</button>

      {images.length > 1 && (
        <button className="lb-nav lb-prev" type="button" aria-label="上一张" onClick={onPrev}>←</button>
      )}

      <figure className="lb-stage">
        <img
          src={images[index]}
          alt={meta ? `${meta.artist} · ${meta.tour} 海报大图` : '演唱会海报大图'}
          className={loading ? '' : 'loaded'}
          fetchPriority="high"
          decoding="async"
          onLoad={() => setLoading(false)}
          onError={() => setLoading(false)}
        >
        </img>
        {loading && <div className="lb-loading" aria-label="加载中"><i></i></div>}
        {meta && (
          <figcaption className="lb-meta">
            <span>{meta.artist} · {meta.tour}</span>
            <span>{index + 1} / {images.length}</span>
          </figcaption>
        )}
      </figure>

      {images.length > 1 && (
        <button className="lb-nav lb-next" type="button" aria-label="下一张" onClick={onNext}>→</button>
      )}
    </div>
  )
}
