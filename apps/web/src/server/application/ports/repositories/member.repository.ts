export interface CreateMemberData {
  id: string;
  name: string;
  color: string;
  tripId: string;
}

export interface UpdateMemberData {
  name: string;
}

export interface MemberRow {
  id: string;
  name: string;
  color: string;
  tripId: string;
}

export interface IMemberRepository {
  findById(id: string): Promise<MemberRow | null>;
  findByTripAndName(tripId: string, name: string): Promise<MemberRow | null>;
  findNamesByTripId(tripId: string): Promise<Set<string>>;
  countExpenses(tripId: string, memberId: string): Promise<number>;
  create(data: CreateMemberData): Promise<MemberRow>;
  update(id: string, data: UpdateMemberData): Promise<MemberRow>;
  delete(id: string): Promise<void>;
}
