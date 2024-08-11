import z from "zod";
import { Context } from "hono";
import { BlankInput } from "hono/types";

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8);
const handleSchema = z.string();

const userSignup = z.object({
  email: emailSchema,
  password: passwordSchema,
  handle: handleSchema,
});

const userSignin = z.object({
  email: emailSchema,
  password: passwordSchema,
});

async function signupValidation(
  c: Context<
    {
      Bindings: {
        DATABASE_URL: string;
        JwtPassword: string;
      };
    },
    "/signup",
    BlankInput
  >,
  next: any
) {
  const body = await c.req.json();
  const signUp = body;
  const response = userSignup.safeParse(signUp);
  if (response.success) {await next();}
  else {
    c.status(403);
    return c.json({ message: "Invalid Inputs" });
  }
}

async function signinValidation(
  c: Context<
    {
      Bindings: {
        DATABASE_URL: string;
        JwtPassword: string;
      };
    },
    "/signin",
    BlankInput
  >,
  next: any
) {
  const body = await c.req.json();
  const signIn = body;
  const response = userSignin.safeParse(signIn);
  if (response.success) {await next();}
  else {
    c.status(403);
    return c.json({ message: "Invalid Inputs" });
  }
}

export { signinValidation, signupValidation };
