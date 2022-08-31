import {Request, Response} from "express";
import {QueryError, RowDataPacket} from "mysql2";
import {Ingredient} from "../interfaces/Cookbook";

const {getAllergens, getIngredientUnits, addIngredient, getIngredients} = require("./cookbook.service");

module.exports = {
    getAllergens: (_req: Request, res: Response) => {
        getAllergens((error: QueryError | null, results: RowDataPacket[]) => {
            sendDataResults(res, error, results);
        });
    },

    getIngredientUnits: (_req: Request, res: Response) => {
        getIngredientUnits((error: QueryError | null, results: RowDataPacket[]) => {
            sendDataResults(res, error, results);
        });
    },

    getIngredients: (_req: Request, res: Response) => {
        getIngredients((error: QueryError | null, results: RowDataPacket[]) => {
            sendDataResults(res, error, results);
        });
    },

    addIngredient: (req: Request, res: Response) => {
        const body: Ingredient = req.body;
        addIngredient(body, (error: QueryError | null) => {
            if (error) {
                return res.status(500).json({
                    status_code: 500,
                    status_message: error.message
                });
            }
            return res.json({
                status_code: 200,
                status_message: "Ingredient added successfully",
            });
        });
    },
}

const sendDataResults = (res: Response, error: QueryError | null, results: RowDataPacket[]) => {
    if(error) {
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
}