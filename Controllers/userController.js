import { User } from "../Models/userModel.js";

export const updateAllDetails = async (req, res) => {
  const schemaInformation = [
    { fetchField: "upiDetails", updateField: "upi_app", fieldType: "UPI" },
    {
      fetchField: "ccDetails",
      updateField: "credit_cards",
      fieldType: "Credit card",
    },
    {
      fetchField: "bankDetails",
      updateField: "bank_details",
      fieldType: "Bank details",
    },
  ];
  const { ...details } = req.body;
  const { ...authInfo } = req.authInfo;
  var updateCount = { ccDetails: 0, bankDetails: 0, upiDetails: 0 };
  var detailsCount = 0;
  var detailsResponseInformation = {
    ccDetails: "Credit card details are not provided.",
    bankDetails: "Bank details are not provided.",
    upiDetails: "UPI details are not provided.",
  };
  var existingData = [];

  try {
    const fetchUser = await User.findOne({ email: authInfo.email });
    if (!fetchUser)
      return res.status(409).json({ data: { errorMessage: "No user found." } });

    for (let i = 0; i < schemaInformation.length; i++) {
      let fetchField = schemaInformation[i].fetchField;
      let updateField = schemaInformation[i].updateField;
      let fieldType = schemaInformation[i].fieldType;

      if (details[fetchField]) {
        detailsCount += 1;
        details[fetchField].forEach((eachItem) => {
          if (!fetchUser[updateField].includes(eachItem)) {
            fetchUser[updateField].push(eachItem);
            updateCount[fetchField] += 1;
          } else {
            existingData.push(eachItem);
          }
        });

        if (updateCount[fetchField] === 0) {
          detailsResponseInformation[
            fetchField
          ] = `${fieldType} details already present`;
        } else if (updateCount[fetchField] === details[fetchField].length) {
          await fetchUser.save();
          detailsResponseInformation[
            fetchField
          ] = `${fieldType} details have been added successfully.`;
        } else if (updateCount[fetchField] < details[fetchField].length) {
          await fetchUser.save();
          let msgString = "";
          for (let i = 0; i < existingData.length; i++) {
            msgString += existingData[i];
            existingData.length > 1 && i !== existingData.length - 1
              ? (msgString += ", ")
              : null;
          }
          detailsResponseInformation[
            fetchField
          ] = `${msgString} already present, added remaining successfully.`;
        }
      }
    }
    if (detailsCount === 0) {
      return res.status(409).json({
        data: { errorMessage: `Atleast one payemnt information is required` },
      });
    } else {
      return res.status(200).json({
        data: {
          message: `${detailsResponseInformation.ccDetails}, ${detailsResponseInformation.bankDetails}, ${detailsResponseInformation.upiDetails}`,
        },
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
    console.log(error.message);
    res.status(500).json({
      data: { errorMessage: "Something went wrong", error: error.message },
    });
  }
};

export const getUserDetails = async (req, res) => {
  const { ...authInfo } = req.authInfo;
  const data = {};
  try {
    const userDetails = await User.findOne({
      email: authInfo.email,
    });
    if (!userDetails)
      return res.status(404).json({ data: { errorMessage: "No User found." } });
    if (userDetails.bank_details.length > 0)
      data.bankDetails = userDetails.bank_details;
    if (userDetails.upi_app.length > 0) data.upiDetails = userDetails.upi_app;
    if (userDetails.credit_cards.length > 0)
      data.creditCards = userDetails.credit_cards;
    return res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      data: { errorMessage: "Something went wrong", error: error.message },
    });
  }
};

export const forceUpdate = async (req, res) => {
  const { ...details } = req.body;
  const { ...authInfo } = req.authInfo;
  var schemaFormation = {};
  var updateCount = 0;
  var data = {};
  try {
    const fetchUser = await User.findOne({ email: authInfo.email });
    if (!fetchUser)
      return res.status(409).json({ data: { errorMessage: "No user found." } });
    
    var field = Object.keys(details)?.[0];
    if (field) {
      if (field === "upiDetails") {
        schemaFormation = {
          fetchField: "upiDetails",
          updateField: "upi_app",
          fieldType: "UPI",
        };
      } else if (field === "ccDetails") {
        schemaFormation = {
          fetchField: "ccDetails",
          updateField: "credit_cards",
          fieldType: "Credit card",
        };
      } else if (field === "bankDetails") {
        schemaFormation = {
          fetchField: "bankDetails",
          updateField: "bank_details",
          fieldType: "Bank details",
        };
      }
      const updateAndReturn = async () => {
        fetchUser[schemaFormation.updateField] = details[field];
        const userDetails = await fetchUser.save();
        if (userDetails.bank_details.length > 0)
          data.bankDetails = userDetails.bank_details;
        if (userDetails.upi_app.length > 0)
          data.upiDetails = userDetails.upi_app;
        if (userDetails.credit_cards.length > 0)
          data.creditCards = userDetails.credit_cards;
        return res.status(200).json({
          data: {
            data,
            message: `Updated ${schemaFormation.fieldType} details successfully.`,
          },
        });
      };

      if (
        details[field].length === fetchUser[schemaFormation.updateField].length
      ) {
        fetchUser[schemaFormation.updateField].forEach((eachItem) => {
          if (!details[field].includes(eachItem)) {
            updateCount += 1;
          }
        });
        if (updateCount === 0) {
          return res.status(409).json({
            data: {
              errorMessage: `${schemaFormation.fieldType} details already present`,
            },
          });
        } else {
          updateAndReturn();
        }
      } else {
        updateAndReturn();
      }
    } else {
      return res.status(409).json({
        data: { errorMessage: `Atleast one payemnt information is required` },
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
    console.log(error.message);
    res.status(500).json({
      data: { errorMessage: "Something went wrong", error: error.message },
    });
  }
};
