import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Router } from 'hono/router'
import userRouter from '../routes/user';
import aiRouter from '../routes/ai';

const app = new Hono<{
  Bindings:{
    DATABASE_URL: string;
    DIRECT_URL: string;
    JwtPassword: string;
    OPENAI_API_KEY: string;
    CACHE: KVNamespace;
  }
}>();

app.use(cors());
app.route('/user', userRouter);
app.route('/ai', aiRouter);

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app