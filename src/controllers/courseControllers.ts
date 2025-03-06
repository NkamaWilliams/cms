import { Response, Request } from "express"
import prisma from "../prismaClient";

export const createCourse = async (req: Request, res: Response) => {
    const { name } = req.body;
    try {
        const existingCourse = await prisma.course.findMany({
            where: {
                name
            }
        });

        if (existingCourse.length > 0) {
            res.status(400).json({message: "Course with given name already exists"});
            return;
        }

        const course = await prisma.course.create({
            data: {
                name
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