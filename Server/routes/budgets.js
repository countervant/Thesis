import express from "express";
import Budget from "../model/Admin/budgetmodel.js";
import { authorize } from "../middleware/authorize.js";
import { protect } from "../middleware/protectedjwt.js";

const router = express.Router();
const allowedTypes = ["income", "expense"];

const normalizeBudgetPayload = (body) => {
  const type = allowedTypes.includes(body.type) ? body.type : "expense";
  const amount = Number(body.amount);

  return {
    type,
    description: body.description?.trim() || "",
    category: body.category?.trim() || "",
    date: body.date ? new Date(body.date) : null,
    amount: Number.isFinite(amount) ? Math.abs(amount) : 0,
  };
};

const validateBudgetPayload = (payload) => {
  if (!payload.description) return "Description is required";
  if (!payload.category) return "Category is required";
  if (!payload.date || Number.isNaN(payload.date.getTime())) return "Valid date is required";
  if (payload.amount <= 0) return "Amount must be greater than 0";
  return "";
};

router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const budgets = await Budget.find().sort({ date: -1, createdAt: -1 });
    res.status(200).json(budgets);
  } catch (error) {
    console.error("Get budgets error:", error);
    res.status(500).json({ message: "Unable to fetch budget entries" });
  }
});

router.post("/", protect, authorize("admin"), async (req, res) => {
  try {
    const payload = normalizeBudgetPayload(req.body);
    const validationMessage = validateBudgetPayload(payload);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const budget = await Budget.create(payload);
    res.status(201).json(budget);
  } catch (error) {
    console.error("Create budget error:", error);
    res.status(500).json({ message: "Unable to create budget entry" });
  }
});

router.put("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({ message: "Budget entry not found" });
    }

    const payload = normalizeBudgetPayload({
      type: req.body.type ?? budget.type,
      description: req.body.description ?? budget.description,
      category: req.body.category ?? budget.category,
      date: req.body.date ?? budget.date,
      amount: req.body.amount ?? budget.amount,
    });
    const validationMessage = validateBudgetPayload(payload);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    budget.type = payload.type;
    budget.description = payload.description;
    budget.category = payload.category;
    budget.date = payload.date;
    budget.amount = payload.amount;

    await budget.save();
    res.status(200).json(budget);
  } catch (error) {
    console.error("Update budget error:", error);
    res.status(500).json({ message: "Unable to update budget entry" });
  }
});

router.delete("/:id", protect, authorize("admin"), async (req, res) => {
  try {
    const budget = await Budget.findByIdAndDelete(req.params.id);

    if (!budget) {
      return res.status(404).json({ message: "Budget entry not found" });
    }

    res.status(200).json({ message: "Budget entry deleted" });
  } catch (error) {
    console.error("Delete budget error:", error);
    res.status(500).json({ message: "Unable to delete budget entry" });
  }
});

export default router;
