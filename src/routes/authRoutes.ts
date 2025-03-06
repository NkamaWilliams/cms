import express from "express"
import { registerLecturer, registerStudent, signIn } from "../controllers/authControllers"

const router = express.Router();

router.post("/register/student", registerStudent);
router.post("/register/lecturer", registerLecturer);
router.post("/signin", signIn);

export default router;