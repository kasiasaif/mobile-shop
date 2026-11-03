import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'

export function ProgressNotice() {
  const titleId = useId()
  const [open, setOpen] = useState(true)

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!open) return null

  const close = () => setOpen(false)

  return createPortal(
    <div className="checkout-overlay" onClick={close}>
      <div
        className="notice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="checkout-head notice-head">
          <h2 id={titleId}>
            <span className="notice-title-text">Hi, thanks for stopping by</span>
            <span className="notice-wave" role="img" aria-label="waving hand">
              👋
            </span>
          </h2>
          <button className="checkout-close notice-close" type="button" aria-label="Close notice" onClick={close}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>
        <div className="notice-body">
          <p>
            I’m still building tescgsm. Some parts of the site are being updated right now, so prices,
            stock, and pages may change while I work on it.
          </p>
          <p>If something looks off, let me know. Thanks for your patience!</p>
          <a
            className="notice-author"
            href="https://github.com/kasiasaif"
            target="_blank"
            rel="noreferrer"
          >
            <img src="https://github.com/kasiasaif.png?size=96" alt="" width={44} height={44} />
            <span>
              <strong>Kasia Saif</strong>
              <small>github.com/kasiasaif</small>
            </span>
          </a>
          <button className="button" type="button" onClick={close} autoFocus>
            Got it
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
