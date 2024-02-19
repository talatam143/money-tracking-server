import mongoose from "mongoose";

const { Schema } = mongoose;

const transactionSchema = new Schema(
  {
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
    transactions: [
      {
        amount: { type: Number, required: true },
        title: { type: String, required: true },
        description: { type: String },
        category: { type: String },
        payment_method: { type: String },
        bank: { type: String },
        credit_card: { type: String },
        upi: { type: String },
        transaction_date: { type: Date, required: true },
        starred: { type: Boolean, default: false },
        members: [{ type: String }],
        tags: [String],
      },
    ],
  },
  { timestamps: true }
);

export const Transaction = mongoose.model("Transaction", transactionSchema);
