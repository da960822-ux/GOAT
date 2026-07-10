import { Router, type IRouter } from "express";
import authRouter from "./auth";
import healthRouter from "./health";
import imageStatusRouter from "./image-status";
import ktoRouter from "./kto";
import travelRouter from "./travel";

const router: IRouter = Router();

router.use(authRouter);
router.use(healthRouter);
router.use(imageStatusRouter);
router.use(ktoRouter);
router.use(travelRouter);

export default router;
