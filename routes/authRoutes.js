import express from "express";
import {
  signIn,
  signUp,
  authenticateUser,
  verifyUser,
  resendOTP,
  verifyOTP,
  changePassword,
} from "../Controllers/authController.js";

const authRouter = express.Router();

authRouter.get("/", authenticateUser);
authRouter.post("/login", signIn);
authRouter.post("/signup", signUp);
authRouter.post("/verifyuser", verifyUser);
authRouter.post("/resendotp", resendOTP);
authRouter.post("/verifyotp", verifyOTP);
authRouter.post("/changepassword", changePassword);

export default authRouter;
