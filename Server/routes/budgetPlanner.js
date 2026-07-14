import express from "express";
import { authorize } from "../middleware/authorize.js";
import { protect } from "../middleware/protectedjwt.js";
import {
  BudgetPlannerEntry,
  BudgetPlannerSettings,
} from "../model/Employee/budgetPlannerModel.js";

const router = express.Router();
const allowedTypes = new Set(["income", "expense"]);

router.use(protect, authorize("employee"));

const normalizeEntry = (body) => ({
  type: String(body.type || "expense").toLowerCase(),
  description: String(body.description || "").trim(),
  category: String(body.category || "").trim(),
  date: body.date ? new Date(body.date) : null,
  amount: Math.abs(Number(body.amount)),
});

const validateEntry = (entry) => {
  if (!allowedTypes.has(entry.type)) return "Type must be income or expense";
  if (!entry.description) return "Description is required";
  if (!entry.category) return "Category is required";
  if (!entry.date || Number.isNaN(entry.date.getTime())) return "Valid date is required";
  if (!Number.isFinite(entry.amount) || entry.amount <= 0) return "Amount must be greater than 0";
  return "";
};

router.get("/", async (req, res) => {
  try {
    const [entries, settings] = await Promise.all([
      BudgetPlannerEntry.find({ owner: req.user._id })
        .select("type description category date amount createdAt updatedAt")
        .sort({ date: -1, createdAt: -1 })
        .maxTimeMS(8000)
        .lean(),
      BudgetPlannerSettings.findOne({ owner: req.user._id })
        .select("monthlyLimit")
        .maxTimeMS(8000)
        .lean(),
    ]);

    res.status(200).json({ entries, monthlyLimit: settings?.monthlyLimit || 0 });
  } catch (error) {
    console.error("Get employee budget planner error:", error);
    res.status(500).json({ message: "Unable to fetch your budget plan" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const monthlyLimit = Number(req.body.monthlyLimit);
    if (!Number.isFinite(monthlyLimit) || monthlyLimit < 0) {
      return res.status(400).json({ message: "Monthly budget must be zero or greater" });
    }

    const settings = await BudgetPlannerSettings.findOneAndUpdate(
      { owner: req.user._id },
      { monthlyLimit },
      { new: true, upsert: true, runValidators: true }
    ).lean();

    res.status(200).json({ monthlyLimit: settings.monthlyLimit });
  } catch (error) {
    console.error("Update employee budget settings error:", error);
    res.status(500).json({ message: "Unable to update your monthly budget" });
  }
});

router.post("/", async (req, res) => {
  try {
    const entry = normalizeEntry(req.body);
    const validationMessage = validateEntry(entry);
    if (validationMessage) return res.status(400).json({ message: validationMessage });

    const savedEntry = await BudgetPlannerEntry.create({ ...entry, owner: req.user._id });
    res.status(201).json(savedEntry);
  } catch (error) {
    console.error("Create employee budget entry error:", error);
    res.status(500).json({ message: "Unable to create budget entry" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const entry = normalizeEntry(req.body);
    const validationMessage = validateEntry(entry);
    if (validationMessage) return res.status(400).json({ message: validationMessage });

    const savedEntry = await BudgetPlannerEntry.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      entry,
      { new: true, runValidators: true }
    );
    if (!savedEntry) return res.status(404).json({ message: "Budget entry not found" });
    res.status(200).json(savedEntry);
  } catch (error) {
    console.error("Update employee budget entry error:", error);
    res.status(500).json({ message: "Unable to update budget entry" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const entry = await BudgetPlannerEntry.findOneAndDelete({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!entry) return res.status(404).json({ message: "Budget entry not found" });
    res.status(200).json({ message: "Budget entry deleted" });
  } catch (error) {
    console.error("Delete employee budget entry error:", error);
    res.status(500).json({ message: "Unable to delete budget entry" });
  }
});

export default router;
