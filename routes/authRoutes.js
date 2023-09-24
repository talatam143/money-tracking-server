import express from "express";
import {
  signIn,
  signUp,
  authenticateUser,
} from "../Controllers/authController.js";

const authRouter = express.Router();

authRouter.get("/", authenticateUser);
authRouter.post("/login", signIn);
authRouter.post("/signup", signUp);

export default authRouter;
