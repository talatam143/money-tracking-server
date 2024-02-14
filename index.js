import express from "express";
import dotEnv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import bodyParser from "body-parser";

import authRouter from "./routes/authRoutes.js";
import userRouter from "./routes/userRoutes.js";
import transactionRouter from "./routes/transactionRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";

const app = express();
dotEnv.config();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set("view engine", "ejs");

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => console.log("Database connected successfully."))
  .catch((err) => console.log(err));

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/transaction", transactionRouter);
app.use("/analytics", analyticsRoutes);

app.listen(process.env.PORT, (err) => {
  if (!err) {
    console.log("Sever started successfully on port " + process.env.PORT);
  } else {
    console.log(err);
  }
});
