import { Hono } from "hono";
import { aiRouter } from "./recommendation";
import { assistantRouter } from "./assistant";
import { cachingRouter } from "./caching";

export const router = new Hono<{
  Bindings: {
    DATABASE_URL: string;
    JwtPassword: string;
    OPENAI_API_KEY: string;
    CACHE: KVNamespace;
  };
}>();

router.route("/recommendations", aiRouter);
router.route("/assistant", assistantRouter);
router.route("/cache", cachingRouter);

export default router;