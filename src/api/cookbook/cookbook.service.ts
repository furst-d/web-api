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
            `SELECT ingredient_id, name, allergen_ids FROM web_cookbook_ingredients`,
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
            (error: QueryError) => {
                handleErrorResults(error, callback);
            }
        );
    },
}

const handleErrorResults = (error: QueryError, callback: MysqlCallback) => {
    if(error) {
        return callback(error);
    }
    return callback(null);
}

const handleResults = (error: QueryError, results: RowDataPacket[], callback: MysqlCallback) => {
    if(error) {
        return callback(error);
    }
    return callback(null, results);
}