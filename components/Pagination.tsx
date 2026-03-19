'use client';

import { cn } from '@/lib/utils';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  // Build page number list with ellipsis
  function getPages(): (number | '…')[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | '…')[] = [1];
    if (page > 3) pages.push('…');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push('…');
    pages.push(totalPages);
    return pages;
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Previous
      </button>

      {getPages().map((p, i) =>
        p === '…' ? (
          <span key={`ellipsis-${i}`} className="px-2 text-sm text-muted">…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
              p === page
                ? 'bg-primary text-white'
                : 'border border-border text-foreground hover:bg-surface'
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Next
      </button>
    </div>
  );
}
