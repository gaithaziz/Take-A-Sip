import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full rounded-md" />
        ))}
      </CardContent>
    </Card>
  );
}

