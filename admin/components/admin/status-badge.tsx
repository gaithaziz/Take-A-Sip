import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function StatusBadge({ active, activeLabel = 'Active', inactiveLabel = 'Inactive' }: {
  active: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'border px-2.5 py-0.5 text-xs font-semibold',
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-zinc-200 bg-zinc-100 text-zinc-700',
      )}
    >
      {active ? activeLabel : inactiveLabel}
    </Badge>
  );
}

