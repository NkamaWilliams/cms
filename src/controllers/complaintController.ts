import { Response, Request } from "express"
import { AuthRequest } from "../utils/interfaces";
import prisma from "../prismaClient"
import { ComplaintStatus } from "@prisma/client";
import { sendEmail } from "../utils/mailer";

export const createComplaint = async (req: AuthRequest, res: Response) => {
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
            },
            include: {
                course: true
            }
        });

        const lecturers = await prisma.lecturer.findMany({
            where: {
                courses: {
                    some: {id: courseId}
                }
            },
        });
        
        await Promise.all(lecturers.map(async (lecturer) => {
            await sendEmail(
                lecturer.email, 
                `A new complaint has been lodged for a course you teach!`, 
                `New Complaint Made For Course - ${complaint.course.name}`
            );
        }));        

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
            },
            include: {course: true}
        });

        res.status(200).json({data: updatedComplaint, message: "Complaint edited successfully"});
    } catch (err) {
        console.error(err);
        res.status(500).json({message: "An error occured while trying to edit complaint"});
    }
}

export const resolveComplaint = async (req: AuthRequest, res: Response) => {
    const { complaintId } = req.body;

    try{
        const userId = req.user?.id ?? "";
        const userRole = req.user?.role.toLowerCase() ?? "";

        if (userRole != "lecturer") {
            res.status(403).json({message: "Access denied. Only lecturers can resolve complaints"});
            return;
        }
        
        const complaint = await prisma.complaint.findUnique({
            where: {id: complaintId}, 
            include: {
                course: {
                    include: {lecturers: true}
                }
            }
        });

        let lecturers = complaint?.course.lecturers.filter(lecturer => lecturer.id == userId)
        if (!lecturers || lecturers.length < 1){
            res.status(403).json({message: "Access denied. Only lecturers of the associated course can resolve it"});
            return;
        }

        const resolvedComplaint = await prisma.complaint.update({
            where: {
                id: complaintId
            },
            data: {
                status: ComplaintStatus.RESOLVED
            }
        });
        if (complaint){
            await Promise.all(complaint?.course.lecturers.map(async (lecturer) => {
                await sendEmail(lecturer.email, "A Complaint Has Been Resolved", 
                    `Your complaint: ${complaint.title} has been marked as resolved!`);
            }));
        }

        let creator = await prisma.student.findUnique({where: {id: complaint?.studentId}});
        if (creator){
            await sendEmail(creator?.email, "A Complaint Has Been Resolved", `The complaint titled: ${complaint?.title}, has been resolved`);
        }

        res.status(200).json({data: resolvedComplaint, message: "Complaint resolved successfully"});
    } catch (err) {
        console.error("Error occured resolving complaint:", err);
        res.status(500).json({message: "An error occured while trying to resolve the complaint"});
    }
}