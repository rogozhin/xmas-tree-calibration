import 'reflect-metadata';
import dotenv from 'dotenv';
import Koa from 'koa';

import { createApp } from './app';
import { error, info } from './logger';

export async function startServer() {
  try {
    info('starting...');
    if (!process.env.NODE_ENV) {
      dotenv.config();
    }
    info(`environment set to ${process.env.NODE_ENV}`);
    const app: Koa = await createApp();
    app.listen(process.env.PORT);
    info(`listening on localhost:${process.env.PORT}`);
  } catch (ex) {
    error(new Error('exception starting server'), ex);
  }
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
startServer();
