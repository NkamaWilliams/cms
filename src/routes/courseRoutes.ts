import express from "express";
import { getAllCourses, createCourse, getMyCourses, editCourses } from "../controllers/courseControllers";
import { authenticateUser, authenticateLecturer } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/get-all", getAllCourses);
router.post("/create", authenticateUser, authenticateLecturer, createCourse);
router.post("/edit", authenticateUser, editCourses);
router.get("/get-mine", authenticateUser, getMyCourses)

export default router;