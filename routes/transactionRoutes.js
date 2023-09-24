import express from "express";
import {
  addTransaction,
  deleteTransaction,
  getTransactions,
  updateTransaction,
} from "../Controllers/transactionController.js";
import { authentication } from "../Controllers/Authentication.js";

const transactionRouter = express.Router();

transactionRouter.get("/", authentication, getTransactions);
transactionRouter.post("/add", authentication, addTransaction);
transactionRouter.put("/update/:id", authentication, updateTransaction);
transactionRouter.delete("/delete/:id", authentication, deleteTransaction);

export default transactionRouter;
