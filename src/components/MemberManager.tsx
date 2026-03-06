import { useState } from "react";
import { Member } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserPlus, X, AlertTriangle, Loader2 } from "lucide-react";

const MEMBER_COLORS = [
  "#22C55E",
  "#F97316",
  "#3B82F6",
  "#EC4899",
  "#8B5CF6",
  "#EF4444",
  "#14B8A6",
  "#EAB308",
];

interface MemberWithExpenses extends Member {
  hasExpenses: boolean;
  expenseCount: number;
}

interface Props {
  members: Member[];
  tripId: string;
  onAdd: (member: Member) => void;
  onRemove: (id: string, force?: boolean) => Promise<{ success?: boolean; error?: string; expenseCount?: number; memberName?: string }>;
}

export default function MemberManager({ members, onAdd, onRemove }: Props) {
  const [name, setName] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<MemberWithExpenses | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onAdd({
      id: crypto.randomUUID(),
      name: trimmed,
      color: MEMBER_COLORS[members.length % MEMBER_COLORS.length],
    });
    setName("");
  };

  const handleRemoveClick = async (member: Member) => {
    setIsChecking(true);
    try {
      const result = await onRemove(member.id, false);
      if (result.error && result.expenseCount) {
        setMemberToRemove({
          ...member,
          hasExpenses: true,
          expenseCount: result.expenseCount,
        });
      }
    } catch (error) {
      console.error("Failed to check member:", error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    
    setIsRemoving(true);
    try {
      await onRemove(memberToRemove.id, true);
      setMemberToRemove(null);
    } catch (error) {
      console.error("Failed to remove member:", error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleCancelRemove = () => {
    setMemberToRemove(null);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display font-semibold text-foreground">Trip Members</h2>
      <div className="flex gap-2">
        <Input
          placeholder="Add a friend..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} size="icon" className="shrink-0">
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <span
            key={m.id}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
            style={{ backgroundColor: m.color + "20", color: m.color }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: m.color }}
            />
            {m.name}
            <button
              onClick={() => handleRemoveClick(m)}
              disabled={isChecking}
              className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors disabled:opacity-50"
            >
              {isChecking ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3" />
              )}
            </button>
          </span>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground">Add members to start splitting bills</p>
        )}
      </div>

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && handleCancelRemove()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Remove {memberToRemove?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.hasExpenses ? (
                <span>
                  This member is involved in <strong>{memberToRemove.expenseCount}</strong> expense(s). 
                  Removing them will also delete these expenses. This action cannot be undone.
                </span>
              ) : (
                <span>Are you sure you want to remove this member from the trip?</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelRemove}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? "Removing..." : "Remove Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
