"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, Truck } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { ProductImage } from "./product-image";

export type SlideProduct = {
  id: string;
  slug: string;
  name: string;
  image_path: string | null;
  price_cents: number;
  mrp_cents: number | null;
};

export type Slide = {
  id: string;
  tone: "bark" | "brown" | "gold";
  eyebrow: string;
  title: string;
  text: string;
  cta: { href: string; label: string };
  secondary?: { href: string; label: string };
  products: SlideProduct[];
};

const INTERVAL_MS = 6000;

// Colour pairs chosen for contrast: white or beige text on the browns, bark text on yellow.
const TONES = {
  bark: { box: "bg-bark", eyebrow: "text-yellow", title: "text-white", text: "text-beige-tint", cta: "btn-primary", secondary: "border border-beige-tint text-white hover:bg-white/10" },
  brown: { box: "bg-brown", eyebrow: "text-yellow", title: "text-white", text: "text-beige-tint", cta: "btn-primary", secondary: "border border-beige-tint text-white hover:bg-white/10" },
  gold: { box: "bg-yellow", eyebrow: "text-bark", title: "text-bark", text: "text-bark", cta: "bg-bark text-white hover:bg-brown", secondary: "border border-bark text-bark hover:bg-white/30" },
} as const;

/** Rotating promotions at the top of the home page. Pauses on hover, focus or request. */
export function HeroCarousel({ slides }: { slides: Slide[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    // Respect people who have asked their device for less motion.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (!playing || held || slides.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);
    return () => clearInterval(timer);
  }, [playing, held, slides.length]);

  if (slides.length === 0) return null;
  const go = (step: number) => setIndex((i) => (i + step + slides.length) % slides.length);
  const control = "flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-brown shadow-md hover:bg-white";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights and offers"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false); }}
      className="relative -mx-4 -mt-6 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-3xl"
    >
      <div className="grid">
        {slides.map((slide, i) => {
          const tone = TONES[slide.tone];
          const active = i === index;
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}: ${slide.title}`}
              aria-hidden={!active}
              inert={!active}
              className={`relative flex items-center [grid-area:1/1] overflow-hidden px-6 pt-10 pb-24 transition-opacity duration-700 sm:px-12 sm:pt-14 sm:pb-24 ${tone.box} ${
                active ? "opacity-100" : "invisible opacity-0"
              }`}
            >
              <div aria-hidden="true" className="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
              <div className="relative grid w-full items-center gap-8 lg:grid-cols-2">
                <div>
                  <span className={`eyebrow ${tone.eyebrow}`}>{slide.eyebrow}</span>
                  {i === 0 ? (
                    <h1 className={`mt-4 max-w-xl text-4xl leading-tight font-bold sm:text-5xl ${tone.title}`}>{slide.title}</h1>
                  ) : (
                    <h2 className={`mt-4 max-w-xl text-4xl leading-tight font-bold sm:text-5xl ${tone.title}`}>{slide.title}</h2>
                  )}
                  <p className={`mt-4 max-w-md text-lg ${tone.text}`}>{slide.text}</p>
                  <div className="mt-8 flex flex-wrap gap-3">
                    <Link href={slide.cta.href} className={`btn px-7 ${tone.cta}`}>{slide.cta.label}</Link>
                    {slide.secondary && (
                      <Link href={slide.secondary.href} className={`btn px-7 ${tone.secondary}`}>{slide.secondary.label}</Link>
                    )}
                  </div>
                </div>

                {slide.products.length > 0 ? (
                  <ul className="grid grid-cols-2 gap-3 sm:gap-4">
                    {slide.products.slice(0, 4).map((p, n) => (
                      <li key={p.id} className={`${n >= 2 ? "hidden sm:block" : ""} ${n % 2 === 1 ? "lg:translate-y-6" : ""}`}>
                        <Link href={`/p/${p.slug}`} className="block overflow-hidden rounded-2xl bg-white p-2 shadow-xl transition motion-safe:hover:-translate-y-1">
                          <ProductImage path={p.image_path} alt="" sizes="(min-width: 1024px) 240px, 45vw" priority={i === 0 && n < 2} />
                          <span className="block px-1 pt-1 text-xs font-semibold text-bark sm:text-sm">
                            <span className="line-clamp-1">{p.name}</span>
                            <span className="mt-0.5 flex items-center gap-1.5">
                              {formatPrice(p.price_cents)}
                              {p.mrp_cents && p.mrp_cents > p.price_cents && (
                                <span className="font-normal line-through"><span className="sr-only">was </span>{formatPrice(p.mrp_cents)}</span>
                              )}
                            </span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div aria-hidden="true" className="hidden justify-center lg:flex">
                    <span className="flex h-56 w-56 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/30">
                      <Truck size={96} strokeWidth={1.25} className="text-yellow" />
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {slides.length > 1 && (
        <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-3 px-4">
          <button type="button" aria-label="Previous slide" onClick={() => go(-1)} className={control}>
            <ChevronLeft aria-hidden="true" size={20} />
          </button>
          <ol className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 shadow-md">
            {slides.map((slide, i) => (
              <li key={slide.id}>
                <button
                  type="button"
                  aria-label={`Show slide ${i + 1}: ${slide.title}`}
                  aria-current={i === index ? "true" : undefined}
                  onClick={() => setIndex(i)}
                  className="flex h-8 w-8 items-center justify-center"
                >
                  <span className={`block h-2.5 rounded-full transition-all ${i === index ? "w-6 bg-brown" : "w-2.5 bg-white ring-1 ring-brown"}`} />
                </button>
              </li>
            ))}
          </ol>
          <button type="button" aria-label="Next slide" onClick={() => go(1)} className={control}>
            <ChevronRight aria-hidden="true" size={20} />
          </button>
          <button
            type="button"
            aria-label={playing ? "Pause slideshow" : "Play slideshow"}
            onClick={() => setPlaying(!playing)}
            className={control}
          >
            {playing ? <Pause aria-hidden="true" size={18} /> : <Play aria-hidden="true" size={18} />}
          </button>
        </div>
      )}
    </section>
  );
}
