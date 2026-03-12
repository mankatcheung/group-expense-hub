export function TripCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="h-11 w-11 rounded-xl bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-[140px] rounded bg-muted animate-pulse" />
        <div className="h-3 w-[200px] rounded bg-muted animate-pulse" />
      </div>
      <div className="h-4 w-4 rounded bg-muted animate-pulse" />
    </div>
  );
}

export function InvitationSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="h-11 w-11 rounded-xl bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-[160px] rounded bg-muted animate-pulse" />
        <div className="h-3 w-[120px] rounded bg-muted animate-pulse" />
      </div>
      <div className="h-8 w-20 rounded bg-muted animate-pulse" />
    </div>
  );
}

export function ExpenseCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-[180px] rounded bg-muted animate-pulse" />
        <div className="h-3 w-[100px] rounded bg-muted animate-pulse" />
      </div>
      <div className="h-5 w-16 rounded bg-muted animate-pulse" />
    </div>
  );
}

export function MemberBadgeSkeleton() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5">
      <div className="h-2 w-2 rounded-full bg-muted animate-pulse" />
      <div className="h-4 w-16 rounded bg-muted animate-pulse" />
    </div>
  );
}

export function BalanceSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
        <div className="space-y-1">
          <div className="h-4 w-[100px] rounded bg-muted animate-pulse" />
          <div className="h-3 w-[60px] rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="h-5 w-16 rounded bg-muted animate-pulse" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-6">
          <div className="h-6 w-20 rounded bg-muted animate-pulse" />
        </div>
        <div className="mb-8 text-center space-y-4">
          <div className="h-14 w-14 rounded-2xl mx-auto bg-muted animate-pulse" />
          <div className="h-8 w-48 mx-auto rounded bg-muted animate-pulse" />
          <div className="h-4 w-32 mx-auto rounded bg-muted animate-pulse" />
        </div>
        <div className="h-10 w-full rounded-lg bg-muted animate-pulse mb-6" />
        <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="h-5 w-32 rounded bg-muted animate-pulse" />
          <div className="space-y-3">
            <div className="h-16 w-full rounded bg-muted animate-pulse" />
            <div className="h-16 w-full rounded bg-muted animate-pulse" />
            <div className="h-16 w-full rounded bg-muted animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        <div className="h-10 w-full rounded bg-muted animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        <div className="h-10 w-full rounded bg-muted animate-pulse" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        <div className="h-10 w-full rounded bg-muted animate-pulse" />
      </div>
      <div className="h-10 w-32 rounded bg-muted animate-pulse" />
    </div>
  );
}

export function AuthPageSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl mx-auto bg-muted animate-pulse" />
          <div className="h-8 w-32 mx-auto rounded bg-muted animate-pulse" />
          <div className="h-4 w-48 mx-auto rounded bg-muted animate-pulse" />
        </div>
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="space-y-2">
            <div className="h-4 w-12 rounded bg-muted animate-pulse" />
            <div className="h-10 w-full rounded bg-muted animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="h-10 w-full rounded bg-muted animate-pulse" />
          </div>
          <div className="h-10 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-32 mx-auto rounded bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  );
}
