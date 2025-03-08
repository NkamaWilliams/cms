import { Response } from "express"
import { AuthRequest } from "../utils/interfaces"
import prisma from "../prismaClient"
import { ComplaintStatus } from "@prisma/client";
import { sendEmail } from "../utils/mailer";

export const addResponse = async (req: AuthRequest, res: Response) => {
    const {comment, complaintId} = req.body;
    try{
        //AuthenticateUser middleware should prevent this from being an empty string
        let userId = req.user?.id ?? ""; 

        let complaint = await prisma.complaint.findUnique({where: {id: complaintId}, include: {student: true}});
        if (!complaint) {
            res.status(404).json({message: "Complaint provided does not exist"});
            return;
        }

        if(complaint.status == ComplaintStatus.RESOLVED) {
            res.status(403).json({message: "Complaint has been resolved. No new response can be added"});
            return;
        }

        let response = req.user?.role.toLowerCase() == "student" ? await prisma.response.create({
            data: {
                comment,
                complaintId,
                studentId: userId
            },
            include: {student: true, lecturer: true}
        }) : await prisma.response.create({
            data: {
                comment,
                complaintId,
                lecturerId: userId
            },
            include: {student: true, lecturer: true}
        });

        //Alert Creator of Complaint if he is not the sender of the response
        if (response.student == null || response.student.id != complaint.student.id){
            const creator = complaint.student;
            await sendEmail(creator.email, "A New Response Was Added To Your Complaint", `Your complaint: ${complaint.title} has had a new response added to it!`);
        }

        //Alert all affected lecturers who did not send the response
        const lecturers = await prisma.lecturer.findMany({
            where: {
                courses: {
                    some: {id: complaint.courseId}
                }
            }
        });
        await Promise.all(lecturers.map(async (lecturer) => {
            if (response.lecturer == null || response.lecturerId != lecturer.id){
                await sendEmail(lecturer.email, "A New Response Was Added To Your Complaint", 
                    `Your complaint: ${complaint.title} has had a new response added to it!`);
            }
        }));

        res.status(201).json({data: response, message: "Response added successfully"});
    } catch (err) {
        console.error("Error encountered: ", err);
        res.status(500).json({message: "An error occured while attempting to add response"});
    }
}

export const getAllResponses = async (req: AuthRequest, res: Response) => {
    const { complaintId } = req.params;

    try {
        //AuthenticateUser middleware should prevent this from being an empty string
        const userId = req.user?.id ?? "";
        const userRole = req.user?.role.toLowerCase() ?? ""

        const complaint = await prisma.complaint.findUnique({where: {id: complaintId}});
        if (!complaint) {
            res.status(404).json({message: "Complaint provided does not exist"});
            return;
        }

        const responses = await prisma.response.findMany({
            where: {
                complaintId
            },
            include: {
                student: {
                    select: {id: true, name: true, email: true, matric: true}
                },
                lecturer:  {
                    select: {id: true, name: true, email: true}
                }
            }
        });

        res.status(200).json({data: responses, message: "Fetched responses successfully"});
    } catch (err) {
        console.error("Error encountered: ", err);
        res.status(500).json({message: "An error occured while attempting to fetch responses"});
    }
}