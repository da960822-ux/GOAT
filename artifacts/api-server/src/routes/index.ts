import { Router, type IRouter } from "express";
import authRouter from "./auth";
import bookmarksRouter from "./bookmarks";
import feedbackRouter from "./feedback";
import healthRouter from "./health";
import imageStatusRouter from "./image-status";
import ktoRouter from "./kto";
import recommendationsRouter from "./recommendations";
import publicDiscoveryRouter from "./public-discovery";
import travelRouter from "./travel";

const router: IRouter = Router();

router.use(authRouter);
router.use(bookmarksRouter);
router.use(feedbackRouter);
router.use(healthRouter);
router.use(imageStatusRouter);
router.use(ktoRouter);
router.use(recommendationsRouter);
router.use(publicDiscoveryRouter);
router.use(travelRouter);

export default router;
