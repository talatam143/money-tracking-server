import { Transaction } from "../Models/transactionModel.js";
import { ObjectId, Types } from "mongoose";

export const getTransactions = async (req, res) => {
  const { ...authInfo } = req.authInfo;
  const { ...queries } = req.query;
  const sortObject = {
    amount: { dbName: "transactions.amount" },
    transactiondate: { dbName: "transactions.transaction_date" },
  };
  const matchObject = {
    date: { dbName: "transactions.transaction_date" },
    paymentMethods: { dbName: "transactions.payment_method" },
    banks: { dbName: "transactions.bank" },
    UPI: { dbName: "transactions.upi" },
    creditCards: { dbName: "transactions.credit_card" },
    categories: { dbName: "transactions.category" },
    starred: { dbName: "transactions.starred" },
    searchfield: {
      dbString: "transactions.title",
      dbNumber: "transactions.amount",
    },
    fromdate: { dbName: "transactions.transaction_date" },
  };

  try {
    const userTransactions = await Transaction.findOne({
      email: authInfo.email,
    });

    if (!userTransactions)
      return res
        .status(202)
        .json({ data: { errorMessage: "No Transactions found." } });

    const skip = Number(queries?.skip ?? 0);

    let agg = [
      {
        $match: {
          email: userTransactions.email,
        },
      },
      {
        $unwind: {
          path: "$transactions",
        },
      },
      {
        $match: {},
      },
      {
        $group: {
          _id: "$_id",
          transactions: {
            $push: "$transactions",
          },
          filteredTransactionCount: {
            $sum: 1,
          },
        },
      },
      {
        $project: {
          _id: "$_id",
          transactionsCount: "$filteredTransactionCount",
          transactions: {
            $slice: ["$transactions", skip, 20],
          },
        },
      },
    ];

    let matchCriteria = {};
    let sortCriteria = {};
    let isMatchCriteria = false;

    if (Object.keys(queries).length > 1) {
      Object.keys(queries).forEach((eachQuery) => {
        if (Object.keys(matchObject).includes(eachQuery)) {
          if (eachQuery === "searchfield") {
            if (isNaN(queries[eachQuery])) {
              matchCriteria[matchObject[eachQuery].dbString] = {
                $regex: new RegExp(`${queries.searchfield}`, "i"),
              };
            } else {
              matchCriteria[matchObject[eachQuery].dbNumber] = Number(
                queries[eachQuery]
              );
            }
          } else if (eachQuery === "fromdate" || eachQuery === "date") {
            let toDate = new Date(
              eachQuery === "fromdate"
                ? queries.todate || new Date()
                : queries.date
            );
            const nextToDate = new Date(toDate);
            nextToDate.setDate(toDate.getDate() + 1);
            matchCriteria[matchObject[eachQuery].dbName] = {
              $gte: new Date(
                eachQuery === "fromdate" ? queries?.fromdate : queries?.date
              ),
              $lte: new Date(nextToDate),
            };
          } else if (eachQuery === "starred") {
            matchCriteria[matchObject[eachQuery].dbName] = JSON.parse(
              queries[eachQuery]
            );
          } else {
            matchCriteria[matchObject[eachQuery].dbName] = {
              $in: queries[eachQuery],
            };
          }
        }
      });
      agg[2] = {
        $match: matchCriteria,
      };
      isMatchCriteria = true;
    }

    if (Object.keys(sortObject).includes(queries.sort)) {
      let order = queries.order === "desc" ? -1 : 1;
      let sortType = sortObject[queries.sort].dbName;
      sortCriteria = {
        $sort: {
          [sortType]: order,
        },
      };
      agg = [...agg.slice(0, 3), sortCriteria, ...agg.slice(3)];
    } else if (!isMatchCriteria) {
      agg = [
        {
          $match: {
            email: userTransactions.email,
          },
        },
        {
          $project: {
            _id: "$_id",
            transactionsCount: {
              $size: "$transactions",
            },
            transactions: {
              $slice: ["$transactions", skip, 20],
            },
          },
        },
      ];
    }

    if (queries?.monthly?.length === 1 && queries.monthly?.[0] === "true") {
      agg[agg.length - 1]["$project"].totalAmount = {
        $sum: "$transactions.amount",
      };
    }

    const fetchTransactions = await Transaction.aggregate(agg);

    if (
      fetchTransactions?.[0]?.transactionsCount > 0 ||
      fetchTransactions?.[0]?.transactions.length > 0
    ) {
      res.status(200).json({
        data: fetchTransactions[0],
      });
    } else {
      return res.status(200).json({
        data: { message: "No Transactions found.", transactions: [] },
      });
    }
  } catch (error) {
    if (error.name === "ValidationError") {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors.field = field;
        validationErrors.message = error.errors[field].message;
      }
      return res.status(422).json({
        data: { errorType: "Validation failed", errors: validationErrors },
      });
    }
    console.log(error);
    res.status(500).json({
      data: { errorMessage: "Something went wrong", error: error.message },
    });
  }
};

