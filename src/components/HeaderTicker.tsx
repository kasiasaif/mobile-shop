import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { bannerPaint, headerBannerFontStack, splitChars, type HeaderBanner } from '../data/headerBanner'
import { useHeaderBanners } from '../lib/headerBanners'

const rotateMs = 10000
const swapMs = 700

const dismissKey = 'tescgsm-header-banner-closed'

function readDismissed() {
  try {
    return sessionStorage.getItem(dismissKey) ?? ''
  } catch {
    return ''
  }
}

function BannerLine({ banner, leaving = false }: { banner: HeaderBanner; leaving?: boolean }) {
  return (
    <p
      className={leaving ? 'header-ticker-text is-leaving' : 'header-ticker-text'}
      aria-hidden="true"
      style={{
        color: banner.color,
        fontFamily: headerBannerFontStack(banner.font),
        fontWeight: banner.bold ? 700 : 400,
      }}
    >
      {splitChars(banner.text).map((char, i) => (
        <span key={i} className="ticker-char" style={{ '--i': i } as CSSProperties}>
          {char}
        </span>
      ))}
    </p>
  )
}

export function HeaderTicker() {
  const { banners } = useHeaderBanners()
  const [index, setIndex] = useState(0)
  const [leaving, setLeaving] = useState<number | null>(null)
  const [dismissed, setDismissed] = useState(readDismissed)
  const indexRef = useRef(0)
  const signature = banners.map((item) => `${item.id}:${item.text}`).join('|')

  useEffect(() => {
    indexRef.current = 0
    setIndex(0)
    setLeaving(null)
  }, [signature])

  useEffect(() => {
    if (banners.length < 2) return
    const timer = window.setInterval(() => {
      const from = indexRef.current
      const next = (from + 1) % banners.length
      indexRef.current = next
      setLeaving(from)
      setIndex(next)
    }, rotateMs)
    return () => window.clearInterval(timer)
  }, [banners.length])

  useEffect(() => {
    if (leaving == null) return
    const timer = window.setTimeout(() => setLeaving(null), swapMs)
    return () => window.clearTimeout(timer)
  }, [leaving, index])

  function close() {
    setDismissed(signature)
    try {
      sessionStorage.setItem(dismissKey, signature)
    } catch {
      // Private mode can block storage; the banner still hides until reload.
    }
  }

  if (banners.length === 0 || dismissed === signature) return null

  const banner = banners[index % banners.length]
  const previous = leaving == null ? null : banners[leaving]
  if (!banner) return null

  return (
    <div
      className="header-ticker"
      style={{ background: bannerPaint(banner.background, banner.backgroundOpacity) }}
    >
      <p className="sr-only">{banner.text}</p>
      {previous ? (
        <div
          className="header-ticker-bg is-out"
          style={{ background: bannerPaint(previous.background, previous.backgroundOpacity) }}
        />
      ) : null}
      <div
        key={banner.id}
        className="header-ticker-bg"
        style={{ background: bannerPaint(banner.background, banner.backgroundOpacity) }}
      />
      <div className="shell header-ticker-row">
        <div className="header-ticker-inner">
          {previous ? <BannerLine banner={previous} leaving /> : null}
          <BannerLine key={banner.id} banner={banner} />
        </div>
      </div>
      <button className="header-ticker-close" type="button" aria-label="Close banner" onClick={close}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </div>
  )
}
