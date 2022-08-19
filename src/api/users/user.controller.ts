import {Request, Response} from "express";
import {QueryError, ResultSetHeader, RowDataPacket} from "mysql2";
import {JwtPayload, VerifyErrors} from "jsonwebtoken";
import {NotActivatedUser, User} from "../interfaces/User";
import {TypedRequestUser} from "../interfaces/Request";

const { getUserByEmail, getUserById, addUser, insertRefreshToken, removeRefreshToken, containsRefreshToken, getPermittedPages,
    activateUser, removeUser, updateUser, resetAccount, getUsers, getUserByEmailExceptId} = require("./user.service");
const { genSaltSync, hashSync, compareSync} = require("bcrypt");
const { generateAccessToken, generateRefreshToken } = require("../auth/authManager");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {sendRegistration} = require("../mail/mailSender");

module.exports = {
    register: (req: Request, res: Response) => {
        const body: User = req.body;
        getUserByEmail(body.email, (getUserError: QueryError | null, user: RowDataPacket) => {
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
        getUserByEmail(body.username, (err: QueryError | null, user: RowDataPacket) => {
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

    updateUser: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        const userId = req.params.id;
        const body: User = req.body;
        getUserByEmailExceptId(body.email, userId, (getUserError: QueryError | null, user: RowDataPacket) => {
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

            updateUser(userId, body, (updateUserError: QueryError | null ) => {
                if(updateUserError) {
                    return res.status(500).json({
                        status_code: 500,
                        status_message: updateUserError.message
                    });
                }
                return res.status(200).json({
                    status_code: 200,
                    status_message: "User was updated successfully"
                })
            })
        });
    },

    deleteUser: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        const userId = req.params.id;
        removeUser(userId, (error: QueryError | null, results: ResultSetHeader) => {
            if (error) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: error.message
                });
            }
            return res.json({
                status_code: 200,
                affected: results.affectedRows
            });
        });
    },

    resetAccount: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        const userId = req.params.id;
        getUserById(userId, (getUserError: QueryError | null, user: RowDataPacket) => {
            if(getUserError) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: getUserError.message
                });
            }
            if(!user) {
                return res.status(400).json({
                    status_code: 400,
                    status_message: "User not found"
                });
            }
            const confirmationToken = crypto.randomBytes(32).toString('hex');
            resetAccount(user.email, confirmationToken, (error: QueryError | null, results: ResultSetHeader) => {
                if (error) {
                    return res.status(500).json({
                        status_code: 500,
                        status_message: error.message
                    });
                }
                sendRegistration(user.email, user.name, confirmationToken);
                return res.json({
                    status_code: 200,
                    affected: results.affectedRows
                });
            });

        });
    },

    getUsers: (_req: Request, res: Response) => {
        getUsers((getUserError: QueryError | null, results: RowDataPacket[]) => {
            if(getUserError) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: getUserError.message
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