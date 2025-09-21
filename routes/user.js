// routes/userRoutes.js
import express from "express";
import User from "../models/usermodel.js";

const router = express.Router();

/**
 * CREATE USER
 */
router.post("/", async (req, res) => {
  try {
    const { userId, balance, scannedCard } = req.body;
    const user = new User({ userId, balance, scannedCard });
    await user.save();
    res.status(201).json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * READ ALL USERS
 */
router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * READ USER BY ID
 */
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * UPDATE USER (general)
 */
router.put("/:userId", async (req, res) => {
  try {
    const updatedUser = await User.findOneAndUpdate(
      { userId: req.params.userId },
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedUser) return res.status(404).json({ error: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE USER
 */
router.delete("/:userId", async (req, res) => {
  try {
    const deletedUser = await User.findOneAndDelete({ userId: req.params.userId });
    if (!deletedUser) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * UPDATE BALANCE (increment/decrement/set)
 */
router.patch("/:userId/balance", async (req, res) => {
  try {
    const { amount, type } = req.body;
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (type === "set") {
      user.balance = amount;
    } else if (type === "increment") {
      user.balance += amount;
    } else if (type === "decrement") {
      user.balance -= amount;
      if (user.balance < 0) return res.status(400).json({ error: "Balance cannot be negative" });
    } else {
      return res.status(400).json({ error: "Invalid type, use: set | increment | decrement" });
    }

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * ADD SCANNED CARD (no duplicate allowed)
 */
router.patch("/:userId/scanned-card", async (req, res) => {
  try {
    const { card } = req.body;
    const user = await User.findOne({ userId: req.params.userId });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.scannedCard.includes(card)) {
      return res.status(400).json({ error: "Card already exists" });
    }

    user.scannedCard.push(card);
    await user.save();

    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
