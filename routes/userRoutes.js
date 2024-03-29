import express from "express";
import {
  addData,
  deleteData,
  forceUpdate,
  getUserDetails,
  updateAllDetails,
} from "../Controllers/userController.js";
import { authentication } from "../Controllers/Authentication.js";

const userRouter = express.Router();

userRouter.put("/updatealldetails", authentication, updateAllDetails);
userRouter.put("/forceupdate", authentication, forceUpdate);
userRouter.get("/getuserdetails", authentication, getUserDetails);
userRouter.delete("/deleteuserdata", authentication, deleteData);
userRouter.put("/adduserdata", authentication, addData);

export default userRouter;
