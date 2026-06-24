"use client";

import { useEffect, useState } from "react";
import { ZoomIn } from "lucide-react";
import { ProductPhoto } from "./product-photo";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "./ui/carousel";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { cn } from "@/lib/utils";

/**
 * Storefront product gallery — a swipeable shadcn Carousel (main image) synced with a
 * thumbnail strip, plus a fullscreen shadcn Dialog lightbox on click. Big-player style.
 */
export function ProductGallery({ images, name, hue }: { images: string[]; name: string; hue: number }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  // ProductPhoto renders a branded placeholder for undefined src, so an empty gallery
  // still shows one nice slide.
  const slides = images.length > 0 ? images : [undefined];
  const hasMany = images.length > 1;

  return (
    <div>
      <Carousel
        setApi={setApi}
        opts={{ loop: hasMany }}
        className="overflow-hidden rounded-card border border-line bg-white shadow-soft"
      >
        <CarouselContent className="ml-0">
          {slides.map((src, i) => (
            <CarouselItem key={i} className="pl-0">
              <Button
                variant="ghost"
                onClick={() => setLightboxOpen(true)}
                className="relative block aspect-square h-auto w-full cursor-zoom-in rounded-none p-0 hover:bg-transparent"
              >
                <ProductPhoto
                  src={src}
                  alt={`${name} ${i + 1}`}
                  hue={hue}
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  priority={i === 0}
                  className="object-cover"
                />
                <span className="absolute end-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-ink shadow-soft backdrop-blur">
                  <ZoomIn className="h-4 w-4" />
                </span>
                <span className="sr-only">{name}</span>
              </Button>
            </CarouselItem>
          ))}
        </CarouselContent>
        {hasMany && (
          <>
            <CarouselPrevious className="left-3" />
            <CarouselNext className="right-3" />
          </>
        )}
      </Carousel>

      {hasMany && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {images.slice(0, 10).map((src, i) => (
            <Button
              key={i}
              variant="ghost"
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "relative aspect-square h-auto w-full overflow-hidden rounded-2xl border-2 p-0 hover:bg-transparent",
                current === i ? "border-brand-500" : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              <ProductPhoto src={src} alt={`${name} ${i + 1}`} hue={hue} sizes="120px" className="object-cover" />
              <span className="sr-only">{`${name} ${i + 1}`}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Fullscreen lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="w-full max-w-[min(96vw,1100px)] border-0 bg-transparent p-0 shadow-none ring-0">
          <DialogTitle className="sr-only">{name}</DialogTitle>
          <Carousel opts={{ startIndex: current, loop: hasMany }} className="rounded-card bg-white">
            <CarouselContent className="ml-0">
              {slides.map((src, i) => (
                <CarouselItem key={i} className="pl-0">
                  <div className="relative flex aspect-square max-h-[85vh] items-center justify-center">
                    <ProductPhoto src={src} alt={`${name} ${i + 1}`} hue={hue} sizes="90vw" className="p-3" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            {hasMany && (
              <>
                <CarouselPrevious className="left-3" />
                <CarouselNext className="right-3" />
              </>
            )}
          </Carousel>
        </DialogContent>
      </Dialog>
    </div>
  );
}
