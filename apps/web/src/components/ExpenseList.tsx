import { useMemo, useState, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Expense, Member } from '@/lib/types';
import { getCurrencySymbol } from '@/lib/currencies';
import { Trash2, Pencil, List, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import EditExpenseDialog from '@/components/EditExpenseDialog';

interface Props {
  expenses: Expense[];
  members: Member[];
  onRemove: (id: string) => void;
  onUpdate: (expense: Expense) => void;
}

type ViewMode = 'date' | 'list';

export default function ExpenseList({ expenses, members, onRemove, onUpdate }: Props) {
  const getMember = (id: string) => members.find((m) => m.id === id);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('date');
  const [activeTab, setActiveTab] = useState<string | undefined>(undefined);

  const parentRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLDivElement>(null);

  const grouped = useMemo(() => {
    const map = new Map<string, Expense[]>();
    for (const e of expenses) {
      const key = format(parseISO(e.date), 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [expenses]);

  const currentTab =
    activeTab && grouped.some(([d]) => d === activeTab) ? activeTab : grouped[0]?.[0];

  const currentGroupExpenses = useMemo(() => {
    if (!currentTab) return [];
    const group = grouped.find(([d]) => d === currentTab);
    return group?.[1] ?? [];
  }, [currentTab, grouped]);

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [expenses]);

  const virtualizer = useVirtualizer({
    count: sortedExpenses.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  const groupVirtualizer = useVirtualizer({
    count: currentGroupExpenses.length,
    getScrollElement: () => activeTabRef.current,
    estimateSize: () => 80,
    overscan: 5,
  });

  if (expenses.length === 0) return null;

  const renderExpenseItem = (e: Expense) => {
    const payer = getMember(e.paidBy);
    return (
      <div
        key={e.id}
        className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 group transition-colors hover:bg-muted/50"
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
          style={{
            backgroundColor: (payer?.color ?? 'hsl(var(--primary))') + '18',
            color: payer?.color ?? 'hsl(var(--primary))',
          }}
        >
          {getCurrencySymbol(e.currency)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{e.description}</p>
          <p className="text-xs text-muted-foreground">
            <span style={{ color: payer?.color }}>{payer?.name}</span> paid · split{' '}
            {e.splitAmong.length} way{e.splitAmong.length > 1 ? 's' : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-semibold text-sm">
            {getCurrencySymbol(e.currency)}
            {e.amount.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground">{format(parseISO(e.date), 'MMM d')}</p>
        </div>
        <button
          onClick={() => setEditingExpense(e)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary transition-all p-1 rounded"
          aria-label={`Edit expense: ${e.description}`}
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          onClick={() => onRemove(e.id)}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
          aria-label={`Delete expense: ${e.description}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display font-semibold text-foreground">
          Expenses ({expenses.length})
        </h2>
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'date' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('date')}
            className="gap-1"
            aria-label="View expenses by date"
            aria-pressed={viewMode === 'date'}
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">By Date</span>
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-1"
            aria-label="View expenses as list"
            aria-pressed={viewMode === 'list'}
          >
            <List className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">List</span>
          </Button>
        </div>
      </div>

      {viewMode === 'date' ? (
        <Tabs value={currentTab} onValueChange={setActiveTab}>
          <TabsList className="w-full flex-wrap h-auto gap-1">
            {grouped.map(([date, items]) => (
              <TabsTrigger key={date} value={date} className="text-xs">
                {format(parseISO(date), 'MMM d')} ({items.length})
              </TabsTrigger>
            ))}
          </TabsList>

          {grouped.map(([date, items]) => (
            <TabsContent key={date} value={date}>
              {items.length > 50 ? (
                <div
                  ref={activeTabRef}
                  className="space-y-2"
                  style={{
                    height: Math.min(items.length * 80, 400),
                    overflow: 'auto',
                  }}
                >
                  <div
                    style={{
                      height: `${groupVirtualizer.getTotalSize()}px`,
                      width: '100%',
                      position: 'relative',
                    }}
                  >
                    {groupVirtualizer.getVirtualItems().map((virtualRow) => (
                      <div
                        key={virtualRow.key}
                        data-index={virtualRow.index}
                        ref={groupVirtualizer.measureElement}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        {renderExpenseItem(items[virtualRow.index])}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">{items.map(renderExpenseItem)}</div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <div>
          {sortedExpenses.length > 50 ? (
            <div
              ref={parentRef}
              className="space-y-2"
              style={{
                height: Math.min(sortedExpenses.length * 80, 400),
                overflow: 'auto',
              }}
            >
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => (
                  <div
                    key={virtualRow.key}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    {renderExpenseItem(sortedExpenses[virtualRow.index])}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">{sortedExpenses.map(renderExpenseItem)}</div>
          )}
        </div>
      )}

      {editingExpense && (
        <EditExpenseDialog
          expense={editingExpense}
          members={members}
          open={!!editingExpense}
          onOpenChange={(open) => !open && setEditingExpense(null)}
          onSave={onUpdate}
        />
      )}
    </div>
  );
}
