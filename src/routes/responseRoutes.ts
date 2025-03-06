import { Router } from "express";
import { addResponse, getAllResponses } from "../controllers/responseControllers";
import { authenticateUser } from "../middlewares/authMiddleware";

const router = Router();

router.post("/add", authenticateUser, addResponse);
router.get("/get/:complaintId", authenticateUser, getAllResponses);

export default router