export interface UserRow {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
}

export interface IUserRepository {
  findById(id: string): Promise<UserRow | null>;
  findByEmail(email: string): Promise<UserRow | null>;
  update(id: string, data: UpdateUserData): Promise<void>;
}
