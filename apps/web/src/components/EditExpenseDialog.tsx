import { useState, useRef, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Expense, Member } from '@/lib/types';
import { CURRENCIES } from '@/lib/currencies';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { CalendarIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { enUS, zhHK } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Props {
  expense: Expense;
  members: Member[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (expense: Expense) => void;
}

export default function EditExpenseDialog({ expense, members, open, onOpenChange, onSave }: Props) {
  const t = useTranslations('expense');
  const locale = useLocale();
  const dateLocale = locale === 'zh-HK' ? zhHK : enUS;
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount.toString());
  const [currency, setCurrency] = useState(expense.currency);
  const [paidBy, setPaidBy] = useState(expense.paidBy);
  const [splitAmong, setSplitAmong] = useState<string[]>(expense.splitAmong);
  const [date, setDate] = useState<Date>(parseISO(expense.date));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDescription(expense.description);
      setAmount(expense.amount.toString());
      setCurrency(expense.currency);
      setPaidBy(expense.paidBy);
      setSplitAmong(expense.splitAmong);
      setDate(parseISO(expense.date));
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, expense]);

  const toggleSplit = (id: string) => {
    setSplitAmong((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = () => {
    if (!description.trim() || !amount || !paidBy || splitAmong.length === 0) return;
    onSave({
      ...expense,
      description: description.trim(),
      amount: parseFloat(amount),
      currency,
      paidBy,
      splitAmong,
      date: date.toISOString(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editExpense')}</DialogTitle>
          <DialogDescription>{t('editExpenseDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              ref={inputRef}
              placeholder={t('descriptionPlaceholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              aria-label={t('descriptionAriaLabel')}
            />
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1"
                aria-label={t('amountAriaLabel')}
              />
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="w-24" aria-label={t('selectCurrencyAriaLabel')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.symbol} {c.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">{t('dateLabel')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal')}
                  aria-label={t('selectDateAriaLabel')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {format(date, 'PPP', { locale: dateLocale })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">{t('paidByLabel')}</Label>
            <Select value={paidBy} onValueChange={setPaidBy}>
              <SelectTrigger aria-label={t('selectWhoPaidAriaLabel')}>
                <SelectValue placeholder={t('whoPaidPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full inline-block"
                        style={{ backgroundColor: m.color }}
                      />
                      {m.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm text-muted-foreground mb-2 block">
              {t('splitAmongLabel')}
            </Label>
            <div className="flex flex-wrap gap-3">
              {members.map((m) => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 cursor-pointer rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted has-[:checked]:ring-2 has-[:checked]:ring-primary/30 has-[:checked]:border-primary/50"
                >
                  <Checkbox
                    checked={splitAmong.includes(m.id)}
                    onCheckedChange={() => toggleSplit(m.id)}
                  />
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                  <span className="text-sm font-medium">{m.name}</span>
                </label>
              ))}
            </div>
          </div>

          <Button onClick={handleSave} className="w-full">
            {t('saveChanges')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
