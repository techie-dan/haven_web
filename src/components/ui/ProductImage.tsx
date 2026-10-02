"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { LogoMark } from "@/components/brand/Logo";

/**
 * Product photography wrapper.
 *
 * Swaps in a branded placeholder if the remote image 404s or the URL is empty,
 * so a broken catalogue image never leaves a hole in the grid.
 */
export function ProductImage({
  src,
  alt,
  className,
  imageClassName,
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-surface-sunk",
          className,
        )}
        role="img"
        aria-label={alt}
      >
        <div className="flex flex-col items-center gap-3 text-line-strong">
          <LogoMark className="h-10 w-auto text-line-strong" ringColor="#cfc8bb" />
          <span className="eyebrow text-muted">Haven Studio</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden bg-surface-sunk", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        onError={() => setFailed(true)}
        className={cn("object-cover", imageClassName)}
      />
    </div>
  );
}
