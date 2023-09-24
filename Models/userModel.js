import mongoose from "mongoose";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name should be provided"],
      default: "User",
      trim: true,
      minLength: [3, "Name should contain atleast 3 words"],
      maxLength: [24, "Name should contain 12 or fewer words"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function (value) {
          return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value);
        },
        message: (props) => `${props.value} is not a valid email address`,
      },
    },
    mobile_number: {
      required: [true, "Phone number is required"],
      type: Number,
      unique: true,
      validate: {
        validator: function (value) {
          return /^[0-9]{10}$/.test(value);
        },
        message: (props) => `${props.value} is not a valid phone number`,
      },
    },
    date_of_birth: {
      type: Date,
      required: [true, "Date of birth is required"],
      default: Date.now(),
    },
    password: { type: String, required: [true, "Password is required"] },
    mpin: { type: String, required: [true, "MPIN is required"] },
    bank_details: [{ type: String, required: [true, "Bank name is required"] }],
    upi_app: [{ type: String, required: [true, "App name is required"] }],
    credit_cards: [
      { type: String, required: [true, "Credit name is required"] },
    ],
  },
  { timestamps: true }
);

export const User = mongoose.model("User", userSchema);
