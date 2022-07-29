import {MysqlCallback} from "../interfaces/Callback";
import {QueryError, RowDataPacket} from "mysql2";
import {User} from "../interfaces/User";

const pool = require("../../config/database");
const {encrypt} = require("../crypto/cryptoManager");

module.exports = {
    getUserByUserEmail: (email: string, callback: MysqlCallback) => {
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
    addUser: (data: User, callBack: MysqlCallback) => {
        pool.query(
            `INSERT INTO web_users (email, first_name, last_name, password) VALUES (?,?,?,?)`,
            [
                data.email,
                data.name,
                data.lastname,
                data.password
            ],
            (error: QueryError) => {
                if(error) {
                    return callBack(error);
                }
                return callBack(null);
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
    }
}