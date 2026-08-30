import type { Socket } from 'socket.io';
import type { AuthenticatedIdentity } from '../auth/auth.types.js';

export type AuthenticatedSocket = Socket & {
  data: {
    auth?: AuthenticatedIdentity;
  };
};
