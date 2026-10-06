import type { CSSProperties } from 'react';
import { PHOTOS } from '../data/photos';
import { perimeter, toPoints, type Pt } from '../segmentation/geometry';

interface Props {
  photoId?: string;
  photoDataUrl?: string;
  polygon?: Pt[];
  alt: string;
  animate?: boolean;
  className?: string;
}

/** A demo photo (or the driver's own) with an optional component outline drawn over it. */
export function PhotoOutline({ photoId, photoDataUrl, polygon, alt, animate = false, className = '' }: Props) {
  const photo = photoId ? PHOTOS[photoId] : undefined;
  const w = photo?.width ?? 600;
  const h = photo?.height ?? 800;
  const src = photo?.src ?? photoDataUrl;
  if (!src) {
    return (
      <div className={`flex aspect-[3/4] items-center justify-center rounded-xl bg-cream-deep text-sm ${className}`}>
        No photo
      </div>
    );
  }
  const len = polygon ? Math.ceil(perimeter(polygon)) : 0;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={alt} className={`block h-auto w-full rounded-xl ${className}`}>
      <image href={src} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
      {polygon && (
        <polygon
          points={toPoints(polygon)}
          fill="#ff7199"
          fillOpacity={animate ? undefined : 0.35}
          stroke="#1f1f1f"
          strokeWidth={5}
          strokeLinejoin="round"
          className={animate ? 'trace-outline' : undefined}
          style={animate ? ({ ['--len' as string]: len } as CSSProperties) : undefined}
        />
      )}
      {polygon && !animate && (
        <polygon points={toPoints(polygon)} fill="none" stroke="#fffbec" strokeWidth={2} strokeDasharray="6 6" />
      )}
    </svg>
  );
}
