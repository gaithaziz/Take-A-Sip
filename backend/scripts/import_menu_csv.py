import argparse
import asyncio
import csv
from collections import OrderedDict
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from pathlib import Path

from sqlalchemy import delete, func, select

from app.core.database import SessionLocal
from app.models.menu import Addon, Item, ItemType, MenuSchedule, Section, Size


REQUIRED_COLUMNS = {
    'section_sort_order',
    'item_sort_order',
    'section_ar',
    'section_en',
    'subgroup_ar',
    'subgroup_en',
    'item_ar',
    'item_en',
    'type_ar',
    'type_en',
    'size_ar',
    'size_en',
    'price_jod',
    'item_image',
    'addon_ar',
    'addon_en',
    'addon_price_jod',
    'is_active',
}


@dataclass(frozen=True)
class ImportSummary:
    sections: int
    items: int
    item_types: int
    sizes: int
    addons: int
    skipped_rows: int


def clean(value: str | None) -> str:
    return (value or '').strip()


def parse_bool(value: str | None) -> bool:
    normalized = clean(value).lower()
    return normalized not in {'0', 'false', 'no', 'off', 'inactive'}


def parse_int(value: str | None, default: int = 0) -> int:
    try:
        return int(clean(value))
    except ValueError:
        return default


def parse_money(value: str | None, field_name: str, row_number: int) -> Decimal:
    raw_value = clean(value)
    try:
        return Decimal(raw_value)
    except InvalidOperation as exc:
        raise ValueError(f'Row {row_number}: {field_name} must be a decimal, got {raw_value!r}') from exc


def normalized_image_url(filename: str, image_base_url: str | None) -> str | None:
    if not image_base_url or not filename:
        return None
    return f'{image_base_url.rstrip("/")}/{filename.lstrip("/")}'


def validate_columns(fieldnames: list[str] | None) -> None:
    actual = set(fieldnames or [])
    missing = sorted(REQUIRED_COLUMNS - actual)
    if missing:
        raise ValueError(f'Missing required CSV columns: {", ".join(missing)}')


def load_csv(csv_path: Path) -> tuple[list[dict[str, str]], list[str]]:
    with csv_path.open(encoding='utf-8-sig', newline='') as csv_file:
        reader = csv.DictReader(csv_file)
        validate_columns(reader.fieldnames)
        rows = list(reader)
        return rows, reader.fieldnames or []


def summarize_rows(rows: list[dict[str, str]]) -> ImportSummary:
    sections: OrderedDict[tuple[str, str], None] = OrderedDict()
    items: OrderedDict[tuple[str, str, str, str], None] = OrderedDict()
    item_types: OrderedDict[tuple[str, str, str, str, str, str], None] = OrderedDict()
    sizes = 0
    addons = 0
    skipped_rows = 0

    for row in rows:
        section_key = (clean(row['section_ar']), clean(row['section_en']))
        item_key = (*section_key, clean(row['item_ar']), clean(row['item_en']))
        type_key = (*item_key, clean(row['type_ar']), clean(row['type_en']))
        if not clean(row['price_jod']):
            skipped_rows += 1
            continue
        sections.setdefault(section_key, None)
        items.setdefault(item_key, None)
        item_types.setdefault(type_key, None)
        sizes += 1
        if clean(row.get('addon_ar')) and clean(row.get('addon_price_jod')):
            addons += 1

    return ImportSummary(
        sections=len(sections),
        items=len(items),
        item_types=len(item_types),
        sizes=sizes,
        addons=addons,
        skipped_rows=skipped_rows,
    )


async def ensure_empty_or_replacing(replace_menu: bool) -> None:
    async with SessionLocal() as session:
        result = await session.execute(select(func.count(Section.id)))
        existing_sections = result.scalar_one()
        if existing_sections and not replace_menu:
            raise RuntimeError(
                f'Menu already has {existing_sections} section(s). '
                'Run with --replace-menu to clear existing menu data first.'
            )


