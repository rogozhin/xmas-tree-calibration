import cors from 'kcors';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import path from 'path';
import { Readable } from 'stream';

import errorMiddleware from './middleware/ErrorMiddleware';

// eslint-disable-next-line require-await
export async function createApp(): Promise<Koa> {
  const app: Koa = new Koa();

  app
    .use(cors())
    .use(serve(path.join(__dirname, '/../static')))
    .use((ctx) => {
      if (ctx.request.url === '/config.js') {
        const s = new Readable();
        s.push(`window.config = {`);
        s.push(`  matrixSize: ${process.env.MATRIX_SIZE},`);
        s.push(`  treeRatio: ${process.env.TREE_RATIO},`);
        s.push(`  leds: ${process.env.LEDS},`);
        s.push(`  treeIp: '${process.env.TREE_IP}',`);
        s.push(`};`);
        s.push(null); // indicates end of the stream
        ctx.body = s;
      } else {
        ctx.next();
      }
    })
    .use(bodyParser())
    .use(errorMiddleware);

  return app;
}
