import express from "express";
import Budget from "../model/Admin/budgetmodel.js";
import Client from "../model/Admin/Clientmodel.js";
import Task from "../model/Admin/taskmodel.js";
import User from "../model/userModel.js";
import { authorize } from "../middleware/authorize.js";
import { protect } from "../middleware/protectedjwt.js";

const router = express.Router();
const userFields = "firstName lastName email role position companyName isActive isOnline lastSeen";

router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const getValue = (result, fallback) =>
      result.status === "fulfilled" ? result.value : fallback;
    const queries = await Promise.allSettled([
      Task.countDocuments().maxTimeMS(8000),
      User.countDocuments({ role: "employee" }).maxTimeMS(8000),
      User.countDocuments({ role: "client" }).maxTimeMS(8000),
      Client.countDocuments().maxTimeMS(8000),
      Budget.countDocuments().maxTimeMS(8000),
      Task.aggregate([{ $group: { _id: "$status", total: { $sum: 1 } } }]).option({ maxTimeMS: 8000 }),
      Task.find()
        .select("-comments -attachments")
        .populate("assignedTo", userFields)
        .populate("createdBy", userFields)
        .sort({ createdAt: -1 })
        .limit(10)
        .maxTimeMS(8000)
        .lean(),
      User.find({ role: "employee" })
        .select(userFields)
        .sort({ createdAt: -1 })
        .limit(10)
        .maxTimeMS(8000)
        .lean(),
      Client.find()
        .select("companyName contactPerson email phone country service isActive assignedEmployee createdAt updatedAt")
        .populate("assignedEmployee", userFields)
        .sort({ createdAt: -1 })
        .limit(10)
        .maxTimeMS(8000)
        .lean(),
      Budget.find()
        .select("type description category date amount createdAt updatedAt")
        .sort({ date: -1, createdAt: -1 })
        .limit(10)
        .maxTimeMS(8000)
        .lean(),
    ]);
    queries.forEach((result, index) => {
      if (result.status === "rejected") {
        console.warn(`Dashboard query ${index} failed:`, result.reason?.message || result.reason);
      }
    });
    const totalTasks = getValue(queries[0], 0);
    const totalEmployees = getValue(queries[1], 0);
    const totalUserClients = getValue(queries[2], 0);
    const totalManualClients = getValue(queries[3], 0);
    const totalBudgetEntries = getValue(queries[4], 0);
    const taskStatusCounts = getValue(queries[5], []);
    const recentTasks = getValue(queries[6], []);
    const recentEmployees = getValue(queries[7], []);
    const recentClients = getValue(queries[8], []);
    const recentBudgetEntries = getValue(queries[9], []);

    res.status(200).json({
      totalTasks,
      totalEmployees,
      totalClients: totalUserClients + totalManualClients,
      totalBudgetEntries,
      taskStatusCounts: taskStatusCounts.reduce(
        (result, item) => ({ ...result, [item._id]: item.total }),
        {}
      ),
      recentTasks,
      recentEmployees,
      recentClients,
      recentBudgetEntries,
    });
  } catch (error) {
    console.error("Get dashboard summary error:", error);
    res.status(500).json({ message: "Unable to load dashboard summary" });
  }
});

export default router;
