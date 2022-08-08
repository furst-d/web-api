require("dotenv").config();
const express = require("express");
const cors = require('cors')

const app = express();
const corsOptions ={
    origin: 'http://localhost:3000',
    credentials: true,
    optionSuccessStatus: 200
}
app.use(cors(corsOptions));

const userRouter = require("./api/users/user.router")

app.use(express.json());

app.use("/api/users", userRouter);

app.listen(process.env.APP_PORT, (): void => {
    console.log("Server up and running on port: ", process.env.APP_PORT);
})

