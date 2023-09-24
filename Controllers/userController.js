import { User } from "../Models/userModel.js";

const updateDetails = async (req, res, fetchField, updateField, fieldType) => {
  const { ...details } = req.body;
  const { ...authInfo } = req.authInfo;
  var updateCount = 0;
  var existingData = [];
  try {
    const fetchUser = await User.findOne({ email: authInfo.email });
    if (!fetchUser)
      return res.status(409).json({ errorMessage: "No user found." });

    if (details[fetchField]) {
      details[fetchField].forEach((eachItem) => {
        if (!fetchUser[updateField].includes(eachItem)) {
          fetchUser[updateField].push(eachItem);
          updateCount += 1;
        } else {
          existingData.push(eachItem);
        }
      });
    } else {
      return res
        .status(409)
        .json({ errorMessage: `${fieldType} details are required` });
    }

    if (updateCount === 0) {
      res
        .status(409)
        .json({ errorMessage: `${fieldType} details already present` });
    } else if (updateCount === details[fetchField].length) {
      await fetchUser.save();
      res.status(200).json({
        message: `${fieldType} details have been added successfully.`,
      });
    } else if (updateCount < details[fetchField].length) {
      await fetchUser.save();
      let msgString = "";
      for (let i = 0; i < existingData.length; i++) {
        msgString += existingData[i];
        existingData.length > 1 && i !== existingData.length - 1
          ? (msgString += ", ")
          : null;
      }
      res.status(200).json({
        message: `${msgString} already present, added remaining successfully.`,
      });
    }
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
    console.log(error.message);
    res
      .status(500)
      .json({ errorMessage: "Something went wrong", error: error.message });
  }
};

export const updateUPI = async (req, res) => {
  await updateDetails(req, res, "upiDetails", "upi_app", "UPI");
};

export const updateCC = async (req, res) => {
  await updateDetails(req, res, "ccDetails", "credit_cards", "Credit card");
};

export const updateBank = async (req, res) => {
  await updateDetails(req, res, "bankDetails", "bank_details", "Bank details");
};
