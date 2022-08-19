import {QueryError, RowDataPacket} from "mysql2";
import {NotActivatedUser, User} from "../interfaces/User";
import {MysqlCallback} from "../interfaces/Callback";

const pool = require("../../config/database");
const {encrypt} = require("../crypto/cryptoManager");

module.exports = {
    getUsers: (callback: MysqlCallback) => {
        pool.query (
            `SELECT user_id, email, first_name, last_name, activated, permitted_pages_id FROM web_users`,
            (error: QueryError, results: RowDataPacket[]) => {
                if(error) {
                    return callback(error);
                }
                return callback(null, results);
            }
        )
    },
    getUserByEmail: (email: string, callback: MysqlCallback) => {
        pool.query (
            `SELECT * FROM web_users WHERE email = ?`,
            [email],
            (error: QueryError, results: RowDataPacket[]) => {
                if(error) {
                    return callback(error);
                }
                return callback(null, results[0]);
            }
        )
    },
    getUserByEmailExceptId: (email: string, id: number, callback: MysqlCallback) => {
        pool.query (
            `SELECT * FROM web_users WHERE email = ? AND user_id != ?`,
            [
                email,
                id
            ],
            (error: QueryError, results: RowDataPacket[]) => {
                if(error) {
                    return callback(error);
                }
                return callback(null, results[0]);
            }
        )
    },
    getUserById: (id: number, callback: MysqlCallback) => {
        pool.query (
            `SELECT * FROM web_users WHERE user_id = ?`,
            [id],
            (error: QueryError, results: RowDataPacket[]) => {
                if(error) {
                    return callback(error);
                }
                return callback(null, results[0]);
            }
        )
    },
    addUser: (data: User, callBack: MysqlCallback) => {
        pool.query(
            `INSERT INTO web_users (email, first_name, last_name, confirmation_token, permitted_pages_id) VALUES (?,?,?,?,?)`,
            [
                data.email,
                data.name,
                data.lastname,
                data.confirmation_token,
                data.permitted_pages
            ],
            (error: QueryError) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null);
            }
        );
    },
    activateUser: (data: NotActivatedUser, callBack: MysqlCallback) => {
        pool.query(
            `UPDATE web_users SET password=?, activated=1 WHERE confirmation_token=? AND activated=0`,
            [
                data.password,
                data.token
            ],
            (error: QueryError, results: RowDataPacket[]) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null, results);
            }
        );
    },
    insertRefreshToken: (id: number, refreshToken: string, callBack: MysqlCallback) => {
        pool.query(
            `INSERT INTO web_refresh_tokens (user_id, refresh_token) VALUES (?, ?)`,
            [
                id,
                encrypt(refreshToken)
            ],
            (error: QueryError, results: RowDataPacket[]) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null, results);
            }
        );
    },
    removeRefreshToken: (id: number, refreshToken: string, callBack: MysqlCallback) => {
        pool.query(
            `DELETE FROM web_refresh_tokens WHERE user_id = ? AND refresh_token = ?`,
            [
                id,
                encrypt(refreshToken)
            ],
            (error: QueryError, results: RowDataPacket[]) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null, results);
            }
        );
    },
    containsRefreshToken: (id: number, refreshToken: string, callBack: MysqlCallback) => {
        pool.query(
            `SELECT count(refresh_token) count FROM web_users JOIN web_refresh_tokens USING(user_id) WHERE user_id = ? AND refresh_token = ?`,
            [
                id,
                encrypt(refreshToken)
            ],
            (error: QueryError, results: RowDataPacket[]) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null, results[0]);
            }
        );
    },
    getPermittedPages: (userId: number, callback: MysqlCallback) => {
        pool.query (
            `SELECT DISTINCT page_id, path, component_name, description, icon_name FROM web_users
                    INNER JOIN web_pages ON FIND_IN_SET(page_id, permitted_pages_id) != 0
                    WHERE user_id = ?`,
            [userId],
            (error: QueryError, results: RowDataPacket[]) => {
                if(error) {
                    return callback(error);
                }
                return callback(null, results);
            }
        )
    },

    removeUser: (id: number, callBack: MysqlCallback) => {
        pool.query(
            `DELETE FROM web_users WHERE user_id = ?`,
            [
                id,
            ],
            (error: QueryError, results: RowDataPacket[]) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null, results);
            }
        );
    },

    updateUser: (id: number, data: User, callBack: MysqlCallback) => {
        pool.query(
            `UPDATE web_users SET email = ?, first_name = ?, last_name = ?, permitted_pages_id = ? WHERE user_id = ?`,
            [
                data.email,
                data.name,
                data.lastname,
                data.permitted_pages,
                id,
            ],
            (error: QueryError, results: RowDataPacket[]) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null, results);
            }
        );
    },

    resetAccount: (email: string, token: string,  callBack: MysqlCallback) => {
        pool.query(
            `UPDATE web_users SET activated = 0, password = ?, confirmation_token = ? WHERE email = ?`,
            [
                null,
                token,
                email,
            ],
            (error: QueryError, results: RowDataPacket[]) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null, results);
            }
        );
    },
}