"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const SLIDES = [
  {
    id: "shot-sizes",
    title: "Shot sizes",
    caption: "Close-up, extreme close-up, medium shot, and wide shot — when to use each frame.",
    src: "/reference/camera-shots/shot-sizes.png",
    alt: "Visual reference for close-up, extreme close-up, medium shot, and wide shot with example photos and descriptions.",
  },
  {
    id: "camera-angles",
    title: "Camera angles",
    caption: "Eye-level, low-angle, high-angle, and bird's-eye view — how height changes feeling.",
    src: "/reference/camera-shots/camera-angles.png",
    alt: "Visual reference for eye-level, low-angle, high-angle, and bird's-eye camera angles with example photos and descriptions.",
  },
  {
    id: "advanced-shots",
    title: "Advanced framing",
    caption: "Worm's-eye, Dutch angle, over-the-shoulder, and POV — specialty shots for story beats.",
    src: "/reference/camera-shots/advanced-shots.png",
    alt: "Visual reference for worm's-eye view, Dutch angle, over-the-shoulder, and POV shots with example photos and descriptions.",
  },
] as const;

export function CameraShotReference() {
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  const prev = () => setIndex((i) => (i === 0 ? SLIDES.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === SLIDES.length - 1 ? 0 : i + 1));

  return (
    <div className="mt-4 space-y-4" aria-label="Camera shot visual reference">
      <div className="flex flex-wrap gap-2">
        {SLIDES.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setIndex(i)}
            className={cn(
              "rounded-full px-3 py-1 text-xs font-medium transition",
              i === index ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            )}
          >
            {s.title}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900">
        <button
          type="button"
          onClick={prev}
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm hover:bg-black/70"
          aria-label="Previous reference image"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <Image
          src={slide.src}
          alt={slide.alt}
          width={1080}
          height={1350}
          className="mx-auto w-full max-w-lg"
          priority={index === 0}
        />
        <button
          type="button"
          onClick={next}
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white backdrop-blur-sm hover:bg-black/70"
          aria-label="Next reference image"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium text-slate-900">{slide.title}</p>
        <p className="mt-1 text-xs text-slate-500">{slide.caption}</p>
        <p className="mt-1 text-xs text-slate-400">
          {index + 1} of {SLIDES.length}
        </p>
      </div>
    </div>
  );
}
