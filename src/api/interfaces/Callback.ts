import {QueryError, RowDataPacket} from "mysql2";

export interface MysqlCallback {
    (error: QueryError | null, results: RowDataPacket[]): void;
}

export interface MysqlCallback {
    (error: QueryError | null, results: RowDataPacket): void;
}

export interface MysqlCallback {
    (error: QueryError | null, results: number): void;
}

export interface MysqlCallback {
    (error: QueryError | null ): void;
}
