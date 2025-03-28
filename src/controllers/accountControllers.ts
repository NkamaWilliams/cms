import prisma from "../prismaClient";
import { AuthRequest } from "../utils/interfaces";
import { Response } from "express";

export const deleteAccount = async (req: AuthRequest, res: Response) => {
    const { userId } = req.body
    try {
        const userRole = req.user?.role.toLowerCase() as string
        if (userId != req.user?.id){
            res.status(403).json({message: "Unauthorized. Only a user can delete his/her account!"})
            return
        }

        const deletedAccount = userRole == "student" ? 
            await prisma.student.delete({where: {id: userId}}) :
            await prisma.lecturer.delete({where: {id: userId}})

        res.status(200).json({message: "Account deleted successfully!"})
    } catch (err) {
        console.log(err)
        res.status(500).json({message: "An error occured trying to delete account!"});
    }
}