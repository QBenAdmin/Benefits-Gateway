import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import employeesRouter from "./employees";
import benefitPlansRouter from "./benefit_plans";
import enrollmentsRouter from "./enrollments";
import carriersRouter from "./carriers";
import documentsRouter from "./documents";
import integrationsRouter from "./integrations";
import employersRouter from "./employers";
import adminUsersRouter from "./admin_users";
import dependentsRouter from "./dependents";
import enrollmentPeriodsRouter from "./enrollment_periods";
import enrollmentChangesRouter from "./enrollment_changes";
import notificationsRouter from "./notifications";
import chatbotRouter from "./chatbot";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(employeesRouter);
router.use(benefitPlansRouter);
router.use(enrollmentsRouter);
router.use(carriersRouter);
router.use(documentsRouter);
router.use(integrationsRouter);
router.use(employersRouter);
router.use(adminUsersRouter);
router.use(dependentsRouter);
router.use(enrollmentPeriodsRouter);
router.use(enrollmentChangesRouter);
router.use(notificationsRouter);
router.use(chatbotRouter);

export default router;
