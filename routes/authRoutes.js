import express from "express";
import {
  signIn,
  signUp,
  authenticateUser,
  verifyUser,
  resendOTP,
} from "../Controllers/authController.js";

const authRouter = express.Router();

authRouter.get("/", authenticateUser);
authRouter.post("/login", signIn);
authRouter.post("/signup", signUp);
authRouter.post("/verifyuser", verifyUser);
authRouter.post("/resendotp", resendOTP);

export default authRouter;
