import { Response, NextFunction } from "express"
import { AuthRequest } from "../utils/interfaces";
import jwt from "jsonwebtoken"


const authenticateUser = (req: AuthRequest, res: Response, next: NextFunction) => {
    const token = req.header("Authorization");
    const secret = process.env.JWT_SECRET

    if (!token){
        res.status(401).json({message: "Access denied. No token provided"});
        return;
    }
    if (!secret) throw new Error("JWT secret not defined in the environment variables!");

    try {
        const decoded = jwt.verify(token, secret) as {id: string, role: string};
        req.user = decoded;
        next();
    } catch (err) {
        console.error(err);
        res.status(400).json({message: "Invalid token provided"});
    }
}

const authenticateLecturer = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req?.user?.role.toLowerCase() != "lecturer"){
        res.status(403).json({message: "Access denied, only lecturers can perform this operation"});
        return;
    }
    next();
}

export {authenticateUser, authenticateLecturer}