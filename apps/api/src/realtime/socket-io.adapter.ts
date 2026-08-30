import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { Server, ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
  constructor(
    application: INestApplicationContext,
    private readonly webUrl: string,
  ) {
    super(application);
  }

  override createIOServer(port: number, options?: ServerOptions): Server {
    const configuredOptions = {
      ...options,
      cors: {
        origin: this.webUrl,
        credentials: true,
        methods: ['GET', 'POST'],
      },
    } as ServerOptions;

    return super.createIOServer(port, configuredOptions);
  }
}
