"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { imageUrl } from "@/lib/supabase/config";
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
  cta?: { href: string; label: string };
  secondary?: { href: string; label: string };
  /** A photo uploaded in Admin > Home slides, shown full width behind the text. */
  image_path?: string | null;
  products: SlideProduct[];
};

const INTERVAL_MS = 6000;

// Colour pairs chosen for contrast: white or beige text on the browns, bark text on yellow.
const TONES = {
  bark: { box: "bg-bark", eyebrow: "text-yellow", title: "text-white", text: "text-beige-tint", cta: "btn-primary", secondary: "border border-beige-tint text-white hover:bg-white/10" },
  brown: { box: "bg-brown", eyebrow: "text-yellow", title: "text-white", text: "text-beige-tint", cta: "btn-primary", secondary: "border border-beige-tint text-white hover:bg-white/10" },
  gold: { box: "bg-yellow", eyebrow: "text-bark", title: "text-bark", text: "text-bark", cta: "bg-bark text-white hover:bg-brown", secondary: "border border-bark text-bark hover:bg-white/30" },
} as const;

function ProductTiles({ products, eager }: { products: SlideProduct[]; eager: boolean }) {
  return (
    <ul className="hidden grid-cols-3 gap-3 md:grid">
      {products.slice(0, 3).map((p, n) => (
        <li key={p.id} className={n === 1 ? "-translate-y-3" : "translate-y-3"}>
          <Link href={`/p/${p.slug}`} className="block overflow-hidden rounded-2xl bg-white p-1.5 shadow-xl transition motion-safe:hover:-translate-y-1">
            <ProductImage path={p.image_path} alt="" sizes="160px" priority={eager && n === 0} />
            <span className="block px-1 pt-1 pb-0.5 text-xs font-semibold text-bark">
              <span className="line-clamp-1">{p.name}</span>
              <span className="flex items-center gap-1.5">
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
  );
}

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
  const arrow = "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-brown shadow-md hover:bg-white md:flex";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights and offers"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false); }}
      className="relative -mx-4 overflow-hidden sm:mx-0 sm:rounded-3xl"
    >
      <div className="grid">
        {slides.map((slide, i) => {
          const photo = imageUrl(slide.image_path);
          const tone = photo ? TONES.bark : TONES[slide.tone];
          const active = i === index;
          const Heading = i === 0 ? "h1" : "h2";
          return (
            <div
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${slides.length}: ${slide.title}`}
              aria-hidden={!active}
              inert={!active}
              className={`relative flex min-h-[260px] items-center [grid-area:1/1] overflow-hidden px-6 pt-8 pb-14 transition-opacity duration-700 sm:min-h-[300px] sm:px-10 md:px-16 lg:min-h-[340px] ${tone.box} ${
                active ? "opacity-100" : "invisible opacity-0"
              }`}
            >
              {photo ? (
                <>
                  <Image src={photo} alt="" fill sizes="(min-width: 1152px) 1152px, 100vw" preload={i === 0} className="object-cover" />
                  <div aria-hidden="true" className="absolute inset-0 bg-linear-to-r from-bark via-bark/80 to-bark/10" />
                </>
              ) : (
                <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
              )}

              <div className={`relative grid w-full items-center gap-8 ${!photo && slide.products.length > 0 ? "md:grid-cols-[1.2fr_1fr]" : ""}`}>
                <div className="max-w-xl">
                  <span className={`eyebrow ${tone.eyebrow}`}>{slide.eyebrow}</span>
                  <Heading className={`mt-3 text-3xl leading-tight font-bold sm:text-4xl ${tone.title}`}>{slide.title}</Heading>
                  {slide.text && <p className={`mt-3 max-w-md sm:text-lg ${tone.text}`}>{slide.text}</p>}
                  {(slide.cta || slide.secondary) && (
                    <div className="mt-6 flex flex-wrap gap-3">
                      {slide.cta && <Link href={slide.cta.href} className={`btn px-6 ${tone.cta}`}>{slide.cta.label}</Link>}
                      {slide.secondary && (
                        <Link href={slide.secondary.href} className={`btn hidden px-6 sm:inline-flex ${tone.secondary}`}>{slide.secondary.label}</Link>
                      )}
                    </div>
                  )}
                </div>
                {!photo && slide.products.length > 0 && <ProductTiles products={slide.products} eager={i === 0} />}
              </div>
            </div>
          );
        })}
      </div>

      {slides.length > 1 && (
        <>
          <button type="button" aria-label="Previous slide" onClick={() => go(-1)} className={`${arrow} left-3`}>
            <ChevronLeft aria-hidden="true" size={20} />
          </button>
          <button type="button" aria-label="Next slide" onClick={() => go(1)} className={`${arrow} right-3`}>
            <ChevronRight aria-hidden="true" size={20} />
          </button>
          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-2">
            <ol className="flex items-center rounded-full bg-white/90 px-1.5 shadow-md">
              {slides.map((slide, i) => (
                <li key={slide.id}>
                  <button
                    type="button"
                    aria-label={`Show slide ${i + 1}: ${slide.title}`}
                    aria-current={i === index ? "true" : undefined}
                    onClick={() => setIndex(i)}
                    className="flex h-8 w-7 items-center justify-center"
                  >
                    <span className={`block h-2 rounded-full transition-all ${i === index ? "w-5 bg-brown" : "w-2 bg-white ring-1 ring-brown"}`} />
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              aria-label={playing ? "Pause slideshow" : "Play slideshow"}
              onClick={() => setPlaying(!playing)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-brown shadow-md hover:bg-white"
            >
              {playing ? <Pause aria-hidden="true" size={14} /> : <Play aria-hidden="true" size={14} />}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
