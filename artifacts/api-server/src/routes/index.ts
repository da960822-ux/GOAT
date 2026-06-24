import { Router, type IRouter } from "express";
import healthRouter from "./health";
import ktoRouter from "./kto";
import travelRouter from "./travel";

const router: IRouter = Router();

router.use(healthRouter);
router.use(ktoRouter);
router.use(travelRouter);

export default router;
