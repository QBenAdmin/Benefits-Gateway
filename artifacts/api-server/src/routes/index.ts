import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import employeesRouter from "./employees";
import benefitPlansRouter from "./benefit_plans";
import enrollmentsRouter from "./enrollments";
import carriersRouter from "./carriers";
import documentsRouter from "./documents";
import integrationsRouter from "./integrations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(employeesRouter);
router.use(benefitPlansRouter);
router.use(enrollmentsRouter);
router.use(carriersRouter);
router.use(documentsRouter);
router.use(integrationsRouter);

export default router;
