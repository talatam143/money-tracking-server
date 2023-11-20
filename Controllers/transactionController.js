import { Transaction } from "../Models/transactionModel.js";

export const getTransactions = async (req, res) => {
  const { ...authInfo } = req.authInfo;
  const { ...queries } = req.query;
  console.log(queries);
  try {
    const userTransactions = await Transaction.findOne({
      email: authInfo.email,
    });

    let filterMatch = {};
    if (queries?.searchfield && isNaN(queries?.searchfield)) {
      filterMatch["transactions.title"] = { $regex: new RegExp(`${queries.searchfield}`, "i") };
    } else if (queries?.searchfield) {
      filterMatch["transactions.amount"] = Number(queries.searchfield);
    } else if (queries.fromdate && queries?.todate) {
      filterMatch["transactions.transaction_date"] = {
        $gte: new Date(queries.fromdate),
        $lt: new Date(queries?.todate),
      };
    } else if (queries.paymentmethod) {
      filterMatch["transactions.payment_method"] = paymentmethod;
    } else if (queries.bank) {
      filterMatch["transactions.bank"] = bank;
    } else if (queries.upi) {
      filterMatch["transactions.upi"] = upi;
    } else if (queries.creditcard) {
      filterMatch["transactions.credit_card"] = creditcard;
    } else if (queries.category) {
      filterMatch["transactions.category"] = category;
    } else if (queries.starred) {
      filterMatch["transactions.starred"] = starred;
    }

    let agg = [
      {
        $match: {
          email: "contact2manikanta@gmail.com",
        },
      },
      {
        $project: {
          transactions: "$transactions",
          transactionCount: {
            $size: "$transactions",
          },
        },
      },
      {
        $unwind: {
          path: "$transactions",
        },
      },
      {
        $match: filterMatch,
      },
      {
        $skip: queries?.skip ? Number(queries.skip) : 0,
      },
      {
        $limit: 15,
      },
      {
        $group: {
          _id: "$_id",
          transactionCount: {
            $first: "$transactionCount",
          },
          transactions: {
            $push: "$transactions",
          },
        },
      },
    ];

    if (queries.filtertype === "amount") {
      agg = [
        ...agg.slice(0, 4),
        {
          $sort: { "transactions.amount": queries?.order === "desc" ? -1 : 1 },
        },
        ...agg.slice(4),
      ];
    } else if (queries.filtertype === "transactiondate") {
      agg = [
        ...agg.slice(0, 4),
        {
          $sort: {
            "transactions.transaction_date": queries?.order === "desc" ? -1 : 1,
          },
        },
        ...agg.slice(4),
      ];
    }

    console.log("Aggregation is \n", agg);

    const cursor = await Transaction.aggregate(agg);

    if (!userTransactions)
      return res.status(404).json({ errorMessage: "No Transactions found." });
    res.status(200).json({
      data: cursor[0],
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
