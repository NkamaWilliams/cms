import { Response, Request } from "express"
import { AuthRequest } from "../utils/interfaces";
import prisma from "../prismaClient"
import { ComplaintStatus } from "@prisma/client";

export const createComplain = async (req: AuthRequest, res: Response) => {
    const { title, courseId, type, details } = req.body;
    try {
        const studentId = req.user?.id ?? ""; //AuthMiddleware should prevent the empty string from being used
        if (!title || !courseId || !type || !details){
            res.status(400).json({message: "Invalid request. Ensure all necessary fields are provided"});
            return;
        }
        const complaint = await prisma.complaint.create({
            data: {
                title,
                studentId,
                courseId,
                type,
                details,
                status: ComplaintStatus.PENDING,
            }
        });

        res.status(201).json({data: complaint, message: "Complaint lodged successfully"});
    } catch (err) {
        console.error(err);
        res.status(500).json({message: "An error occured while try to create complaint"});
    }
}

export const getAllComplaints = async (req: AuthRequest, res: Response) => {
    try{
        const userId = req.user?.id
        const allComplaints = req.user?.role.toLowerCase() == "student" ?
            await prisma.complaint.findMany({ where: {studentId: userId} }) : 
            await prisma.complaint.findMany({where: {course: {lecturers: {some: {id: userId}}}}});

        res.status(200).json({data: allComplaints, message: "Complaints fetched successfully"});
    } catch(err) {
        console.error(err);
        res.status(500).json({message: "An error occured getting all complaints"});
    }
}

export const getComplaintById = async (req: AuthRequest, res: Response) => {
    const { complaintId } = req.params;
    try{
        const complaint = await prisma.complaint.findUnique({
            where: {
                id: complaintId
            }
        });

        if (!complaint){
            res.status(400).json({message: "Requested complaint does not exist"});
            return;
        }

        res.status(200).json({data: complaint, message: "Successfully fetched complaint"});
    } catch (err){
        console.error(err);
        res.status(500).json({message: "Failed to fetch complaint"})
    }
}

export const editComplaint = async (req: AuthRequest, res: Response) => {
    const { title, details, type, complaintId } = req.body;
    try {
        if (req.user?.role.toLowerCase() != "student") {
            res.status(403).json({message: "Only students can edit complaints"});
            return;
        }

        const userId = req.user.id;
        const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });

        if (!complaint) {
            res.status(400).json({message: "Complaint not found"});
            return;
        }

        if (complaint.studentId != userId) {
            res.status(403).json({ message: "Access denied. User not the creator of complaint." });
            return;
        }

        const updatedComplaint = await prisma.complaint.update({
            where: {
                id: complaintId
            },
            data: {
                title,
                details,
                type
            }
        });

        res.status(200).json({data: updatedComplaint, message: "Complaint edited successfully"});
    } catch (err) {
        console.error(err);
        res.status(500).json({message: "An error occured while trying to edit complaint"});
    }
}