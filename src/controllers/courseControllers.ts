import { Response, Request } from "express"
import prisma from "../prismaClient";
import { AuthRequest } from "../utils/interfaces";
import exp from "constants";

export const createCourse = async (req: Request, res: Response) => {
    const { name, code } = req.body;
    try {
        const existingCourse = await prisma.course.findUnique({
            where: {
                code
            }
        });

        if (existingCourse) {
            res.status(400).json({message: "Course with given code already exists"});
            return;
        }

        const course = await prisma.course.create({
            data: {
                name,
                code
            }
        });

        res.status(201).json({data: course, message: "Course created successfully"});
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "An error occured while creating the course" });
    }
}

export const getAllCourses = async (req: Request, res: Response) => {
    try {
        const course = await prisma.course.findMany();
        res.json({message: "Courses gotten successfully", data: course});
    } catch (err) {
        res.status(500).json({message: "An error occured while getting courses"});
    }
}

export const getMyCourses = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.id as string
        const userRole = req.user?.role.toLowerCase() as string

        let user = userRole == "student"? 
            await prisma.student.findUnique({where: {id: userId}, include: {courses: true}}) :
            await prisma.lecturer.findUnique({where: {id: userId}, include: {courses: true}})

        res.status(200).json({message: "Courses fetched successfully", data: user?.courses});
    } catch(err){
        res.status(500).json({message: "An error occured while getting user's courses!"})
        console.log(err)
    }
}

export const editCourses = async (req: AuthRequest, res: Response) => {
    const { courseIds } = req.body
    try {
        const userId = req.user?.id as string;
        const userRole = req.user?.role.toLowerCase() as string;

        if (!Array.isArray(courseIds)) {
            res.status(400).json({ message: "Courses must be an array of course IDs" });
            return
        }

        // Validate course IDs exist
        const validCourses = await prisma.course.findMany({
            where: { id: { in: courseIds } },
        });

        if (validCourses.length !== courseIds.length) {
            res.status(400).json({ message: "One or more course IDs are invalid" });
            return
        }

        // Update user courses
        let updatedUser;
        if (userRole === "student") {
            updatedUser = await prisma.student.update({
                where: { id: userId },
                data: { courses: { set: courseIds.map((id) => ({ id })) } },
                include: { courses: true },
            });
        } else if (userRole === "lecturer") {
            updatedUser = await prisma.lecturer.update({
                where: { id: userId },
                data: { courses: { set: courseIds.map((id) => ({ id })) } },
                include: { courses: true },
            });
        }

        res.status(200).json({ message: "Courses updated successfully", data: updatedUser?.courses });
    } catch (err) {
        console.error("Error updating courses:", err);
        res.status(500).json({ message: "An error occurred while updating courses!" });
    }
}