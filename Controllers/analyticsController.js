import { Transaction } from "../Models/transactionModel.js";

export const transactionsAnalytics = async (req, res) => {
  const { ...authInfo } = req.authInfo;
  try {
    const userTransactions = await Transaction.findOne({
      email: authInfo.email,
    });

    if (!userTransactions || userTransactions.transactions.length === 0)
      return res
        .status(202)
        .json({ data: { errorMessage: "No Transactions found." } });

    var agg;

    if (userTransactions?.transactions?.length >= 10) {
      agg = [
        {
          $match: {
            email: authInfo.email,
          },
        },
        {
          $unwind: {
            path: "$transactions",
          },
        },
        {
          $project: {
            transactions: 1,
          },
        },
        {
          $facet: {
            totalStats: [
              {
                $group: {
                  _id: "$_id",
                  totalTransactions: {
                    $sum: 1,
                  },
                  totalTarnsactionsAmount: {
                    $sum: "$transactions.amount",
                  },
                  starredTransactions: {
                    $sum: {
                      $cond: {
                        if: {
                          $eq: ["$transactions.starred", true],
                        },
                        then: 1,
                        else: 0,
                      },
                    },
                  },
                },
              },
            ],
            highestTransaction: [
              {
                $sort: {
                  "transactions.amount": -1,
                },
              },
              {
                $limit: 1,
              },
              {
                $project: {
                  transaction: "$transactions",
                },
              },
            ],
            lowestTransaction: [
              {
                $sort: {
                  "transactions.amount": 1,
                },
              },
              {
                $limit: 1,
              },

              {
                $project: {
                  transaction: "$transactions",
                },
              },
            ],
            latestTransaction: [
              {
                $sort: {
                  "transactions.transaction_date": -1,
                },
              },
              {
                $limit: 1,
              },
              {
                $project: {
                  transaction: "$transactions",
                },
              },
            ],
            OldTransaction: [
              {
                $sort: {
                  "transactions.transaction_date": 1,
                },
              },
              {
                $limit: 1,
              },
              {
                $project: {
                  transaction: "$transactions",
                },
              },
            ],
            paymentMethodStats: [
              {
                $group: {
                  _id: "$transactions.payment_method",
                  transactionCount: {
                    $sum: 1,
                  },
                },
              },
              {
                $sort: {
                  transactionCount: -1,
                },
              },
              {
                $limit: 1,
              },
              {
                $project: {
                  name: "$_id",
                  count: "$transactionCount",
                },
              },
            ],
            bankStats: [
              {
                $group: {
                  _id: "$transactions.bank",
                  transactionCount: {
                    $sum: 1,
                  },
                },
              },
              {
                $sort: {
                  transactionCount: -1,
                },
              },
              {
                $limit: 1,
              },
              {
                $project: {
                  name: "$_id",
                  count: "$transactionCount",
                },
              },
            ],
            categoryStats: [
              {
                $group: {
                  _id: "$transactions.category",
                  transactionCount: {
                    $sum: 1,
                  },
                },
              },
              {
                $sort: {
                  transactionCount: -1,
                },
              },
              {
                $limit: 1,
              },
              {
                $project: {
                  name: "$_id",
                  count: "$transactionCount",
                },
              },
            ],
            transactionDateStats: [
              {
                $group: {
                  _id: {
                    $dateToString: {
                      format: "%Y-%m-%d",
                      date: {
                        $toDate: "$transactions.transaction_date",
                      },
                    },
                  },
                  transactionCount: {
                    $sum: 1,
                  },
                },
              },
              {
                $sort: {
                  transactionCount: -1,
                },
              },
              {
                $limit: 1,
              },
              {
                $project: {
                  date: "$_id",
                  count: "$transactionCount",
                },
              },
            ],
          },
        },
      ];
    } else if (userTransactions?.transactions?.length < 10) {
      agg = [
        {
          $match: {
            email: authInfo.email,
          },
        },
        {
          $unwind: {
            path: "$transactions",
          },
        },
        {
          $project: {
            transactions: 1,
          },
        },
        {
          $facet: {
            totalStats: [
              {
                $group: {
                  _id: "$_id",
                  totalTransactions: {
                    $sum: 1,
                  },
                  totalTarnsactionsAmount: {
                    $sum: "$transactions.amount",
                  },
                  starredTransactions: {
                    $sum: {
                      $cond: {
                        if: {
                          $eq: ["$transactions.starred", true],
                        },
                        then: 1,
                        else: 0,
                      },
                    },
                  },
                },
              },
            ],
          },
        },
      ];
    }

    const response = await Transaction.aggregate(agg);

    let responseData = response?.[0];

    Object.keys(responseData).forEach((eachData) => {
      if (responseData[eachData][0]._id === null) delete responseData[eachData];
    });

    res.status(200).json({
      data: responseData,
      isChartsAvailable: userTransactions?.transactions?.length >= 10,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      data: { errorMessage: "Something went wrong", error: error.message },
    });
  }
};

export const chartAnalytics = async (req, res) => {
  const { ...authInfo } = req.authInfo;
  try {
    const userTransactions = await Transaction.findOne({
      email: authInfo.email,
    });

    if (!userTransactions || userTransactions.transactions.length < 10)
      return res
        .status(202)
        .json({ data: { errorMessage: "No Transactions found." } });

    var agg = [
      {
        $match: {
          email: authInfo.email,
        },
      },
      {
        $unwind: {
          path: "$transactions",
        },
      },
      {
        $project: {
          transactions: 1,
        },
      },
      {
        $facet: {
          paymentMethodStats: [
            {
              $group: {
                _id: "$transactions.payment_method",
                transactionCount: {
                  $sum: 1,
                },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
          ],
          bankStats: [
            {
              $group: {
                _id: "$transactions.bank",
                transactionCount: {
                  $sum: 1,
                },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
          ],
          categoryStats: [
            {
              $group: {
                _id: "$transactions.category",
                transactionCount: {
                  $sum: 1,
                },
              },
            },
            {
              $sort: {
                _id: 1,
              },
            },
          ],
        },
      },
    ];

    const response = await Transaction.aggregate(agg);

    let responseData = response?.[0];

    Object.keys(responseData).forEach((eachData) => {
      responseData[eachData] = responseData[eachData].filter(
        (entry) => entry._id !== null
      );
    });

    Object.keys(responseData).forEach((eachData) => {
      if (responseData[eachData].length === 0) delete responseData[eachData];
    });

    if (Object.keys(responseData).length > 0) {
      res.status(200).json({ data: responseData });
    } else {
      res.status(202).json({ data: { errorMessage: "No charts available" } });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      data: { errorMessage: "Something went wrong", error: error.message },
    });
  }
};
