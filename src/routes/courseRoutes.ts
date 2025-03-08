import express from "express";
import { getAllCourses, createCourse } from "../controllers/courseControllers";
import { authenticateUser, authenticateLecturer } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/get-all", getAllCourses);
router.post("/create", authenticateUser, authenticateLecturer, createCourse);
// router.post("/create", createCourse);

export default router;