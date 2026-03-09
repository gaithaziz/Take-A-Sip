import { Label } from '@/components/ui/label';

export function FormSection({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
      <div>
        <Label className="text-sm font-semibold text-zinc-900">{title}</Label>
        {description ? <p className="text-xs text-zinc-600">{description}</p> : null}
      </div>
      {children}
    </div>
  );
}

