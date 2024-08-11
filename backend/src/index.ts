import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Router } from 'hono/router'
import router from '../routes/user';



const app = new Hono<{
  Bindings:{
    DATABSE_URL: string;
    JwtPassword:string;
  }
}>();

app.use(cors());
app.route('/user', router);

app.get('/', (c) => {
  return c.text('Hello Hono!')
})

export default app
