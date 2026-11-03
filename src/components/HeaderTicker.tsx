import { useEffect, useState, type CSSProperties } from 'react'
import { headerBannerFontStack, splitChars, withOpacity } from '../data/headerBanner'
import { useHeaderBanners } from '../lib/headerBanners'

const dismissKey = 'tescgsm-header-banner-closed'

function readDismissed() {
  try {
    return sessionStorage.getItem(dismissKey) ?? ''
  } catch {
    return ''
  }
}

export function HeaderTicker() {
  const { banners } = useHeaderBanners()
  const [index, setIndex] = useState(0)
  const [dismissed, setDismissed] = useState(readDismissed)
  const signature = banners.map((item) => `${item.id}:${item.text}`).join('|')

  useEffect(() => {
    setIndex(0)
  }, [banners])

  useEffect(() => {
    if (banners.length < 2) return
    const timer = window.setInterval(() => {
      setIndex((value) => (value + 1) % banners.length)
    }, 25000)
    return () => window.clearInterval(timer)
  }, [banners.length])

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
  if (!banner) return null

  return (
    <div
      className="header-ticker"
      style={{ background: withOpacity(banner.background, banner.backgroundOpacity) }}
    >
      <p className="sr-only">{banner.text}</p>
      <div className="shell header-ticker-row">
        <div className="header-ticker-inner">
          <p
            key={banner.id}
            className="header-ticker-text"
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
