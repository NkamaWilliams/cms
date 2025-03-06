import { Router } from "express"
import { authenticateUser, authenticateLecturer, authenticateStudent } from "../middlewares/authMiddleware"
import { getComplaintById, getAllComplaints, createComplaint, editComplaint, resolveComplaint } from "../controllers/complaintController"

const router = Router()

router.get("/get-all", authenticateUser, getAllComplaints);
router.get("/get/:complaintId", authenticateUser, getComplaintById);
router.post("/create", authenticateUser, authenticateStudent, createComplaint);
router.post("/edit", authenticateUser, authenticateStudent, editComplaint);
router.post("/resolve", authenticateUser, authenticateLecturer, resolveComplaint);

export default router;