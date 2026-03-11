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
import { UserPlus, X, AlertTriangle, Loader2, Pencil } from "lucide-react";

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
  onUpdate: (memberId: string, name: string) => void;
  onRemove: (id: string, force?: boolean) => Promise<{ success?: boolean; error?: string; expenseCount?: number; memberName?: string }>;
}

export default function MemberManager({ members, onAdd, onUpdate, onRemove }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editError, setEditError] = useState("");
  const [memberToRemove, setMemberToRemove] = useState<MemberWithExpenses | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const isNameTaken = (nameToCheck: string, excludeId?: string) => {
    return members.some(
      (m) => m.id !== excludeId && m.name.toLowerCase() === nameToCheck.toLowerCase()
    );
  };

  const handleAdd = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (isNameTaken(trimmed)) {
      setError("A member with this name already exists");
      return;
    }
    setError("");
    const colorIndex = members.length % MEMBER_COLORS.length;
    onAdd({
      id: crypto.randomUUID(),
      name: trimmed,
      color: MEMBER_COLORS[colorIndex] ?? "#16553b",
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

  const handleEditClick = (member: Member) => {
    setEditingId(member.id);
    setEditValue(member.name);
    setEditError("");
  };

  const handleEditSave = (memberId: string) => {
    const trimmed = editValue.trim();
    if (!trimmed) {
      setEditingId(null);
      setEditValue("");
      setEditError("");
      return;
    }
    if (isNameTaken(trimmed, memberId)) {
      setEditError("A member with this name already exists");
      return;
    }
    setEditError("");
    onUpdate(memberId, trimmed);
    setEditingId(null);
    setEditValue("");
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue("");
    setEditError("");
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, memberId: string) => {
    if (e.key === "Enter") {
      handleEditSave(memberId);
    } else if (e.key === "Escape") {
      handleEditCancel();
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-display font-semibold text-foreground">Trip Members</h2>
      <div className="space-y-1">
        <div className="flex gap-2">
          <Input
            placeholder="Add a friend..."
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} size="icon" className="shrink-0">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
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
            {editingId === m.id ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editValue}
                  onChange={(e) => {
                    setEditValue(e.target.value);
                    setEditError("");
                  }}
                  onKeyDown={(e) => handleEditKeyDown(e, m.id)}
                  onBlur={() => handleEditSave(m.id)}
                  className="h-5 w-20 py-0 px-1 text-xs bg-background/50 border-input"
                  autoFocus
                />
                {editError && (
                  <span className="text-xs text-destructive whitespace-nowrap">{editError}</span>
                )}
              </div>
            ) : (
              <span className="max-w-[100px] truncate">{m.name}</span>
            )}
            {editingId !== m.id && (
              <>
                <button
                  onClick={() => handleEditClick(m)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
                >
                  <Pencil className="h-3 w-3" />
                </button>
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
              </>
            )}
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
