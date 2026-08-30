import { Injectable } from '@nestjs/common';

export interface SocketRateLimitDecision {
  allowed: boolean;
  retryAfterMs: number;
}

@Injectable()
export class SocketRateLimiterService {
  private readonly attempts = new Map<string, number[]>();

  consume(
    socketId: string,
    eventName: string,
    limit: number,
    windowMs: number,
    now = Date.now(),
  ): SocketRateLimitDecision {
    const key = `${socketId}:${eventName}`;
    const cutoff = now - windowMs;

    const recentAttempts = (this.attempts.get(key) ?? []).filter(
      (attemptedAt) => attemptedAt > cutoff,
    );

    if (recentAttempts.length >= limit) {
      this.attempts.set(key, recentAttempts);

      const oldestAttempt = recentAttempts[0] ?? now;

      return {
        allowed: false,
        retryAfterMs: Math.max(1, oldestAttempt + windowMs - now),
      };
    }

    recentAttempts.push(now);
    this.attempts.set(key, recentAttempts);

    return {
      allowed: true,
      retryAfterMs: 0,
    };
  }

  clearSocket(socketId: string): void {
    const prefix = `${socketId}:`;

    for (const key of this.attempts.keys()) {
      if (key.startsWith(prefix)) {
        this.attempts.delete(key);
      }
    }
  }
}
