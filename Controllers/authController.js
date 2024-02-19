import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dotEnv from "dotenv";
import unirest from "unirest";
import nodemailer from "nodemailer";
import Mailgen from "mailgen";
import moment from "moment";

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
      return res
        .status(401)
        .json({ data: { errorMessage: "Invalid Credentials." } });

    if (!fetchUser[0].isVerified) {
      let generateOTP = Math.floor(Math.random() * (999999 - 111111) + 111111);

      var sendOtp = unirest("GET", "https://www.fast2sms.com/dev/bulkV2");
      sendOtp.query({
        authorization: process.env.SMS_API,
        message: `Use code ${generateOTP} to verify your signup on Money Tracker. It's valid for 5 mins. Please do no share the code`,
        language: "english",
        variables_values: generateOTP,
        route: "otp",
        numbers: fetchUser[0].mobile_number,
      });
      sendOtp.headers({
        "cache-control": "no-cache",
      });

      const mailTransporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_AUTH,
        },
      });

      let MailGenerator = new Mailgen({
        theme: "cerberus",
        product: {
          name: "Money Tracer",
          link: "https://moneytracer.srimanikanta.in/",
        },
      });

      async function sendEmail() {
        await mailTransporter.sendMail({
          from: "mernauthnoreply@gmail.com",
          to: fetchUser[0].email,
          subject: "OTP to Verify Account",
          html: MailGenerator.generate({
            body: {
              name: fetchUser[0].name,
              intro: `Use code ${generateOTP} to verify your signup on Money Tracker. It's valid for 5 mins.
               Please do no share the code with anyone.`,
              outro: "Looking forward to meet you.",
            },
          }),
        });
      }

      const [otpStatus, emailStatus] = await Promise.all([
        new Promise((resolve) => {
          sendOtp.end(function (res) {
            resolve(true);
          });
        }),
        sendEmail()
          .then(() => true)
          .catch(() => false),
      ]);

      if (otpStatus || emailStatus) {
        return res.status(202).json({
          data: {
            isVerified: false,
            message:
              "User is not verified. OTP sent to your mobile and email! verify it within 5 mins. ",
          },
        });
      }
    }
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
      data: {
        name: fetchUser[0].name,
        email: fetchUser[0].email,
        mobileNumber: fetchUser[0].mobile_number,
        token,
        message: "Login successful",
      },
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

    let generateOTP = Math.floor(Math.random() * (999999 - 111111) + 111111);

    var sendOtp = unirest("GET", "https://www.fast2sms.com/dev/bulkV2");
    sendOtp.query({
      authorization: process.env.SMS_API,
      message: `Use code ${generateOTP} to verify your signup on Money Tracker. It's valid for 5 mins. Please do no share the code`,
      language: "english",
      variables_values: generateOTP,
      route: "otp",
      numbers: mobileNumber,
    });
    sendOtp.headers({
      "cache-control": "no-cache",
    });

    const mailTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_AUTH,
      },
    });

    let MailGenerator = new Mailgen({
      theme: "cerberus",
      product: {
        name: "Money Tracer",
        link: "https://moneytracer.srimanikanta.in/",
      },
    });

    async function sendEmail() {
      await mailTransporter.sendMail({
        from: "mernauthnoreply@gmail.com",
        to: email,
        subject: "OTP to Verify Account",
        html: MailGenerator.generate({
          body: {
            name: name,
            intro: `Use code ${generateOTP} to verify your signup on Money Tracker. It's valid for 5 mins.
             Please do no share the code with anyone.`,
            outro: "Looking forward to meet you.",
          },
        }),
      });
    }

    const [otpStatus, emailStatus] = await Promise.all([
      new Promise((resolve) => {
        sendOtp.end(function (res) {
          resolve(true);
        });
      }),
      sendEmail()
        .then(() => true)
        .catch(() => false),
    ]);

    if (otpStatus || emailStatus) {
      const hashedPassword = await bcrypt.hash(password, 15);
      const hashedMpin = await bcrypt.hash(mpin.toString(), 5);
      const hashedOtp = await bcrypt.hash(generateOTP.toString(), 5);
      await User.create({
        name,
        email,
        mobile_number: mobileNumber,
        date_of_birth: dateOfBirth,
        password: hashedPassword,
        mpin: hashedMpin,
        OTP: hashedOtp,
      });

      res.status(200).json({
        data: {
          message:
            "OTP sent to your mobile and email! verify it within 5 mins.",
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

export const verifyUser = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const findUser = await User.findOne({ email: email });

    if (!email || !otp)
      return res.status(409).json({
        data: {
          errorMessage: "Email and OTP are required",
        },
      });
    if (!findUser)
      return res.status(409).json({
        data: {
          errorMessage:
            "It appears that you do not have an account. Please sign up.",
        },
      });

    var currentDate = new moment(Date.now());
    var otpDate = new moment(findUser.updatedAt);
    var duration = moment.duration(currentDate.diff(otpDate));
    var minutes = duration.as("minutes");

    if (minutes > 5)
      return res
        .status(404)
        .json({ data: { errorMessage: "OTP expired. Click on resend OTP" } });

    const isOtpCorrect = await bcrypt.compare(otp, findUser.OTP);
    if (!isOtpCorrect) {
      return res.status(404).json({ data: { errorMessage: "Invalid OTP." } });
    } else {
      findUser.isVerified = true;
      findUser.OTP = "N/A";
      await findUser.save();

      const token = jwt.sign(
        {
          name: findUser.name,
          email: findUser.email,
          mobileNumber: findUser.mobile_number,
        },
        process.env.JWT_SECRET_KEY,
        { expiresIn: "365d" }
      );

      return res.status(200).json({
        data: {
          token,
          name: findUser.name,
          email: findUser.email,
          mobileNumber: findUser.mobile_number,
          message: "Signup Successful",
        },
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      data: { errorMessage: "Something went wrong.", error: error.message },
    });
  }
};

export const authenticateUser = async (req, res) => {
  const token = req.headers["authorization"];
  var authInfo = {};
  try {
    if (token === undefined)
      return res.status(400).json({
        data: {
          errorMessage: "Please provide token or login to access content",
        },
      });
    let verify = false;
    jwt.verify(
      token.split(" ")[1],
      process.env.JWT_SECRET_KEY,
      async function (error, decoded) {
        if (error) {
          return res.status(400).json({
            data: {
              errorMessage:
                "Invalid token or token Expired. Please Login again",
            },
          });
        } else {
          const findUser = await User.findOne({ email: decoded.email });
          if (!findUser)
            return res.status(400).json({
              data: {
                errorMessage: "Something went wrong.",
              },
            });
          authInfo = {
            email: decoded.email,
            mobileNumber: decoded.mobileNumber,
            name: decoded.name,
          };
          return res
            .status(200)
            .json({ data: { message: "Valid User", ...authInfo } });
        }
      }
    );
  } catch (err) {
    res.status(400).json({ data: { errorMessage: err.message } });
  }
};

export const resendOTP = async (req, res) => {
  const { email } = req.body;

  try {
    const findUser = await User.findOne({ email: email });
    if (!email)
      return res.status(409).json({
        data: {
          errorMessage: "Email is required",
        },
      });
    if (!findUser)
      return res.status(409).json({
        data: {
          errorMessage:
            "It appears that you do not have an account. Please sign up.",
        },
      });

    let generateOTP = Math.floor(Math.random() * (999999 - 111111) + 111111);

    var sendOtp = unirest("GET", "https://www.fast2sms.com/dev/bulkV2");
    sendOtp.query({
      authorization: process.env.SMS_API,
      message: `Use code ${generateOTP} to verify your signup on Money Tracker. It's valid for 5 mins. Please do no share the code`,
      language: "english",
      variables_values: generateOTP,
      route: "otp",
      numbers: findUser.mobile_number,
    });
    sendOtp.headers({
      "cache-control": "no-cache",
    });

    const mailTransporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_AUTH,
      },
    });

    let MailGenerator = new Mailgen({
      theme: "cerberus",
      product: {
        name: "Money Tracer",
        link: "https://moneytracer.srimanikanta.in/",
      },
    });

    async function sendEmail() {
      await mailTransporter.sendMail({
        from: "mernauthnoreply@gmail.com",
        to: email,
        subject: "OTP to Verify Account",
        html: MailGenerator.generate({
          body: {
            name: findUser.name,
            intro: `Use code ${generateOTP} to verify your signup on Money Tracker. It's valid for 5 mins.
               Please do no share the code with anyone.`,
            outro: "Looking forward to meet you.",
          },
        }),
      });
    }

    const [otpStatus, emailStatus] = await Promise.all([
      new Promise((resolve) => {
        sendOtp.end(function (res) {
          resolve(true);
        });
      }),
      sendEmail()
        .then(() => true)
        .catch(() => false),
    ]);

    if (otpStatus || emailStatus) {
      const hashedOtp = await bcrypt.hash(generateOTP.toString(), 5);
      findUser.OTP = hashedOtp;
      findUser.save();

      res.status(200).json({
        data: {
          message:
            "OTP sent to your mobile and email! verify it within 5 mins.",
        },
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      data: { errorMessage: "Something went wrong.", error: error.message },
    });
  }
};

export const verifyOTP = async (req, res) => {
  const { email, otp } = req.body;
  try {
    const findUser = await User.findOne({ email: email });

    if (!email || !otp)
      return res.status(409).json({
        data: {
          errorMessage: "Email and OTP are required",
        },
      });
    if (!findUser)
      return res.status(409).json({
        data: {
          errorMessage:
            "It appears that you do not have an account. Please sign up.",
        },
      });

    var currentDate = new moment(Date.now());
    var otpDate = new moment(findUser.updatedAt);
    var duration = moment.duration(currentDate.diff(otpDate));
    var minutes = duration.as("minutes");

    if (minutes > 5)
      return res
        .status(404)
        .json({ data: { errorMessage: "OTP expired. Click on resend OTP" } });

    const isOtpCorrect = await bcrypt.compare(otp, findUser.OTP);
    if (!isOtpCorrect) {
      return res.status(404).json({ data: { errorMessage: "Invalid OTP." } });
    } else {
      return res.status(200).json({
        data: {
          message: "OTP Verified",
        },
      });
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({
      data: { errorMessage: "Something went wrong.", error: error.message },
    });
  }
};

export const changePassword = async (req, res) => {
  const { email, password } = req.body;
  try {
    const findUser = await User.findOne({ email: email });

    if (!passwordValidator(password))
      return res.status(400).json({
        errorType: "Validation failed",
        errors: {
          field: "Password",
          message:
            "Password must have 8+ chars with 1 uppercase, 1 lowercase, 1 digit, and 1 special character.",
        },
      });

    const isOldPassword = await bcrypt.compare(password, findUser.password);

    if (isOldPassword)
      return res.status(400).json({
        data: {
          errorMessage: "Old password and new password should not be same.",
        },
      });

    const newHashedPassword = await bcrypt.hash(password, 15);
    findUser.password = newHashedPassword;
    await findUser.save();

    return res.status(200).json({
      data: {
        message: "Your password is changed Successful. Please login",
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
    res.status(500).json({
      data: { errorMessage: "Something went wrong", error: error.message },
    });
  }
};
