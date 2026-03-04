import { createContext, useContext, useState, ReactNode } from "react";
import { Member, Expense } from "@/lib/types";

interface TripContextType {
  members: Member[];
  expenses: Expense[];
  addMember: (m: Member) => void;
  removeMember: (id: string) => void;
  addExpense: (e: Expense) => void;
  removeExpense: (id: string) => void;
}

const TripContext = createContext<TripContextType | null>(null);

export function TripProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const addMember = (m: Member) => setMembers((prev) => [...prev, m]);
  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
    setExpenses((prev) =>
      prev
        .filter((e) => e.paidBy !== id)
        .map((e) => ({ ...e, splitAmong: e.splitAmong.filter((x) => x !== id) }))
        .filter((e) => e.splitAmong.length > 0)
    );
  };
  const addExpense = (e: Expense) => setExpenses((prev) => [e, ...prev]);
  const removeExpense = (id: string) => setExpenses((prev) => prev.filter((e) => e.id !== id));

  return (
    <TripContext.Provider value={{ members, expenses, addMember, removeMember, addExpense, removeExpense }}>
      {children}
    </TripContext.Provider>
  );
}

export function useTrip() {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTrip must be used within TripProvider");
  return ctx;
}
