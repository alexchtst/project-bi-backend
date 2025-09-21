import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    userId: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    scannedCard: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "user_table",
  }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
