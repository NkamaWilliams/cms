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
        const course = await prisma.course.findUnique({
            where: {id: courseId}
        });
        if (!course){
            res.status(400).json({message: "Course provided does not exist!"});
            return;
        }
        const complaint = await prisma.complaint.create({
            data: {
                title,
                studentId,
                courseId,
                type,
                details,
                status: ComplaintStatus.SUBMITTED,
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

//Gets all complaints relevant to a user (based on the courses they teach or take)
export const getAllComplaints = async (req: AuthRequest, res: Response) => {
    try{
        const userId = req.user?.id
        const allComplaints = req.user?.role.toLowerCase() == "student" ?
            await prisma.complaint.findMany({ 
                where: {course: {students: {some: {id: userId}}}},
                include: {course: true} 
            }) : 
            await prisma.complaint.findMany({
                where: {course: {lecturers: {some: {id: userId}}}},
                include: {course: true}
            });

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
            where: { id: complaintId },
            include: { course: true }
        });

        if (complaint === null){
            res.status(404).json({message: "Requested complaint does not exist"});
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

        if (!title && !details && !type) {
            res.status(400).json({ message: "At least one field must be updated" });
            return;
        }

        const userId = req.user.id;
        const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });

        if (!complaint) {
            res.status(404).json({message: "Complaint not found"});
            return;
        }

        if (complaint.status == ComplaintStatus.RESOLVED) {
            res.status(403).json({message: "Access denied. Resolved complaints cannot be edited"});
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

export const markComplaintAsPending = async (req: AuthRequest, res: Response) => {
    //Middleware used to prevent anyone but lecturers from accessing this
    const { complaintId } = req.body;
    try {
        const user = req.user;
        const complaint = await prisma.complaint.findUnique({
            where: {id: complaintId},
            include: {course: true}
        });
        if (!complaint){
            res.status(404).json({message: "Provided complaint does not exist!"});
            return;
        }
        if (complaint.status == ComplaintStatus.PENDING) {
            res.status(400).json({message: "Complaint already set to pending!"});
            return;
        }
        const lecturers = await prisma.lecturer.findMany({
            where: {
                courses: {
                    some: {id: complaint?.courseId}
                }
            }
        });

        const actingLecturer = lecturers.find(lecturer => lecturer.id == user?.id)
        if (!actingLecturer) {
            res.status(403).json({message: "Access denied. You do not teach this course!"});
            return;
        }

        
        const updatedComplaint = await prisma.complaint.update({
            where: {id: complaint.id},
            data: {status: ComplaintStatus.PENDING},
            include: {course: true}
        });
        
        await Promise.all(lecturers.map( async lecturer => {
            await sendEmail(
                lecturer.email, 
                `A complaint for a course you teach is now being looked into!`, 
                `Complaint Titled: ${updatedComplaint.title} is now being looked into by ${actingLecturer.name}.`
            )
        }))
        
        const complaintCreator = await prisma.student.findUnique({where: {id: updatedComplaint.studentId}})
        await sendEmail(
            complaintCreator?.email ?? "",
            `A complaint for a course you teach is now being looked into!`, 
            `Complaint Titled: ${updatedComplaint.title} is now being looked into by ${actingLecturer.name}.`
        )

        res.status(200).json({data: updatedComplaint, message: "Status updated successfully!"});
    } catch (err) {
        console.error("Error occured updating complaint status:",err)
        res.status(500).json({message: "An error occured updating complaint status to pending!"});
    }
}

export const deleteComplaint = async (req: AuthRequest, res: Response) => {
    const { complaintId } = req.body;
    try{
        if (req.user?.role.toLowerCase() == "lecturer") {
            res.status(403).json({message: "Access Denied! Only students can delete complaints"});
            return;
        }
        const userId = req.user?.id ?? "";
        const user = await prisma.student.findUnique({
            where: {id: userId}
        });
        if (!user){
            res.status(404).json({message: "User does not exist in the database"});
            return;
        }
        const complaint = await prisma.complaint.findUnique({
            where: {id: complaintId}
        });
        if (!complaint){
            res.status(404).json({message: "Complaint does not exist in the database"});
            return;
        }
        if (complaint.studentId != user.id){
            res.status(403).json({message: "Forbidden! Only creators of complaints can delete them!"});
            return;
        }
        const deletedComplaint = await prisma.complaint.delete({
            where: {id: complaint.id}
        });

        if (!deletedComplaint){
            throw new Error("Failed to delete complaint");
        }

        res.status(200).json({message: "Complaint deleted successfully!"});
    } catch (err){
        console.error("Error occured deleting complaint:", err);
        res.status(500).json({message: "Error occured while deleting complaint!"});
    }
}