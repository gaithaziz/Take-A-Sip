import Image from 'next/image';

import { cn } from '@/lib/utils';

export function ImageThumbnail({ src, alt, className }: { src?: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-md border border-dashed border-zinc-300 bg-zinc-100 text-[10px] font-medium text-zinc-500',
          className,
        )}
      >
        No image
      </div>
    );
  }

  return (
    <div className={cn('relative h-12 w-12 overflow-hidden rounded-md border border-zinc-200 bg-white', className)}>
      <Image src={src} alt={alt} fill sizes="48px" className="object-cover" unoptimized />
    </div>
  );
}

