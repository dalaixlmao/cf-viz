
import { userSigninCheck, userSignupCheck, userAuthCheck } from "../middleware/userAuthMiddleware";
import { signinValidation, signupValidation } from "../middleware/validationMiddleware";
import axios from "axios";
import createData from "../controllers/createData";
import { Hono } from "hono";
import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";
import { sign } from "hono/jwt";
export const router = new Hono<{
    Bindings: {
      DATABASE_URL: string;
      JwtPassword: string;
    };
  }>();




router.post("/signup", signupValidation, userSignupCheck, async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());
    const body = await c.req.json();
const handle = body.handle;
  const email = body.email;
  const password = body.password;
  const user = await prisma.user.create({
    data: {
      email: email,
      password: password,
      handle: handle,
    },
  });
  const id = user.id;
  const token = await sign({ id: id }, c.env.JwtPassword);
  c.status(200)
  return c.json({ message: "Signed up succesfully", token: token });
});


router.post(
  "/signin",
  signinValidation,
  userSigninCheck,
  async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());
    const body = await c.req.json();
    const email = body.email;
    const password = body.password;
    const user = await prisma.user.findUnique({
      where: {
        email: email,
      },
    });
    if (!user) {
      c.status(500)
      return c.json({ message: "server error" });
    }
    if (user?.password == password) {
      const id = user?.id;
      const token = await sign({ id: id }, c.env.JwtPassword);
      c.status(200)
      return c.json({ message: "Signed in successfully", token: token });
    }
  }
);

router.get("/handle/:handle", async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());
  
    const handle = c.req.param('handle');
  try {
    const url = "https://codeforces.com/api/user.info?handles=" + handle;
    const r1 = await fetch(url);
    const response:any = await r1.json();
    const url2 = "https://codeforces.com/api/user.status?handle=" + handle;
    const r2 = await fetch(url2);
    const response2 = await r2.json();
    const tagRatingData = createData(response2);
    const result = response.result[0];
    const requiredObj = {
      firstname: result.firstName,
      lastname: result.lastName,
      rank: result.rank,
      maxRank: result.maxRank,
      maxRating: result.maxRating,
      avatar: result.avatar,
      titlePhoto: result.titlePhoto,
      country: result.country,
      currentRating: result.rating,
      handle: handle,
    };
    c.status(200)
    return c.json({
      result: requiredObj,
      tagRating: tagRatingData,
    });
  } catch (e) {
    c.status(500)
    return c.json({
      message: "Error fetching data from Codeforces API",
      error:e
    });
  }
});

router.get("/nav", userAuthCheck, async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());
  
    const id = c.get('jwtPayload');
  try {
    const user = await prisma.user.findUnique({
      where: { id: id },
    });
    if (!user) {
      c.status(500)
      return c.json({ message: "server error" });
    }
    const handle = user?.handle;

    const url =
          "https://codeforces.com/api/user.info?handles=" + handle;
        const r1 = await fetch(url);
        const response:any = await r1.json();
        const avatar = response.result[0].titlePhoto;
    c.status(200)
    return c.json({ handle: handle, avatar:avatar });
  } catch (e) {
    c.status(500)
    return c.json({ message: "error in fetching data from cf", error:e });
  }
});

router.get(
  "/dashboard",
  userAuthCheck,
  async (c) => {
    const prisma = new PrismaClient({
        datasourceUrl: c.env.DATABASE_URL,
      }).$extends(withAccelerate());
    
    const id = c.get('jwtPayload');

    if (!id) {
      c.status(400)
      return c.json({ message: "User ID not provided" });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: id },
      });
      if (!user) {
        c.status(404);
        return c.json({ message: "User not found" });
      }

      try {
        const url =
          "https://codeforces.com/api/user.info?handles=" + user.handle;
        const r1 = await fetch(url);
        const response:any = await r1.json();
        const url2 =
          "https://codeforces.com/api/user.status?handle=" + user.handle;
          const r2 = await fetch(url2);
        const response2 = await r2.json();
        const tagRatingData = createData(response2);
        const result = response.result[0];
        const requiredObj = {
          firstname: result.firstName,
          lastname: result.lastName,
          rank: result.rank,
          maxRank: result.maxRank,
          maxRating: result.maxRating,
          avatar: result.avatar,
          titlePhoto: result.titlePhoto,
          country: result.country,
          currentRating: result.rating,
          handle: user.handle,
        };
        c.status(200)
        return c.json({
          result: requiredObj,
          tagRating: tagRatingData,
        });
      } catch (axiosError:any) {
        c.status(500)
        return c.json({
          message: "Error fetching data from Codeforces API",
          user: user,
          error: axiosError.message
        });
      }
    } catch (prismaError) {
      c.status(500)
      return c.json({ message: "Error querying the database", error:prismaError });
    }
  }
);
export default router;
