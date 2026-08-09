import express from "express";
import { createHash } from "crypto";
import { authorize } from "../middleware/authorize.js";
import { protect } from "../middleware/protectedjwt.js";
import Task from "../model/Admin/taskmodel.js";
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

const syncProjectIncomeEntries = async (employeeId) => {
  const tasks = await Task.find({ "employeePayments.employee": employeeId })
    .select("title employeePayments.employee employeePayments.amount employeePayments.paidAt employeePayments.paidBy")
    .maxTimeMS(8000)
    .lean();
  const operations = tasks.flatMap((task) =>
    (task.employeePayments || [])
      .filter((payment) => String(payment.employee?._id || payment.employee) === String(employeeId))
      .map((payment) => {
        const sourceEmployeePayment = `${task._id}:${employeeId}`;
        const entryId = createHash("sha256")
          .update(`employee-budget-income:${sourceEmployeePayment}`)
          .digest("hex")
          .slice(0, 24);

        return {
          updateOne: {
            filter: { _id: entryId },
            update: {
              $setOnInsert: {
                owner: employeeId,
                type: "income",
                description: `Project income: ${task.title}`,
                category: "Project Income",
                date: payment.paidAt || new Date(),
                amount: payment.amount,
                sourceEmployeePayment,
                relatedTask: task._id,
                paidBy: payment.paidBy,
              },
            },
            upsert: true,
          },
        };
      })
  );

  if (operations.length) {
    await BudgetPlannerEntry.bulkWrite(operations, { ordered: false });
  }
};

router.get("/", async (req, res) => {
  try {
    await syncProjectIncomeEntries(req.user._id);
    const [entries, settings] = await Promise.all([
      BudgetPlannerEntry.find({ owner: req.user._id })
        .select("type description category date amount sourceEmployeePayment relatedTask paidBy createdAt updatedAt")
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
      { returnDocument: "after", upsert: true, runValidators: true }
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
    const existingEntry = await BudgetPlannerEntry.findOne({
      _id: req.params.id,
      owner: req.user._id,
    }).select("sourceEmployeePayment");
    if (!existingEntry) return res.status(404).json({ message: "Budget entry not found" });
    if (existingEntry.sourceEmployeePayment) {
      return res.status(400).json({ message: "Project income can only be managed by the paying admin" });
    }

    const entry = normalizeEntry(req.body);
    const validationMessage = validateEntry(entry);
    if (validationMessage) return res.status(400).json({ message: validationMessage });

    const savedEntry = await BudgetPlannerEntry.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      entry,
      { returnDocument: "after", runValidators: true }
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
    const entry = await BudgetPlannerEntry.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });
    if (!entry) return res.status(404).json({ message: "Budget entry not found" });
    if (entry.sourceEmployeePayment) {
      return res.status(400).json({ message: "Project income can only be managed by the paying admin" });
    }
    await entry.deleteOne();
    res.status(200).json({ message: "Budget entry deleted" });
  } catch (error) {
    console.error("Delete employee budget entry error:", error);
    res.status(500).json({ message: "Unable to delete budget entry" });
  }
});

export default router;
