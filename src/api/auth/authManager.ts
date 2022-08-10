import {NextFunction, Response} from "express";
import {JwtPayload, VerifyErrors} from "jsonwebtoken";
import {TypedRequestUser} from "../interfaces/Request";
import {UserPayload} from "../interfaces/UserPayload";
const jwt = require("jsonwebtoken");

module.exports = {
    generateAccessToken: (user: UserPayload) => {
        return jwt.sign({ user: user }, process.env.JWT_ACCESS_TOKEN_SECRET, {
            expiresIn: "10m"
        })
    },

    generateRefreshToken: (user: UserPayload) => {
        return jwt.sign({ user: user}, process.env.JWT_REFRESH_TOKEN_SECRET, {
            expiresIn: "7y"
        })
    },

    authenticateUser: (req: TypedRequestUser<JwtPayload>, res: Response, next: NextFunction) => {
        const authHeader = req.get("authorization");
        const token = authHeader && authHeader.split(' ')[1];

        if(token == null) {
            return res.status(401).json({
                status_code: 401,
                status_message: "Unauthorized access",
            })
        }

        jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET, (err: VerifyErrors, payload: JwtPayload) => {
            if(err) {
                return res.status(403).json({
                    status_code: 403,
                    status_message: "Invalid token",
                })
            }
            req.user = payload.user;
            next();
        })
    },

    authorizeUser: (requiredPageIds: number[]) => {
        return (req: TypedRequestUser<JwtPayload>, res: any, next: NextFunction) => {
            const pageIds = req.user.permittedPagesId.map(Number);
            const found = pageIds.some((r :number) => requiredPageIds.includes(r))
            if(!found) {
                return res.status(403).json({
                    status_code: 403,
                    status_message: "Insufficient permissions",
                })
            }
            next();
        }
    },
}

