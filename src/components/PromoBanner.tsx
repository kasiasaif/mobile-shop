import { useEffect, useRef, useState, type TouchEvent } from "react";
import { Link } from "react-router-dom";
import { type Banner } from "../data/banner";

const holdMs = 5000;
const swapMs = 700;

export function PromoBanner({ banners }: { banners: Banner[] }) {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const indexRef = useRef(0);
  const total = banners.length;
  const armRef = useRef<(delay: number) => void>(() => {});
  const showRef = useRef<(next: number) => void>(() => {});

  useEffect(() => {
    indexRef.current = 0;
    setIndex(0);
    setLeaving(null);
  }, [total]);

  useEffect(() => {
    if (total < 2) return;
    let timer = 0;
    const arm = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        showRef.current((indexRef.current + 1) % total);
      }, delay);
    };
    armRef.current = arm;
    arm(holdMs);
    return () => window.clearTimeout(timer);
  }, [total]);

  useEffect(() => {
    if (leaving == null) return;
    const done = window.setTimeout(() => setLeaving(null), swapMs);
    return () => window.clearTimeout(done);
  }, [leaving, index]);

  if (total === 0) return null;

  function show(next: number) {
    const normalized = (next + total) % total;
    const current = indexRef.current;
    if (normalized === current || leaving != null) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    indexRef.current = normalized;
    setIndex(normalized);
    if (reduce) {
      armRef.current(holdMs);
      return;
    }
    setLeaving(current);
    armRef.current(holdMs + swapMs);
  }
  showRef.current = show;

  function goTo(next: number) {
    show(next);
  }

  function onTouchStart(event: TouchEvent<HTMLElement>) {
    touchStartX.current = event.changedTouches[0]?.clientX ?? null;
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStartX.current == null) return;
    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const delta = endX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(delta) < 48) return;
    goTo(index + (delta < 0 ? 1 : -1));
  }

  return (
    <section
      className="promo-banner"
      aria-roledescription="carousel"
      aria-label="Promotions"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="promo-track">
        {banners.map((banner, slideIndex) => {
          const active = slideIndex === index;
          const outgoing = slideIndex === leaving;
          const className = active
            ? leaving == null
              ? "promo-slide is-active"
              : "promo-slide is-active is-entering"
            : outgoing
              ? "promo-slide is-leaving"
              : "promo-slide";
          return (
            <article
              key={banner.id}
              className={className}
              aria-hidden={!active}
              aria-roledescription="slide"
              aria-label={`${slideIndex + 1} of ${total}`}
            >
              <div className="promo-banner-media">
                <img src={banner.image} alt="" />
              </div>
              <div className="shell promo-banner-copy">
                <p className="eyebrow">tescgsm</p>
                <h1>{banner.title}</h1>
                <p className="lede">{banner.body}</p>
                {banner.ctaHref.startsWith("/") ? (
                  <Link
                    className="button"
                    to={banner.ctaHref}
                    tabIndex={active ? 0 : -1}
                  >
                    {banner.ctaLabel}
                  </Link>
                ) : (
                  <a
                    className="button"
                    href={banner.ctaHref}
                    tabIndex={active ? 0 : -1}
                  >
                    {banner.ctaLabel}
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {total > 1 ? (
        <div className="promo-dots" role="tablist" aria-label="Banner slides">
          {banners.map((banner, slideIndex) => {
            const lit = slideIndex === index;
            return (
              <button
                key={banner.id}
                type="button"
                role="tab"
                aria-label={`Show slide ${slideIndex + 1}`}
                aria-selected={lit}
                className={lit ? "is-active" : ""}
                onClick={() => goTo(slideIndex)}
              />
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
