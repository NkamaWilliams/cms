import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes"
import courseRoutes from "./routes/courseRoutes"
import complaintRoutes from "./routes/complaintRoutes"

dotenv.config();

const app = express();

//Middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Complaint Management System API is running...");
});

app.use("/auth", authRoutes);
app.use("/course", courseRoutes);
app.use("/complaint", complaintRoutes);

const PORT = process.env.port ?? 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));