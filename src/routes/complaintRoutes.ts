import { Router } from "express"
import { authenticateUser, authenticateLecturer } from "../middlewares/authMiddleware"
import { getComplaintById, getAllComplaints, createComplain, editComplaint } from "../controllers/complaintController"

const router = Router()

router.get("/get-all-complaints", authenticateUser, getAllComplaints);
router.get("/get-complaint-by-id", authenticateUser, getComplaintById);
router.post("/create-complaint", authenticateUser, createComplain);
router.post("/edit-complaint", authenticateUser, editComplaint);

export default router;