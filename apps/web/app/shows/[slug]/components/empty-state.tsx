'use client';

import type { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="mb-2 font-semibold text-lg">{title}</h3>
      {description && (
        <p className="mb-4 max-w-sm text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}
