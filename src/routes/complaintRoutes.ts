import { Router } from "express"
import { authenticateUser, authenticateLecturer, authenticateStudent } from "../middlewares/authMiddleware"
import { getComplaintById, getAllComplaints, createComplaint, editComplaint, resolveComplaint, markComplaintAsPending, deleteComplaint } from "../controllers/complaintController"

const router = Router()

router.get("/get-all", authenticateUser, getAllComplaints);
router.get("/get/:complaintId", authenticateUser, getComplaintById);
router.post("/create", authenticateUser, authenticateStudent, createComplaint);
router.post("/edit", authenticateUser, authenticateStudent, editComplaint);
router.post("/resolve", authenticateUser, authenticateLecturer, resolveComplaint);
router.post("/mark-as-pending", authenticateUser, authenticateLecturer, markComplaintAsPending);
router.post("/delete", authenticateUser, authenticateStudent, deleteComplaint);

export default router;