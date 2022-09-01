import {Request, Response} from "express";
import {QueryError, ResultSetHeader, RowDataPacket} from "mysql2";
import {Ingredient} from "../interfaces/Cookbook";

const {getAllergens, getIngredientUnits, addIngredient, getIngredients, updateIngredient, deleteIngredient} = require("./cookbook.service");

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
        addIngredient(body, (error: QueryError | null, results: ResultSetHeader) => {
            sendPostResults("Ingredient added successfully", res, error, results);
        });
    },

    updateIngredient: (req: Request, res: Response) => {
        const id = req.params.id;
        const body: Ingredient = req.body;
        updateIngredient(body, id, (error: QueryError | null, results: ResultSetHeader) => {
            sendAffectedResult("Ingredient updated successfully", res, error, results);
        });
    },

    deleteIngredient: (req: Request, res: Response) => {
        const id = req.params.id;
        deleteIngredient(id, (error: QueryError | null, results: ResultSetHeader) => {
            sendAffectedResult("Ingredient deleted successfully", res, error, results);
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

const sendPostResults = (message: string, res: Response, error: QueryError | null, results: ResultSetHeader) => {
    if (error) {
        return res.status(500).json({
            status_code: 500,
            status_message: error.message
        });
    }
    return res.json({
        status_code: 200,
        status_message: message,
        inserted_id: results.insertId
    });
}

const sendAffectedResult = (message: string, res: Response, error: QueryError | null, results: ResultSetHeader) => {
    if (error) {
        return res.status(500).json({
            status_code: 500,
            status_message: error.message
        });
    }
    if(results.affectedRows === 0) {
        return res.status(404).json({
            status_code: 404,
            status_message: "Identifier not found"
        });
    }
    return res.json({
        status_code: 200,
        status_message: message,
    });
}