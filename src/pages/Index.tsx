import { useState } from "react";
import { useTrip } from "@/context/TripContext";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plane, Plus, Trash2, ChevronRight, MapPin } from "lucide-react";
import { getCurrencySymbol } from "@/lib/currencies";

const Index = () => {
  const { trips, createTrip, deleteTrip } = useTrip();
  const navigate = useNavigate();
  const [tripName, setTripName] = useState("");

  const handleCreate = () => {
    const name = tripName.trim();
    if (!name) return;
    const trip = createTrip(name);
    setTripName("");
    navigate(`/trip/${trip.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-foreground tracking-tight">
            SplitTrip
          </h1>
          <p className="mt-2 text-muted-foreground">
            Split expenses with friends, no awkward math needed
          </p>
        </div>

        {/* Create Trip */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm mb-6">
          <h2 className="text-lg font-display font-semibold text-foreground mb-3">New Trip</h2>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. Bali 2026, Road Trip..."
              value={tripName}
              onChange={(e) => setTripName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              className="flex-1"
            />
            <Button onClick={handleCreate} className="gap-2 shrink-0">
              <Plus className="h-4 w-4" />
              Create
            </Button>
          </div>
        </div>

        {/* Trip List */}
        {trips.length > 0 ? (
          <div className="space-y-3">
            <h2 className="text-lg font-display font-semibold text-foreground">Your Trips</h2>
            {trips.map((trip) => {
              const totalByCurrency = trip.expenses.reduce<Record<string, number>>((acc, e) => {
                acc[e.currency] = (acc[e.currency] || 0) + e.amount;
                return acc;
              }, {});
              const totals = Object.entries(totalByCurrency);

              return (
                <div
                  key={trip.id}
                  className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => navigate(`/trip/${trip.id}`)}
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{trip.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {trip.members.length} member{trip.members.length !== 1 ? "s" : ""} · {trip.expenses.length} expense{trip.expenses.length !== 1 ? "s" : ""}
                      {totals.length > 0 && (
                        <span>
                          {" "}· {totals.map(([cur, amt]) => `${getCurrencySymbol(cur)}${amt.toFixed(0)}`).join(", ")}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      deleteTrip(trip.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 rounded-lg"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <MapPin className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground text-sm">Create your first trip to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
