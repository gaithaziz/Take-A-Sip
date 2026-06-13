#!/usr/bin/env python3
"""Resize and compress raw menu photos before the naming/mapping pass."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
JPEG_EXTENSIONS = {'.jpg', '.jpeg'}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description='Resize/compress menu photos while preserving their current filenames by default.'
    )
    parser.add_argument(
        '--source-dir',
        default='menu-photos-raw',
        help='Folder containing original photos. Default: menu-photos-raw',
    )
    parser.add_argument(
        '--output-dir',
        default='menu-photos-optimized',
        help='Folder for optimized photos. Default: menu-photos-optimized',
    )
    parser.add_argument(
        '--max-size',
        type=int,
        default=1200,
        help='Maximum width or height in pixels. Default: 1200',
    )
    parser.add_argument(
        '--quality',
        type=int,
        default=82,
        help='JPEG/WebP quality from 1 to 95. Default: 82',
    )
    parser.add_argument(
        '--format',
        choices=['original', 'jpg', 'webp'],
        default='original',
        help='Output format. "original" preserves extensions; jpg/webp normalizes them. Default: original',
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be processed without writing files.',
    )
    return parser.parse_args()


def load_pillow():
    try:
        from PIL import Image, ImageOps
    except ImportError:
        print(
            'Missing dependency: Pillow. Install it with:\n'
            '  python3 -m pip install Pillow\n',
            file=sys.stderr,
        )
        raise SystemExit(2)
    return Image, ImageOps


def iter_images(source_dir: Path) -> list[Path]:
    return sorted(
        path
        for path in source_dir.rglob('*')
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTENSIONS
    )


def output_path_for(source: Path, source_dir: Path, output_dir: Path, output_format: str) -> Path:
    relative = source.relative_to(source_dir)
    if output_format == 'original':
        return output_dir / relative
    return (output_dir / relative).with_suffix(f'.{output_format}')


def image_as_rgb(image):
    if image.mode in {'RGBA', 'LA'} or (image.mode == 'P' and 'transparency' in image.info):
        from PIL import Image as PILImage

        background = image.convert('RGBA')
        canvas = PILImage.new('RGBA', background.size, (255, 255, 255, 255))
        canvas.alpha_composite(background)
        return canvas.convert('RGB')
    return image.convert('RGB')


def save_image(image, destination: Path, output_format: str, quality: int) -> None:
    suffix = destination.suffix.lower()
    destination.parent.mkdir(parents=True, exist_ok=True)

    if output_format == 'jpg' or suffix in JPEG_EXTENSIONS:
        rgb_image = image_as_rgb(image)
        rgb_image.save(destination, 'JPEG', quality=quality, optimize=True, progressive=True)
        return

    if output_format == 'webp' or suffix == '.webp':
        image.save(destination, 'WEBP', quality=quality, method=6)
        return

    if suffix == '.png':
        image.save(destination, 'PNG', optimize=True)
        return

    rgb_image = image_as_rgb(image)
    fallback_destination = destination.with_suffix('.jpg')
    rgb_image.save(fallback_destination, 'JPEG', quality=quality, optimize=True, progressive=True)


def optimize_photo(source: Path, destination: Path, *, max_size: int, quality: int, output_format: str) -> tuple[int, int]:
    Image, ImageOps = load_pillow()
    with Image.open(source) as raw_image:
        image = ImageOps.exif_transpose(raw_image)
        image.thumbnail((max_size, max_size))
        save_image(image, destination, output_format, quality)

    source_size = source.stat().st_size
    output_size = destination.stat().st_size
    return source_size, output_size


def format_bytes(size: int) -> str:
    for unit in ('B', 'KB', 'MB'):
        if size < 1024 or unit == 'MB':
            return f'{size:.1f}{unit}' if unit != 'B' else f'{size}B'
        size /= 1024
    return f'{size:.1f}MB'


def main() -> int:
    args = parse_args()
    source_dir = Path(args.source_dir)
    output_dir = Path(args.output_dir)

    if args.max_size < 1:
        print('--max-size must be greater than 0', file=sys.stderr)
        return 2
    if not 1 <= args.quality <= 95:
        print('--quality must be between 1 and 95', file=sys.stderr)
        return 2
    if not source_dir.is_dir():
        print(f'Source folder not found: {source_dir}', file=sys.stderr)
        return 1

    sources = iter_images(source_dir)
    if not sources:
        print(f'No supported images found in {source_dir}')
        return 0

    total_before = 0
    total_after = 0
    processed = 0
    used_destinations: set[Path] = set()

    for source in sources:
        destination = output_path_for(source, source_dir, output_dir, args.format)
        if destination in used_destinations:
            index = 2
            candidate = destination.with_name(f'{destination.stem}-{index}{destination.suffix}')
            while candidate in used_destinations:
                index += 1
                candidate = destination.with_name(f'{destination.stem}-{index}{destination.suffix}')
            destination = candidate
        used_destinations.add(destination)
        if args.dry_run:
            print(f'would optimize: {source} -> {destination}')
            continue

        before, after = optimize_photo(
            source,
            destination,
            max_size=args.max_size,
            quality=args.quality,
            output_format=args.format,
        )
        total_before += before
        total_after += after
        processed += 1
        print(f'optimized: {source.name} {format_bytes(before)} -> {format_bytes(after)}')

    if args.dry_run:
        print(f'Dry run complete: {len(sources)} image(s) found.')
        return 0

    saved = total_before - total_after
    print(
        f'Done: {processed} image(s), '
        f'{format_bytes(total_before)} -> {format_bytes(total_after)} '
        f'({format_bytes(saved)} saved).'
    )
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
