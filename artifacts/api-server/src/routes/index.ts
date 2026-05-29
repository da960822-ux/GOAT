import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ktoRouter from "./kto";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ktoRouter);

export default router;
