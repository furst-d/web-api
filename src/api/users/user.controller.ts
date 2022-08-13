import {Request, Response} from "express";
import {QueryError, ResultSetHeader, RowDataPacket} from "mysql2";
import {JwtPayload, VerifyErrors} from "jsonwebtoken";
import {NotActivatedUser, User} from "../interfaces/User";
import {TypedRequestUser} from "../interfaces/Request";

const { getUserByUserEmail, addUser, insertRefreshToken, removeRefreshToken, containsRefreshToken, getPermittedPages, activateUser} = require("./user.service");
const { genSaltSync, hashSync, compareSync} = require("bcrypt");
const Joi = require('joi');
const { generateAccessToken, generateRefreshToken } = require("../auth/authManager");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {sendRegistration} = require("../mail/mailSender");

function validateUser(user: object) {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().min(2).required(),
        lastName: Joi.string().min(2).required()
    });
    return schema.validate(user);
}

module.exports = {
    register: (req: Request, res: Response) => {
        const body: User = req.body;
        let {validateUserError} = validateUser(body);

        if(validateUserError) {
            return res.status(400).json({
                status_code: 400,
                status_message: validateUserError.details[0].message
            });
        }

        getUserByUserEmail(body.email, (getUserError: QueryError | null, user: object) => {
            if(getUserError) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: getUserError.message
                });
            }
            if(user) {
                return res.status(400).json({
                    status_code: 400,
                    status_message: "User with this email already exists"
                });
            }

            body.confirmation_token = crypto.randomBytes(32).toString('hex');
            addUser(body, (addUserError: QueryError | null ) => {
                if(addUserError) {
                    return res.status(500).json({
                        status_code: 500,
                        status_message: addUserError.message
                    });
                }
                sendRegistration(body.email, body.name, body.confirmation_token);
                return res.status(200).json({
                    status_code: 200,
                    status_message: "User was added successfully"
                })
            })
        });
    },

    activate: (req: Request, res: Response) => {
        const body: NotActivatedUser = req.body;
        const salt = genSaltSync(10);
        body.password = hashSync(body.password, salt);
        activateUser(body, (activateUserError: QueryError | null, results: ResultSetHeader) => {
            if(activateUserError) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: activateUserError.message
                });
            }
            return res.json({
                status_code: 200,
                affected: results.affectedRows
            });
        })
    },

    login: (req: Request, res: Response) => {
        const body = req.body;
        getUserByUserEmail(body.username, (err: QueryError | null, user: RowDataPacket) => {
            if(err) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: err.message
                });
            }
            if(!user) {
                return res.status(400).json({
                    status_code: 400,
                    status_message: "User with this email does not exists"
                });
            }
            const result = compareSync(body.password, user.password);
            if(result) {
                const permittedPagesId: number[] = user.permitted_pages_id.split(",");
                const payload = {
                    id: user.user_id,
                    email: user.email,
                    name: user.first_name,
                    lastname: user.last_name,
                    permittedPagesId: permittedPagesId
                }
                const accessToken = generateAccessToken(payload);
                const refreshToken = generateRefreshToken(payload);

                insertRefreshToken(payload.id, refreshToken, (updateTokenErr: QueryError | null, results: RowDataPacket[]) => {
                    if(updateTokenErr) {
                        return res.status(500).json({
                            status_code: 500,
                            status_message: updateTokenErr.message
                        });
                    }
                    if(!results) {
                        return res.status(500).json({
                            status_code: 500,
                            status_message: "Failed update refresh token"
                        });
                    }

                    return res.json({
                        status_code: 200,
                        status_message: "Logged successfully",
                        access_token: accessToken,
                        refresh_token: refreshToken
                    });
                });
            } else {
                return res.status(401).json({
                    status_code: 401,
                    status_message: "Invalid email or password"
                });
            }
        });
    },

    refreshToken: (req: Request, res: Response) => {
        const refreshToken = req.body.token;
        const userId = jwt.decode(refreshToken).user.id;
        containsRefreshToken(userId, refreshToken, (error: QueryError | null, results: RowDataPacket) => {
            if (error) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: error.message
                });
            }
            if (results) {
                if(results.count === 0) {
                    return res.status(403).json({
                        status_code: 403,
                        status_message: "Token not found"
                    });
                }

                jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET, (err: VerifyErrors, payload: JwtPayload) => {
                    if(err) {
                        return res.status(403).json({
                            status_code: 403,
                            status_message: "Invalid token",
                        })
                    }

                    const accessToken = generateAccessToken(payload.user);
                    return res.json({
                        status_code: 200,
                        status_message: "OK",
                        access_token: accessToken
                    });
                })
            }
        });
    },

    logout: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        const refreshToken = req.body.token;
        const userId = req.user.id;
        removeRefreshToken(userId, refreshToken, (error: QueryError | null, results: RowDataPacket[]) => {
            if (error) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: error.message
                });
            }
            if(results) {
                return res.json({
                    status_code: 204,
                    status_message: "Logout successful",
                });
            }
        });
    },

    getPages: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        getPermittedPages(req.user.id, (error: QueryError | null, results: RowDataPacket[]) => {
            if (error) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: error.message
                });
            }
            if(results) {
                return res.json({
                    status_code: 200,
                    status_message: "OK",
                    data: results
                });
            }
        });
    },
}