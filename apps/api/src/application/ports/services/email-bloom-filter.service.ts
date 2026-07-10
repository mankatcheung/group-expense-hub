export interface IEmailBloomFilterService {
  has(email: string): boolean;
  add(email: string): void;
}
