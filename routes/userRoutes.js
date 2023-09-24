import express from "express";
import {
  updateBank,
  updateCC,
  updateUPI,
} from "../Controllers/userController.js";
import { authentication } from "../Controllers/Authentication.js";

const userRouter = express.Router();

userRouter.put("/updatebank", authentication, updateBank);
userRouter.put("/updateupi", authentication, updateUPI);
userRouter.put("/updatecredit", authentication, updateCC);

export default userRouter;
