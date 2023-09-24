import dotEnv from "dotenv";
import jwt from "jsonwebtoken";

dotEnv.config();

export const authentication = async (req, res, next) => {
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
          };
        }
      }
    );
    if (!verify)
      return res
        .status(400)
        .json({ error: "Invalid token or token Expired. Please Login again" });
    req.authInfo = authInfo;
    next();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
