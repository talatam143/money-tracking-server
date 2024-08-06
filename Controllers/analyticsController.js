import { Transaction } from "../Models/transactionModel.js";

const handleTransactionsGroup = async (agg, email, month) => {
  var timeLineGroups = {};
  var totalTransactionsCount = 0;
  const currDate = new Date(Date.now());
  let currYear = currDate.getFullYear();
  let currMonth = currDate.getMonth() + 1;
  let updatedMonth = "";

  try {
    const groupedTransactions = await Transaction.aggregate([
      {
        '$match': {
          'email': email
        }
      }, {
        '$unwind': {
          'path': '$transactions'
        }
      }, {
        '$project': {
          '_id': 0,
          'transactions_date': '$transactions.transaction_date'
        }
      }, {
        '$addFields': {
          'transaction_month': {
            '$dateToString': {
              'format': '%Y-%m',
              'date': '$transactions_date'
            }
          }
        }
      }, {
        '$group': {
          '_id': '$transaction_month',
          'total_transactions': {
            '$sum': 1
          }
        }
      }, {
        '$sort': {
          '_id': 1
        }
      }
    ])

    if (!groupedTransactions || groupedTransactions.length === 0) {
      return res
        .status(202)
        .json({ data: { errorMessage: "No Transactions found." } });
    } else {
      groupedTransactions.forEach((eachTransaction) => {
        let year = eachTransaction?._id.split("-")[0]
        let month = eachTransaction?._id.split("-")[1]
        month.startsWith("0") ? month = month.slice(1,) : null
        timeLineGroups[year] ? timeLineGroups[year].push(month) : timeLineGroups[year] = [month]
        totalTransactionsCount += eachTransaction.total_transactions;
      })
    }

    if (month) {
      currYear = Number(month.split("-")[0])
      currMonth = Number(month.split("-")[1])
    }

    if (timeLineGroups?.[String(currYear)]?.includes(String(currMonth))) {
      function getDaysInMonth(year, month) {
        return new Date(year, month, 0).getDate();
      }
      const daysInMonth = getDaysInMonth(currYear, currMonth);
      let fromDateString = `${currYear}-${currMonth}-1`
      let toDateString = `${currYear}-${currMonth}-${daysInMonth}`
      const fromDate = new Date(fromDateString);
      const toDate = new Date(toDateString);

      const offset = fromDate.getTimezoneOffset();
      toDate.setHours(23);
      toDate.setMinutes(59);
      toDate.setSeconds(59);
      toDate.setMilliseconds(999);

      const adjustedFromDate = new Date(
        fromDate.getTime() - offset * 60 * 1000
      );
      const adjustedToDate = new Date(
        toDate.getTime() - offset * 60 * 1000
      );

      agg = [...agg.slice(0, 2), {
        '$match': {
          'transactions.transaction_date': {
            '$gte': new Date(adjustedFromDate.toISOString()),
            '$lte': new Date(adjustedToDate.toISOString()),
          }
        }
      }, ...agg.slice(2,)]

      let currentMonthCount = groupedTransactions.filter((eachTransaction) => eachTransaction._id === `${currYear}-${currMonth > 10 ? currMonth : `0${currMonth}`}`)
      totalTransactionsCount = currentMonthCount?.[0]?.total_transactions
      updatedMonth = `${currYear}-${currMonth}`
    } else {
      updatedMonth = "All time"
    }
    return { timeLineGroups, totalTransactionsCount, agg, updatedMonth }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      data: { errorMessage: "Something went wrong", error: error.message },
    });
  }
}

export const transactionsAnalytics = async (req, res) => {
  const { ...authInfo } = req.authInfo;
  const { month } = req.query;
  try {
    var analyticsAgg = [
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
    ]

    const { timeLineGroups, totalTransactionsCount, agg, updatedMonth } = await handleTransactionsGroup(analyticsAgg, authInfo.email, month)

    const facetAgg = {
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
      ]
    }
    const facetStage = {
      $facet: {
        totalStats: [
          {
            $group: {
              _id: "$_id",
              totalTransactions: {
                $sum: 1,
              },
              totalTransactionsAmount: {
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
    };

    if (totalTransactionsCount >= 10) {
      Object.keys(facetAgg).forEach(key => {
        facetStage.$facet[key] = facetAgg[key];
      });
    }
    agg.push(facetStage);

    const response = await Transaction.aggregate(agg);
    let responseData = response?.[0];

    Object.keys(responseData).forEach((eachData) => {
      if (responseData?.[eachData]?.[0]?._id === null) delete responseData[eachData];
    });
    responseData.timeLineGroups = timeLineGroups
    responseData.updatedMonth = updatedMonth

    res.status(200).json({
      data: responseData,
      isChartsAvailable: totalTransactionsCount >= 10,
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
  const { month } = req.body;
  try {
    var chartsAgg = [
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

    const { agg } = await handleTransactionsGroup(chartsAgg, authInfo.email, month)

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
