import {Request, Response} from "express";
import {QueryError, ResultSetHeader, RowDataPacket} from "mysql2";
import {JwtPayload, VerifyErrors} from "jsonwebtoken";
import {NotActivatedUser, PasswordChangeUser, User} from "../interfaces/User";
import {TypedRequestUser} from "../interfaces/Request";

const { getUserByEmail, getUserById, addUser, insertRefreshToken, removeRefreshToken, containsRefreshToken, getPermittedPages,
    activateUser, removeUser, updateUser, resetAccount, getUsers, getUserByEmailExceptId, uploadImageSource, changePassword,
    getActivatedUserByEmail, getProfilePicture, addFriendRequest, addFriendRequestNotification, containsFriendRequest,
    containsPendingRecipientFriendRequest, updateFriendRequest, containsPendingSenderFriendRequest, removeFriendRequest,
    containsFriend, getFriendRequests, getUserNotifications} = require("./user.service");
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
        getActivatedUserByEmail(body.username, (err: QueryError | null, user: RowDataPacket) => {
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
                    permittedPagesId: permittedPagesId,
                    registered: user.created_date
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

    getAvatar: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        getProfilePicture(req.user.id, (error: QueryError | null, results: RowDataPacket[]) => {
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
                    data: results[0]
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

    passwordChange: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        const body: PasswordChangeUser = req.body;
        getUserById(req.user.id, (err: QueryError | null, user: RowDataPacket) => {
            if(err) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: err.message
                });
            }
            const result = compareSync(body.old_password, user.password);
            if(result) {
                const salt = genSaltSync(10);
                body.new_password = hashSync(body.new_password, salt);
                changePassword(req.user.id, body.new_password, (error: QueryError | null, results: RowDataPacket[]) => {
                    if (error) {
                        return res.status(500).json({
                            status_code: 500,
                            status_message: error.message
                        });
                    }
                    if(results) {
                        return res.json({
                            status_code: 200,
                            status_message: "Password was changed successfully",
                        });
                    }
                });
            } else {
                return res.status(401).json({
                    status_code: 401,
                    status_message: "Invalid password"
                });
            }
        });
    },

    uploadAvatar: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        if (!req.file) {
            return res.status(400).json({
                status_code: 400,
                status_message: "No file uploaded"
            });
        }
        uploadImageSource(req.user.id, req.file.filename, (error: QueryError | null, results: RowDataPacket[]) => {
            if (error) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: error.message
                });
            }
            if(results) {
                return res.json({
                    status_code: 200,
                    status_message: "Upload successful",
                });
            }
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

    getFriendRequestList: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        getFriendRequests(req.user.id, (getFriendsError: QueryError | null, results: RowDataPacket[]) => {
            if(getFriendsError) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: getFriendsError.message
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

    sendFriendRequest: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        const email = req.body.email;
        getUserByEmail(email, (getUserError: QueryError | null, user: RowDataPacket) => {
            if(getUserError) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: getUserError.message
                });
            }
            if(user) {
                containsFriendRequest(req.user.id, user.user_id, (error: QueryError | null, results: RowDataPacket) => {
                    if (error) {
                        return res.status(500).json({
                            status_code: 500,
                            status_message: error.message
                        });
                    }
                    if (results) {
                        if(results.count > 0) {
                            return res.status(400).json({
                                status_code: 400,
                                status_message: "Friend request already sent"
                            });
                        }
                        addFriendRequest(req.user.id, user.user_id, (addFriendError: QueryError | null ) => {
                            if(addFriendError) {
                                return res.status(500).json({
                                    status_code: 500,
                                    status_message: addFriendError.message
                                });
                            }
                            getProfilePicture(req.user.id, (profilePicError: QueryError | null, profilePicResults: RowDataPacket[]) => {
                                if (profilePicError) {
                                    return res.status(500).json({
                                        status_code: 500,
                                        status_message: profilePicError.message
                                    });
                                }
                                if(profilePicResults) {
                                    addFriendRequestNotification(user.user_id, req.user, profilePicResults[0].avatar, "FRIEND_REQUEST_RECEIVED", (addFriendNotError: QueryError | null ) => {
                                        if(addFriendNotError) {
                                            return res.status(500).json({
                                                status_code: 500,
                                                status_message: addFriendNotError.message
                                            });
                                        }
                                        return res.status(200).json({
                                            status_code: 200,
                                            status_message: "Friend request sent"
                                        })
                                    })
                                }
                            });
                        });
                    }
                });
            } else {
                return res.status(404).json({
                    status_code: 404,
                    status_message: "User not found"
                });
            }
        });
    },

    acceptFriendRequest: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        const requestId = req.params.id;
        containsPendingRecipientFriendRequest(requestId, req.user.id, (error: QueryError | null, results: RowDataPacket) => {
            if (error) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: error.message
                });
            }
            if (results) {
                if(results.count === 0) {
                    return res.status(404).json({
                        status_code: 404,
                        status_message: "Friend request not found"
                    });
                }
                updateFriendRequest(requestId, "ACCEPT", (updateFriendRequestError: QueryError | null ) => {
                    if(updateFriendRequestError) {
                        return res.status(500).json({
                            status_code: 500,
                            status_message: updateFriendRequestError.message
                        });
                    }
                    getProfilePicture(req.user.id, (profilePicError: QueryError | null, profilePicResults: RowDataPacket[]) => {
                        if (profilePicError) {
                            return res.status(500).json({
                                status_code: 500,
                                status_message: profilePicError.message
                            });
                        }
                        if(profilePicResults) {
                            addFriendRequestNotification(results.sender_id, req.user, profilePicResults[0].avatar, "FRIEND_REQUEST_ACCEPT", (addFriendNotError: QueryError | null ) => {
                                if(addFriendNotError) {
                                    return res.status(500).json({
                                        status_code: 500,
                                        status_message: addFriendNotError.message
                                    });
                                }
                                return res.status(200).json({
                                    status_code: 200,
                                    status_message: "Friend request accepted"
                                })
                            })
                        }
                    });
                });
            }
        });
    },

    rejectFriendRequest: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        const requestId = req.params.id;
        containsPendingRecipientFriendRequest(requestId, req.user.id, (error: QueryError | null, results: RowDataPacket) => {
            if (error) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: error.message
                });
            }
            if (results) {
                if(results.count === 0) {
                    return res.status(404).json({
                        status_code: 404,
                        status_message: "Friend request not found"
                    });
                }
                updateFriendRequest(requestId, "REJECT", (updateFriendRequestError: QueryError | null ) => {
                    if(updateFriendRequestError) {
                        return res.status(500).json({
                            status_code: 500,
                            status_message: updateFriendRequestError.message
                        });
                    }
                    return res.status(200).json({
                        status_code: 200,
                        status_message: "Friend request rejected"
                    })
                });
            }
        });
    },

    cancelFriendRequest: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        const requestId = req.params.id;
        containsPendingSenderFriendRequest(requestId, req.user.id, (error: QueryError | null, results: RowDataPacket) => {
            if (error) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: error.message
                });
            }
            if (results) {
                if(results.count === 0) {
                    return res.status(404).json({
                        status_code: 404,
                        status_message: "Friend request not found"
                    });
                }
                removeFriendRequest(requestId, (removeFriendRequestError: QueryError | null ) => {
                    if(removeFriendRequestError) {
                        return res.status(500).json({
                            status_code: 500,
                            status_message: removeFriendRequestError.message
                        });
                    }
                    return res.status(200).json({
                        status_code: 200,
                        status_message: "Friend request cancelled"
                    })
                });
            }
        });
    },

    removeFriend: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        const friendId = req.params.id;
        containsFriend(req.user.id, friendId, (error: QueryError | null, results: RowDataPacket) => {
            if (error) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: error.message
                });
            }
            if (results) {
                if(results.count === 0) {
                    return res.status(404).json({
                        status_code: 404,
                        status_message: "Friend not found"
                    });
                }
                removeFriendRequest(results.friend_request_id, (removeFriendError: QueryError | null ) => {
                    if(removeFriendError) {
                        return res.status(500).json({
                            status_code: 500,
                            status_message: removeFriendError.message
                        });
                    }
                    return res.status(200).json({
                        status_code: 200,
                        status_message: "Friend removed"
                    })
                });
            }
        });
    },

    getNotifications: (req: TypedRequestUser<JwtPayload>, res: Response) => {
        getUserNotifications(req.user.id, (getNotificationsError: QueryError | null, results: RowDataPacket[]) => {
            if(getNotificationsError) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: getNotificationsError.message
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