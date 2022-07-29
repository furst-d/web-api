import {Request, Response} from "express";
import {QueryError, RowDataPacket} from "mysql2";
import {JwtPayload, VerifyErrors} from "jsonwebtoken";
import {User} from "../../interfaces/User";
import {TypedRequestUser} from "../../interfaces/Request";

const { getUserByUserEmail, addUser, insertRefreshToken, removeRefreshToken, containsRefreshToken} = require("./user.service");
const { genSaltSync, hashSync, compareSync} = require("bcrypt");
const Joi = require('joi');
const { generateAccessToken, generateRefreshToken } = require("../../auth/authManager");
const jwt = require("jsonwebtoken");

function validateUser(user: object) {
    const schema = Joi.object({
        email: Joi.string().email().required(),
        name: Joi.string().min(2).required(),
        lastName: Joi.string().min(2).required(),
        password: Joi.string().min(5).required()
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

            const salt = genSaltSync(10);
            body.password = hashSync(body.password, salt);
            addUser(body, (addUserError: QueryError | null ) => {
                if(addUserError) {
                    return res.status(500).json({
                        status_code: 500,
                        status_message: addUserError.message
                    });
                }
                return res.status(200).json({
                    status_code: 200,
                    status_message: "User was added successfully"
                })
            })
        });
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
                const payload = {
                    id: user.user_id,
                    email: user.email,
                    name: user.first_name,
                    lastname: user.last_name
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

    logout: (req: Request, res: Response) => {
        const refreshToken = req.body.token;
        const userId = jwt.decode(refreshToken).user.id;
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

    testAuth: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        return res.json({
            status_code: 200,
            status_message: "OK",
            user: req.user
        });
    },
}