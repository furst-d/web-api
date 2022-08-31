require("dotenv").config();
const express = require("express");
const cors = require('cors');
const bodyParser = require("body-parser");

const app = express();
app.use(cors());
app.use(express.static("./public"));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

const userRouter = require("./api/users/user.router")
const cookBookRouter = require("./api/cookbook/cookbook.router")

app.use("/api/users", userRouter);
app.use("/api/cookbook", cookBookRouter);

app.listen(process.env.APP_PORT, (): void => {
    console.log("Server up and running on port: ", process.env.APP_PORT);
})



