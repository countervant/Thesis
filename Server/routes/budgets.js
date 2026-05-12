import express from "express";
import Budget from "../model/Admin/budgetmodel.js";
import { authorize } from "../middleware/authorize.js";
import { protect } from "../middleware/protectedjwt.js";
import { getPagination, pagedResponse } from "../utils/pagination.js";

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
    const { page, limit, skip } = getPagination(req.query);
    const query = {};

    if (allowedTypes.includes(req.query.type)) query.type = req.query.type;
    if (req.query.category) query.category = { $regex: String(req.query.category), $options: "i" };
    if (req.query.dateFrom || req.query.dateTo) {
      query.date = {};
      if (req.query.dateFrom) query.date.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) query.date.$lte = new Date(req.query.dateTo);
    }

    const [budgets, total, summary] = await Promise.all([
      Budget.find(query)
        .select("type description category date amount createdAt updatedAt")
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(8000)
        .lean(),
      Budget.countDocuments(query).maxTimeMS(8000),
      Budget.aggregate([
        { $match: query },
        { $group: { _id: "$type", total: { $sum: "$amount" } } },
      ]).option({ maxTimeMS: 8000 }),
    ]);
    const totalIncome = summary.find((item) => item._id === "income")?.total || 0;
    const totalExpense = summary.find((item) => item._id === "expense")?.total || 0;

    res.status(200).json({
      ...pagedResponse({ data: budgets, page, limit, total, key: "budgets" }),
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
      },
    });
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
