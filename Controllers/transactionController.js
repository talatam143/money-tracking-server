import { Transaction } from "../Models/transactionModel.js";

export const getTransactions = async (req, res) => {
  const { ...authInfo } = req.authInfo;
  try {
    const userTransactions = await Transaction.findOne({
      email: authInfo.email,
    });
    if (!userTransactions)
      return res.status(404).json({ errorMessage: "No Transactions found." });
    res.status(200).json({
      data: userTransactions,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors.field = field;
        validationErrors.message = error.errors[field].message;
      }
      return res
        .status(422)
        .json({ errorType: "Validation failed", errors: validationErrors });
    }
    console.log(error);
    res
      .status(500)
      .json({ errorMessage: "Something went wrong", error: error.message });
  }
};

export const addTransaction = async (req, res) => {
  const { title, amount, paymentMethod, transactionDate, ...payload } =
    req.body;
  const { ...authInfo } = req.authInfo;
  try {
    if (!title || !amount || !paymentMethod || !transactionDate)
      return res.status(400).json({ errorMessage: "All fields are required." });
    const fetchUser = await Transaction.findOne({ email: authInfo.email });
    let transactionObject = {
      title,
      amount,
      payment_method: paymentMethod,
      transaction_date: transactionDate,
    };
    payload.description
      ? (transactionObject.description = payload.description)
      : null;
    payload.category ? (transactionObject.category = payload.category) : null;
    payload.bank ? (transactionObject.bank = payload.bank) : null;
    payload.upi ? (transactionObject.upi = payload.upi) : null;
    payload.creditCard
      ? (transactionObject.credit_Card = payload.creditCard)
      : null;
    payload.tags ? (transactionObject.tags = payload.tags) : null;

    if (fetchUser) {
      var updateUserTransaction = await Transaction.findOneAndUpdate(
        {
          email: authInfo.email,
        },
        { $push: { transactions: transactionObject } },
        { new: true }
      );
    } else {
      var newUserTransaction = await Transaction.create({
        email: authInfo.email,
        transactions: transactionObject,
      });
    }
    return res.status(200).json({
      message: "Transaction added successfully",
      data: updateUserTransaction || newUserTransaction,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors.field = field;
        validationErrors.message = error.errors[field].message;
      }
      return res
        .status(422)
        .json({ errorType: "Validation failed", errors: validationErrors });
    }
    console.log(error);
    res
      .status(500)
      .json({ errorMessage: "Something went wrong", error: error.message });
  }
};

export const updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { ...data } = req.body;
  const { ...authInfo } = req.authInfo;
  try {
    let updatedData = {};
    for (const key in data) {
      updatedData[`transactions.$.${key}`] = data[key];
    }
    const updateUserTransaction = await Transaction.findOneAndUpdate(
      { email: authInfo.email, "transactions._id": id },
      { $set: updatedData },
      { new: true }
    );
    if (!updateUserTransaction)
      return res.status(404).json({
        errorMessage: "No Transaction found",
      });
    res.status(200).json({
      message: "Transaction updated successfully",
      data: updateUserTransaction,
    });
  } catch (error) {
    res
      .status(500)
      .json({ errorMessage: "Something went wrong", error: error.message });
  }
};

export const deleteTransaction = async (req, res) => {
  const { id } = req.params;
  const { ...authInfo } = req.authInfo;
  try {
    const deleteUserTransaction = await Transaction.findOneAndUpdate(
      { email: authInfo.email },
      { $pull: { transactions: { _id: id } }, new: true }
    );
    if (!deleteUserTransaction)
      return res.status(404).json({
        errorMessage: "No Transaction found",
      });
    res.status(200).json({
      message: "Transaction deleted successfully",
      data: deleteUserTransaction,
    });
  } catch (error) {
    res
      .status(500)
      .json({ errorMessage: "Something went wrong", error: error.message });
  }
};
