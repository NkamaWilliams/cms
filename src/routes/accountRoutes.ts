import express from "express"
import { deleteAccount } from "../controllers/accountControllers";
import { authenticateUser } from "../middlewares/authMiddleware";

const router = express.Router()

router.post("/delete", authenticateUser, deleteAccount)

export default router