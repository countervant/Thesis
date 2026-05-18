import express from "express";
import LeaveRequest from "../model/leaveRequestModel.js";
import User from "../model/userModel.js";
import { authorize } from "../middleware/authorize.js";
import { protect } from "../middleware/protectedjwt.js";
import { getPagination, pagedResponse } from "../utils/pagination.js";

const router = express.Router();

const allowedStatuses = ["Pending", "Approved", "Rejected"];
const allowedLeaveTypes = ["Vacation Leave", "Sick Leave", "Emergency Leave", "Others"];

const getFullName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.companyName ||
  user?.email ||
  "Employee";

const getDepartment = (user, fallback = "") =>
  String(fallback || user?.companyName || user?.position || "Unassigned").trim() || "Unassigned";

const dayMs = 24 * 60 * 60 * 1000;

const getDurationDays = (startDate, endDate) =>
  Math.max(1, Math.floor((endDate.getTime() - startDate.getTime()) / dayMs) + 1);

const getMonthRange = (value) => {
  if (!value || value === "all") return null;

  const now = new Date();
  const monthOffset = value === "last" ? -1 : 0;
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);

  return { start, end };
};

const buildRequestQuery = (req) => {
  const query = {};

  if (req.user.role !== "admin") {
    query.employee = req.user._id;
  }

  if (allowedStatuses.includes(req.query.status)) {
    query.status = req.query.status;
  }

  if (req.query.department) {
    query.department = req.query.department;
  }

  const monthRange = getMonthRange(req.query.month || "this");
  if (monthRange) {
    query.startDate = { $lt: monthRange.end };
    query.endDate = { $gte: monthRange.start };
  }

  return query;
};

const createRequestCode = async () => {
  const year = new Date().getFullYear();
  const count = await LeaveRequest.countDocuments({
    requestCode: { $regex: `^LR-${year}-` },
  });

  return `LR-${year}-${String(count + 1).padStart(4, "0")}`;
};

const normalizeRequestPayload = async (body, currentUser) => {
  const employeeId = currentUser.role === "admin" && body.employee ? body.employee : currentUser._id;
  const employee = await User.findById(employeeId)
    .select("firstName lastName email companyName position role phone")
    .lean();

  if (!employee) {
    return { error: "Employee not found" };
  }

  const startDate = body.startDate ? new Date(body.startDate) : null;
  const endDate = body.endDate ? new Date(body.endDate) : null;
  const leaveType = allowedLeaveTypes.includes(body.leaveType) ? body.leaveType : "";

  return {
    employee: employee._id,
    employeeName: getFullName(employee),
    employeeRole: employee.position || employee.role || "",
    department: getDepartment(employee, body.department),
    leaveType,
    startDate,
    endDate,
    durationDays: startDate && endDate ? getDurationDays(startDate, endDate) : 0,
    reason: body.reason?.trim() || "",
    emergencyContact: body.emergencyContact?.trim() || employee.phone || "",
  };
};

const validateRequestPayload = (payload) => {
  if (payload.error) return payload.error;
  if (!payload.leaveType) return "Leave type is required";
  if (!payload.startDate || Number.isNaN(payload.startDate.getTime())) return "Valid start date is required";
  if (!payload.endDate || Number.isNaN(payload.endDate.getTime())) return "Valid end date is required";
  if (payload.startDate > payload.endDate) return "Start date cannot be after end date";
  if (!payload.reason) return "Reason is required";
  return "";
};

router.get("/", protect, async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);
    const query = buildRequestQuery(req);
    const baseQuery = req.user.role === "admin" ? {} : { employee: req.user._id };
    const summaryQuery = { ...query };
    delete summaryQuery.status;

    const [requests, total, summary, leaveTypes, departments] = await Promise.all([
      LeaveRequest.find(query)
        .populate("employee", "firstName lastName email position companyName role avatar")
        .populate("reviewedBy", "firstName lastName email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(8000)
        .lean(),
      LeaveRequest.countDocuments(query).maxTimeMS(8000),
      LeaveRequest.aggregate([
        { $match: summaryQuery },
        {
          $facet: {
            byStatus: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
            byType: [{ $group: { _id: "$leaveType", count: { $sum: 1 } } }],
            onLeaveToday: [
              {
                $match: {
                  status: "Approved",
                  startDate: { $lte: new Date() },
                  endDate: { $gte: new Date() },
                },
              },
              { $count: "count" },
            ],
            approvedThisMonth: [
              {
                $match: {
                  status: "Approved",
                  reviewedAt: {
                    $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    $lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
                  },
                },
              },
              { $count: "count" },
            ],
          },
        },
      ]).option({ maxTimeMS: 8000 }),
      LeaveRequest.distinct("leaveType", baseQuery),
      LeaveRequest.distinct("department", baseQuery),
    ]);

    const summaryData = summary[0] || {};
    const byStatus = Object.fromEntries(
      (summaryData.byStatus || []).map((item) => [item._id, item.count])
    );

    res.status(200).json({
      ...pagedResponse({ data: requests, page, limit, total, key: "leaveRequests" }),
      departments: departments.filter(Boolean).sort(),
      leaveTypes: leaveTypes.filter(Boolean).sort(),
      summary: {
        pending: byStatus.Pending || 0,
        approved: byStatus.Approved || 0,
        rejected: byStatus.Rejected || 0,
        approvedThisMonth: summaryData.approvedThisMonth?.[0]?.count || 0,
        onLeaveToday: summaryData.onLeaveToday?.[0]?.count || 0,
        byType: summaryData.byType || [],
      },
    });
  } catch (error) {
    console.error("Get leave requests error:", error);
    res.status(500).json({ message: "Unable to fetch leave requests" });
  }
});

router.post("/", protect, async (req, res) => {
  try {
    const payload = await normalizeRequestPayload(req.body, req.user);
    const validationMessage = validateRequestPayload(payload);

    if (validationMessage) {
      return res.status(400).json({ message: validationMessage });
    }

    const leaveRequest = await LeaveRequest.create({
      ...payload,
      requestCode: await createRequestCode(),
    });

    const createdRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate("employee", "firstName lastName email position companyName role avatar")
      .lean();

    res.status(201).json(createdRequest);
  } catch (error) {
    console.error("Create leave request error:", error);
    res.status(500).json({ message: "Unable to create leave request" });
  }
});

router.patch("/:id/status", protect, authorize("admin"), async (req, res) => {
  try {
    const status = String(req.body.status || "");

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be Approved or Rejected" });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    leaveRequest.status = status;
    leaveRequest.reviewedBy = req.user._id;
    leaveRequest.reviewedAt = new Date();
    await leaveRequest.save();

    const updatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate("employee", "firstName lastName email position companyName role avatar")
      .populate("reviewedBy", "firstName lastName email role")
      .lean();

    res.status(200).json(updatedRequest);
  } catch (error) {
    console.error("Update leave request status error:", error);
    res.status(500).json({ message: "Unable to update leave request status" });
  }
});

export default router;
