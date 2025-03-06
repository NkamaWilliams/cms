import { Response } from "express"
import { AuthRequest } from "../utils/interfaces"
import prisma from "../prismaClient"

export const addResponse = async (req: AuthRequest, res: Response) => {
    const {comment, complaintId} = req.body;
    try{
        //AuthenticateUser middleware should prevent this from being an empty string
        let userId = req.user?.id ?? ""; 

        let complaint = await prisma.complaint.findUnique({where: {id: complaintId}});
        if (!complaint) {
            res.status(404).json({message: "Complaint provided does not exist"});
            return;
        }

        let response = req.user?.role.toLowerCase() == "student" ? await prisma.response.create({
            data: {
                comment,
                complaintId,
                studentId: userId
            }
        }) : await prisma.response.create({
            data: {
                comment,
                complaintId,
                lecturerId: userId
            }
        });

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
                student: true,
                lecturer:  true
            }
        });

        res.status(200).json({data: responses, message: "Fetched responses successfully"});
    } catch (err) {
        console.error("Error encountered: ", err);
        res.status(500).json({message: "An error occured while attempting to fetch responses"});
    }
}