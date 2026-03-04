import { useState } from "react";
import { Member } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UserPlus, X } from "lucide-react";

const MEMBER_COLORS = [
  "hsl(165 55% 38%)",
  "hsl(35 80% 56%)",
  "hsl(220 60% 52%)",
  "hsl(340 65% 55%)",
  "hsl(270 50% 55%)",
  "hsl(15 75% 55%)",
  "hsl(190 60% 42%)",
  "hsl(95 45% 45%)",
];

interface Props {
  members: Member[];
  onAdd: (member: Member) => void;
  onRemove: (id: string) => void;
}

export default function MemberManager({ members, onAdd, onRemove }: Props) {
  const [name, setName] = useState("");

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
              onClick={() => onRemove(m.id)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {members.length === 0 && (
          <p className="text-sm text-muted-foreground">Add members to start splitting bills</p>
        )}
      </div>
    </div>
  );
}
