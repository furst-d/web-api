import {QueryError, RowDataPacket} from "mysql2";
import {MysqlCallback} from "../interfaces/Callback";
import {Ingredient} from "../interfaces/Cookbook";

const pool = require("../../config/database");

module.exports = {
    getAllergens: (callback: MysqlCallback) => {
        pool.query (
            `SELECT allergen_id, name FROM web_cookbook_allergens`,
            (error: QueryError, results: RowDataPacket[]) => {
                return handleResults(error, results, callback);
            }
        )
    },

    getIngredientUnits: (callback: MysqlCallback) => {
        pool.query (
            `SELECT unit_id, name FROM web_cookbook_ingredients_units`,
            (error: QueryError, results: RowDataPacket[]) => {
                return handleResults(error, results, callback);
            }
        )
    },

    getIngredients: (callback: MysqlCallback) => {
        pool.query (
            `SELECT ingredient_id, name, allergen_ids FROM web_cookbook_ingredients ORDER BY name`,
            (error: QueryError, results: RowDataPacket[]) => {
                return handleResults(error, results, callback);
            }
        )
    },

    addIngredient: (data: Ingredient, callback: MysqlCallback) => {
        pool.query(
            `INSERT INTO web_cookbook_ingredients (name, allergen_ids) VALUES (?,?)`,
            [
                data.name,
                data.allergenIds,
            ],
            (error: QueryError, results: RowDataPacket[]) => {
                return handleResults(error, results, callback);
            }
        );
    },

    updateIngredient: (data: Ingredient, id: number, callback: MysqlCallback) => {
        pool.query(
            `UPDATE web_cookbook_ingredients SET name = ?, allergen_ids = ? WHERE ingredient_id = ?`,
            [
                data.name,
                data.allergenIds,
                id
            ],
            (error: QueryError, results: RowDataPacket[]) => {
                return handleResults(error, results, callback);
            }
        );
    },

    deleteIngredient: (id: number, callback: MysqlCallback) => {
        pool.query(
            `DELETE FROM web_cookbook_ingredients WHERE ingredient_id = ?`,
            [
                id
            ],
            (error: QueryError, results: RowDataPacket[]) => {
                return handleResults(error, results, callback);
            }
        );
    },
}

const handleResults = (error: QueryError, results: RowDataPacket[], callback: MysqlCallback) => {
    if(error) {
        return callback(error);
    }
    return callback(null, results);
}
