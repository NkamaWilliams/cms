import { Request, Response } from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import prisma from "../prismaClient"

const nameRegex = /^[a-zA-Z\s]{5,}$/

//Create JWT Token for user
const generateJwt = (id: string, role: string) => {
    const secret = process.env.JWT_SECRET;

    if (!secret){
        throw new Error("JWT secret not defined in the environment variables!");
    }

    return jwt.sign({id, role}, secret, {
        expiresIn: "1d"
    });
}

//Register Student
export const registerStudent = async (req: Request, res: Response) => {
    const { name, email, password, courseIds } = req.body;

    try {
        const existingLecturer = await prisma.lecturer.findUnique({where: {email}});
        const existingStudent = await prisma.student.findUnique({where: {email}});
        if (existingStudent || existingLecturer) {
            res.status(400).json({message: "Email already in use"});
            return;
        }

        const validCourses = await prisma.course.findMany({
            where: {
                id: {
                    in: courseIds
                }
            }
        })

        if (validCourses.length != courseIds.length) {
            res.status(400).json({message: "Some invalid courses were submitted"});
            return;
        }

        if (validCourses.length < 3 || validCourses.length > 7){
            res.status(400).json({message: "Length of course ids provided must be between 3 and 7"});
            return;
        }

        const studentCount = await prisma.student.count();
        const matric = `${new Date().getFullYear()}-${(studentCount + 1).toString().padStart(6, "0")}`

        const validName = nameRegex.test(name);
        if (!validName){
            res.status(400).json({message: "Invalid name provided. Names must contain only letters and must be at least 5 characters long!"});
            return;
        }

        const validPassword = /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z0-9.]{8,}$/.test(password)
        if (!validPassword){
            res.status(400).json({message: "Passwords must contain at least 8 characters. At least one number and one letter"});
            return
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const student = await prisma.student.create(
            {
                data: {
                    name,
                    email,
                    password: hashedPassword,
                    matric,
                    courses: {
                        connect: courseIds.map((id:string) => ({id}))
                    }
                },
                select: {
                    id: true,
                    name: true, 
                    email: true,
                    matric: true,
                    courses: true
                }
            }
        );

        const token = generateJwt(student.id, "STUDENT");

        res.status(201).json({data: student, message: "Student registered successfully!", token});        
    } catch(err) {
        console.error(err)
        res.status(500).json({message: "An error occured while registering student"});
    }
}

//Register Lecturer
export const registerLecturer = async (req: Request, res: Response) => {
    const { name, email, password, courseIds } = req.body;

    try {
        const existingStudent = await prisma.student.findUnique({where: {email}});
        const existingLecturer = await prisma.lecturer.findUnique({where: {email}});
        if (existingLecturer || existingStudent) {
            res.status(400).json({message: "Email already in use"});
            return;
        }

        const validCourses = await prisma.course.findMany({
            where: {
                id: {
                    in: courseIds
                }
            }
        })

        if (validCourses.length != courseIds.length) {
            res.status(400).json({message: "Some invalid courses were submitted"});
            return;
        }

        if (validCourses.length < 1 || validCourses.length > 5){
            res.status(400).json({message: "Length of course ids provided must be between 1 and 5"});
            return;
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const lecturer = await prisma.lecturer.create({
            data: {
                name,
                email,
                password: hashedPassword,
                courses: {
                    connect: courseIds.map((id:string) => ({id}))
                }
            },
            select: {
                id: true,
                name: true,
                email: true,
                courses: true
            }
        });

        const token = generateJwt(lecturer.id, "LECTURER");

        res.status(201).json({data: lecturer, message: "Lecturer registered successfully!", token});
    } catch(err) {
        console.error(err)
        res.status(500).json({message: "An error occured while registering lecturer"})
    }
}

//Handle sign in
export const signIn = async (req: Request, res: Response) => {
    const { email, password, role } = req.body;

    try {
        let user = null
        if (role.toLowerCase() == "student"){
            const isStudent = await prisma.student.findUnique({where: {email}, include: {courses: true}});
            if (!isStudent){
                res.status(400).json({message: "No student with given email found!"});
                return;
            }
            user = isStudent;
        } else if (role.toLowerCase() == "lecturer") {
            const isLecturer = await prisma.lecturer.findUnique({where: {email}, include: {courses: true}});
            if (!isLecturer){
                res.status(400).json({message: "No lecturer with given email found!"});
                return;
            }
            user = isLecturer;
        } else {
            res.status(400).json({message: "Invalid user role provided. Role must be 'STUDENT' or 'LECTURER'"});
            return;
        }

        const isCorrectPassword = await bcrypt.compare(password, user.password);
        if (!isCorrectPassword) {
            res.status(400).json({message: "Invalid password provided"})
            return;
        }

        res.status(200).json({
            data: {id: user.id, email: user.email, name: user.name, createdAt: user.createdAt, courses: user.courses}, 
            token: generateJwt(user.id, role), 
            message: "User signer in successfully"}
        )
    } catch (err) {
        console.error(err)
        res.status(500).json({message: "An error occured while signing in user"});
    }
}