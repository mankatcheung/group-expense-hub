export interface RateLimitResult {
  success: boolean;
  remaining: number;
  reset: number;
}

export interface IRateLimitService {
  limit(identifier: string): Promise<RateLimitResult>;
}
