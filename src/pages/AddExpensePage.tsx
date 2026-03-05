import { useParams, useNavigate } from "react-router-dom";
import { useTrip } from "@/context/TripContext";
import AddExpense from "@/components/AddExpense";
import { Plane, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const AddExpensePage = () => {
  const { tripId } = useParams<{ tripId: string }>();
  const { getTrip, addExpense } = useTrip();
  const navigate = useNavigate();

  const trip = getTrip(tripId!);

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Trip not found</p>
          <Button variant="outline" onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        <div className="mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/trip/${trip.id}`)} className="gap-2 text-muted-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back to {trip.name}
          </Button>
        </div>

        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 text-primary mb-4">
            <Plane className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground tracking-tight">
            {trip.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add members and log expenses
          </p>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <AddExpense members={trip.members} onAdd={(e) => addExpense(trip.id, e)} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddExpensePage;