async def import_rows(rows: list[dict[str, str]], *, replace_menu: bool, image_base_url: str | None) -> ImportSummary:
    await ensure_empty_or_replacing(replace_menu)

    async with SessionLocal() as session:
        if replace_menu:
            await session.execute(delete(MenuSchedule))
            await session.execute(delete(Section))
            await session.flush()

        sections_by_key: dict[tuple[str, str], Section] = {}
        items_by_key: dict[tuple[str, str, str, str], Item] = {}
        types_by_key: dict[tuple[str, str, str, str, str, str], ItemType] = {}
        item_sort_orders: dict[tuple[str, str, str, str], int] = {}
        skipped_rows = 0
        size_count = 0
        addon_count = 0

        for row_number, row in enumerate(rows, start=2):
            if not clean(row['price_jod']):
                skipped_rows += 1
                continue

            section_ar = clean(row['section_ar'])
            section_en = clean(row['section_en'])
            item_ar = clean(row['item_ar'])
            item_en = clean(row['item_en'])
            type_ar = clean(row['type_ar']) or 'تقديم'
            type_en = clean(row['type_en']) or 'Serving'
            size_ar = clean(row['size_ar']) or 'عادي'
            size_en = clean(row['size_en']) or 'Regular'

            if not section_ar or not section_en or not item_ar or not item_en:
                raise ValueError(f'Row {row_number}: section/item Arabic and English names are required')

            section_key = (section_ar, section_en)
            section = sections_by_key.get(section_key)
            if section is None:
                section = Section(
                    name_ar=section_ar,
                    name_en=section_en,
                    sort_order=parse_int(row['section_sort_order']),
                    is_active=parse_bool(row['is_active']),
                )
                session.add(section)
                await session.flush()
                sections_by_key[section_key] = section

            item_key = (*section_key, item_ar, item_en)
            item = items_by_key.get(item_key)
            if item is None:
                item_sort_orders.setdefault(item_key, parse_int(row['item_sort_order']))
                item = Item(
                    section_id=section.id,
                    name_ar=item_ar,
                    name_en=item_en,
                    description_ar=clean(row.get('subgroup_ar')) or None,
                    description_en=clean(row.get('subgroup_en')) or None,
                    image_url=normalized_image_url(clean(row.get('item_image')), image_base_url),
                    sort_order=item_sort_orders[item_key],
                    is_active=parse_bool(row['is_active']),
                )
                session.add(item)
                await session.flush()
                items_by_key[item_key] = item

            type_key = (*item_key, type_ar, type_en)
            item_type = types_by_key.get(type_key)
            if item_type is None:
                item_type = ItemType(
                    item_id=item.id,
                    name_ar=type_ar,
                    name_en=type_en,
                    sort_order=len([key for key in types_by_key if key[:4] == item_key]) + 1,
                    is_active=parse_bool(row['is_active']),
                )
                session.add(item_type)
                await session.flush()
                types_by_key[type_key] = item_type

            size = Size(
                type_id=item_type.id,
                name_ar=size_ar,
                name_en=size_en,
                image_url=normalized_image_url(clean(row.get('size_image')), image_base_url),
                price=parse_money(row['price_jod'], 'price_jod', row_number),
                order_limit=parse_int(row.get('order_limit')) if clean(row.get('order_limit')) else None,
                sort_order=size_count + 1,
                is_active=parse_bool(row['is_active']),
            )
            session.add(size)
            await session.flush()
            size_count += 1

            addon_ar = clean(row.get('addon_ar'))
            addon_en = clean(row.get('addon_en'))
            addon_price = clean(row.get('addon_price_jod'))
            if addon_ar and addon_en and addon_price:
                session.add(
                    Addon(
                        size_id=size.id,
                        name_ar=addon_ar,
                        name_en=addon_en,
                        image_url=normalized_image_url(clean(row.get('addon_image')), image_base_url),
                        price=parse_money(addon_price, 'addon_price_jod', row_number),
                        sort_order=1,
                        is_active=True,
                    )
                )
                addon_count += 1

        await session.commit()

        return ImportSummary(
            sections=len(sections_by_key),
            items=len(items_by_key),
            item_types=len(types_by_key),
            sizes=size_count,
            addons=addon_count,
            skipped_rows=skipped_rows,
        )


def print_summary(summary: ImportSummary, *, dry_run: bool) -> None:
    action = 'Would import' if dry_run else 'Imported'
    print(f'{action}:')
    print(f'  sections: {summary.sections}')
    print(f'  items: {summary.items}')
    print(f'  item types: {summary.item_types}')
    print(f'  sizes: {summary.sizes}')
    print(f'  addons: {summary.addons}')
    print(f'  skipped rows without price: {summary.skipped_rows}')


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Import menu CSV into the Take A Sip menu tables.')
    parser.add_argument(
        '--csv',
        default='../docs/menu_sections_items.csv',
        help='Path to menu CSV, relative to backend/ by default.',
    )
    parser.add_argument('--replace-menu', action='store_true', help='Delete existing menu data before import.')
    parser.add_argument('--dry-run', action='store_true', help='Validate and summarize only. This is the default.')
    parser.add_argument(
        '--image-base-url',
        default=None,
        help='Optional base URL for image filenames. Omit while importing text-only menu data.',
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    csv_path = Path(args.csv)
    if not csv_path.is_absolute():
        csv_path = Path.cwd() / csv_path
    rows, _ = load_csv(csv_path)

    dry_run = args.dry_run or not args.replace_menu
    summary = summarize_rows(rows)
    print_summary(summary, dry_run=dry_run)

    if dry_run:
        if not args.replace_menu:
            print('Dry run only. Add --replace-menu to write to the database.')
        return

    imported = await import_rows(rows, replace_menu=args.replace_menu, image_base_url=args.image_base_url)
    print_summary(imported, dry_run=False)


if __name__ == '__main__':
    asyncio.run(main())
