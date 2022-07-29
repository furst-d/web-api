import {Request} from "express";

export interface TypedRequestBody<T> extends Request {
    body: T
}

export interface TypedRequestUser<T> extends Request {
    user: T
}