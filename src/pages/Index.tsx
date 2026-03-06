import { useState, useEffect } from "react";
import { useTrip } from "@/context/TripContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Header from "@/components/Header";
import { Plus, Trash2, ChevronRight, MapPin, Mail, Check, Loader2, Plane } from "lucide-react";
import { getCurrencySymbol } from "@/lib/currencies";
import { api } from "@/services/api";

interface Invitation {
  id: string;
  token: string;
  tripId: string;
  tripName: string;
  inviter: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  };
  createdAt: string;
}

const Index = () => {
  const { trips, createTrip, deleteTrip, refreshTrips } = useTrip();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tripName, setTripName] = useState("");
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const currentTab = searchParams.get("tab") || "trips";

  useEffect(() => {
    const token = searchParams.get("token");
    if (token) {
      handleJoinByToken(token);
    }
  }, [searchParams]);

  useEffect(() => {
    loadInvitations();
  }, []);

  const handleTabChange = (value: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("tab", value);
      return newParams;
    });
  };

  const loadInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const data = await api.getInvitations();
      setInvitations(data);
    } catch (error) {
      console.error("Failed to load invitations:", error);
    } finally {
      setLoadingInvitations(false);
    }
  };

  const handleJoinByToken = async (token: string) => {
    try {
      const result = await api.joinTrip(token);
      refreshTrips();
      navigate(`/trip/${result.tripId}`);
    } catch (error) {
      console.error("Failed to join trip:", error);
    }
  };

  const handleAccept = async (id: string) => {
    setAcceptingId(id);
    try {
      const result = await api.acceptInvitation(id);
      refreshTrips();
      setInvitations((prev) => prev.filter((inv) => inv.id !== id));
      navigate(`/trip/${result.tripId}`);
    } catch (error) {
      console.error("Failed to accept invitation:", error);
    } finally {
      setAcceptingId(null);
    }
  };

  const handleCreate = () => {
    const name = tripName.trim();
    if (!name) return;
    const trip = createTrip(name);
    setTripName("");
    navigate(`/trip/${trip.id}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

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

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="trips" className="flex-1">Trips</TabsTrigger>
            <TabsTrigger value="invitations" className="flex-1">
              Invitations
              {invitations.length > 0 && (
                <span className="ml-2 bg-primary text-primary-foreground text-xs rounded-full px-1.5 py-0.5">
                  {invitations.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="trips">
            {/* Trip List */}
            {trips.length > 0 ? (
              <div className="space-y-3">
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
                      {trip.isOwner && (
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            deleteTrip(trip.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
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
          </TabsContent>

          <TabsContent value="invitations">
            {loadingInvitations ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : invitations.length > 0 ? (
              <div className="space-y-3">
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm"
                  >
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Mail className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{inv.tripName}</p>
                      <p className="text-xs text-muted-foreground">
                        Invited by {inv.inviter.name || inv.inviter.email}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAccept(inv.id)}
                      disabled={acceptingId === inv.id}
                      className="gap-1"
                    >
                      {acceptingId === inv.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Accept
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-8 text-center">
                <Mail className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground text-sm">No pending invitations</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