export const addTransaction = async (req, res) => {
  const { title, amount, paymentMethod, transactionDate, ...payload } =
    req.body;
  const { ...authInfo } = req.authInfo;
  try {
    if (!title || !amount || !transactionDate)
      return res
        .status(400)
        .json({ data: { errorMessage: "All fields are required." } });
    const fetchUser = await Transaction.findOne({ email: authInfo.email });
    let transactionObject = {
      title,
      amount,
      payment_method: paymentMethod,
      transaction_date: transactionDate,
    };
    if (paymentMethod === "UPI" && payload.paymentInfo) {
      transactionObject.upi = payload?.paymentInfo;
    } else if (paymentMethod === "Credit Card" && payload?.paymentInfo) {
      transactionObject.credit_card = payload?.paymentInfo;
    }
    delete payload.paymentInfo;
    transactionObject = { ...transactionObject, ...payload };

    if (fetchUser) {
      var updateUserTransaction = await Transaction.findOneAndUpdate(
        {
          email: authInfo.email,
        },
        {
          $push: {
            transactions: {
              $each: [transactionObject],
              $sort: { transaction_date: -1 },
            },
          },
        },
        { new: true }
      );
    } else {
      var newUserTransaction = await Transaction.create({
        email: authInfo.email,
        transactions: transactionObject,
      });
    }
    return res.status(200).json({
      data: {
        message: "Transaction added successfully",
        data: updateUserTransaction || newUserTransaction,
      },
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      const validationErrors = {};
      for (const field in error.errors) {
        validationErrors.field = field;
        validationErrors.message = error.errors[field].message;
      }
      return res.status(422).json({
        data: { errorMessage: "Validation failed", errors: validationErrors },
      });
    }
    console.log(error);
    res.status(500).json({
      data: { errorMessage: "Something went wrong", error: error.message },
    });
  }
};

export const updateTransaction = async (req, res) => {
  const { id } = req.params;
  const { title, amount, paymentMethod, transactionDate, ...payload } =
    req.body;
  const { ...authInfo } = req.authInfo;
  try {
    if (!title || !amount || !transactionDate)
      return res
        .status(400)
        .json({ data: { errorMessage: "All fields are required." } });

    let transactionObject = {
      title,
      amount,
      payment_method: paymentMethod,
      transaction_date: transactionDate,
    };

    if (paymentMethod === "UPI" && payload.paymentInfo) {
      transactionObject.upi = payload?.paymentInfo;
    } else if (paymentMethod === "Credit Card" && payload?.paymentInfo) {
      transactionObject.credit_card = payload?.paymentInfo;
    }

    delete payload.paymentInfo;
    transactionObject = { ...transactionObject, ...payload };

    const updateUserTransaction = await Transaction.findOneAndUpdate(
      { email: authInfo.email, "transactions._id": id },
      { $set: { "transactions.$": { _id: id, ...transactionObject } } },
      { new: true }
    );
    if (!updateUserTransaction)
      return res.status(404).json({
        data: {
          errorMessage: "No Transaction found",
        },
      });

    const updatedTransaction = updateUserTransaction.transactions.find(
      (transaction) => transaction._id.toString() === id
    );

    res.status(200).json({
      data: {
        message: "Transaction updated successfully",
        data: updatedTransaction,
      },
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
    const checkTransactionId = await Transaction.find({
      email: authInfo.email,
      transactions: {
        $elemMatch: {
          _id: new Types.ObjectId(id),
        },
      },
    });

    if (checkTransactionId.length === 0)
      return res.status(404).json({
        data: {
          errorMessage: "No Transaction found",
        },
      });

    await Transaction.findOneAndUpdate(
      { email: authInfo.email },
      { $pull: { transactions: { _id: id } } },
      { new: true }
    );

    return res.status(200).json({
      data: {
        message: "Transaction deleted successfully.",
      },
    });
  } catch (error) {
    console.log(error);
    res
      .status(500)
      .json({ errorMessage: "Something went wrong", error: error.message });
  }
};
