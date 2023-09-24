import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotEnv from "dotenv";

import { User } from "../Models/userModel.js";
import {
  mpinValidator,
  passwordValidator,
} from "../Validators/authValidators.js";

dotEnv.config();

export const signIn = async (req, res) => {
  const { password, ...identification } = req.body;
  try {
    if (!identification.email && !identification.mobileNumber)
      return res.status(400).json({
        data: { errorMessage: "Email or Mobile number is required." },
      });

    var fetchQuery = {};
    if (identification.email) {
      fetchQuery = { email: identification.email };
    } else {
      fetchQuery = { mobile_number: identification.mobileNumber };
    }

    const fetchUser = await User.find(fetchQuery);
    if (fetchUser.length === 0)
      return res.status(409).json({
        data: {
          errorMessage:
            "It appears that you do not have an account. Please sign up.",
        },
      });

    const isPasswordCorrect = await bcrypt.compare(
      password,
      fetchUser[0].password
    );
    if (!isPasswordCorrect)
      return res.status(401).json({ data: { errorMessage: "Invalid Credentials." } });

    const token = jwt.sign(
      {
        name: fetchUser[0].name,
        email: fetchUser[0].email,
        mobileNumber: fetchUser[0].mobile_number,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "365d" }
    );

    res.status(200).json({
      data: { name: fetchUser[0].name, token, message: "Login successful" },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      data: { errorMessage: "Something went wrong.", error: error.message },
    });
  }
};

export const signUp = async (req, res) => {
  const { name, email, mobileNumber, dateOfBirth, password, mpin } = req.body;
  try {
    if (!email || !mobileNumber || !name || !dateOfBirth || !password)
      return res
        .status(400)
        .json({ data: { errorMessage: "All fields are required." } });

    const fetchUser = await User.find({
      $or: [{ email: email }, { mobile_number: mobileNumber }],
    });
    if (fetchUser.length !== 0)
      return res.status(409).json({
        data: {
          errorMessage: "User with email or mobile number already present.",
        },
      });

    if (!passwordValidator(password))
      return res.status(400).json({
        errorType: "Validation failed",
        errors: {
          field: "Password",
          message:
            "Password must have 8+ chars with 1 uppercase, 1 lowercase, 1 digit, and 1 special character.",
        },
      });

    if (!mpinValidator(mpin)) {
      return res.status(400).json({
        errorType: "Validation failed",
        errors: {
          field: "Password",
          message: "MPIN must have 4 digits.",
        },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 15);
    const hashedMpin = await bcrypt.hash(mpin.toString(), 15);
    const userCreated = await User.create({
      name,
      email,
      mobile_number: mobileNumber,
      date_of_birth: dateOfBirth,
      password: hashedPassword,
      mpin: hashedMpin,
    });

    const token = jwt.sign(
      {
        name: userCreated.name,
        email: userCreated.email,
        mobileNumber: userCreated.mobile_number,
      },
      process.env.JWT_SECRET_KEY,
      { expiresIn: "365d" }
    );

    res.status(200).json({
      data: { name: userCreated.name, token, message: "Signup successful" },
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
    res.status(500).json({
      data: { errorMessage: "Something went wrong", error: error.message },
    });
  }
};

export const authenticateUser = async (req, res) => {
  const token = req.headers["authorization"];
  var authInfo = {};
  try {
    if (token === undefined)
      return res
        .status(400)
        .json({ error: "Please provide token or login to access content" });
    let verify = false;
    jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET_KEY,
      function (error, decoded) {
        if (!error) {
          verify = true;
          authInfo = {
            email: decoded.email,
            mobileNumber: decoded.mobileNumber,
            name: decoded.name,
          };
        }
      }
    );
    if (!verify)
      return res
        .status(400)
        .json({ error: "Invalid token or token Expired. Please Login again" });
    res.status(200).json({ message: "Valid User", data: authInfo });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
