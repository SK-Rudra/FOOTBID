import type { Request } from 'express';
import type { AuthenticatedIdentity } from './auth.types.js';

export interface AuthenticatedRequest extends Request {
  auth?: AuthenticatedIdentity;
}
