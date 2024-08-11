import z from "zod";
// import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { BlankInput } from "hono/types";
import { Context } from "hono";
import { verify } from "hono/jwt";
import { JWTPayload } from "hono/utils/jwt/types";
async function userSignupCheck(
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
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const body = await c.req.json();
  const email = body.email;
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  if (user) {
    c.status(403);
    return c.json({ message: "User already exist" });
  } else {
    await next();
  }
}

async function userSigninCheck(
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
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  const body = await c.req.json();
  const email = body.email;
  const user = await prisma.user.findUnique({
    where: {
      email: email,
    },
  });
  if (user) {
    await next();
  } else {
    c.status(403);
    return c.json({ message: "Invalid Credentials, user doesn't exist" });
  }
}

interface MyJwtPayload extends JWTPayload {
  id: number;
}

async function userAuthCheck(
  c: Context<{
    Bindings: {
      DATABASE_URL: string;
      JwtPassword: string;
    };
  }>,
  next: any
) {
  const prisma = new PrismaClient({
    datasourceUrl: c.env.DATABASE_URL,
  }).$extends(withAccelerate());
  //   console.log(c.req);
  const a = c.req.header("Authorization");

  if (a) {
    const token = a.split(" ")[1];
    console.log(a);
    try {
      const decoded = (await verify(token, c.env.JwtPassword)) as MyJwtPayload;
      console.log(decoded);
      if (decoded) {
        c.set("jwtPayload", decoded.id);

        const user = await prisma.user.findUnique({
          where: { id: decoded.id },
        });
        if (user) {
          {
            await next();
          }
        } else {
          c.status(403);
          return c.json({ message: "Invalid credentials1" });
        }
      } else {
        c.status(403);
        return c.json({ message: "Invalid credentials2" });
      }
    } catch (e) {
      c.status(403);
      return c.json({ message: "Invalid credentials3" });
    }
  } else {
    c.status(403);
    return c.json({ message: "Invalid credentials4" });
  }
}

export { userSigninCheck, userSignupCheck, userAuthCheck };
