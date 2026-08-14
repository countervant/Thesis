import express from "express";
import LeaveRequest from "../models/leaveRequestModel.js";
import User from "../models/userModel.js";
import { protect } from "../middleware/protectedjwt.js";
import { getPagination, pagedResponse } from "../utils/pagination.js";
import { withAvatarUrl } from "../utils/avatar.js";
import { getManilaDayRange } from "../utils/leaveAvailability.js";

const router = express.Router();

const allowedStatuses = ["Pending", "Approved", "Rejected", "Returned"];
const allowedLeaveTypes = ["Vacation Leave", "Sick Leave", "Emergency Leave", "Others"];

const getFullName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.companyName ||
  user?.email ||
  "Employee";

const getDepartment = (user, fallback = "") =>
  String(fallback || user?.companyName || user?.position || "Unassigned").trim() || "Unassigned";

const leaveRequestPopulate = [
  { path: "employee", select: "firstName lastName email position companyName role updatedAt" },
  { path: "reviewedBy", select: "firstName lastName email role updatedAt" },
  { path: "returnedBy", select: "firstName lastName email role updatedAt" },
  { path: "comments.author", select: "firstName lastName email role position companyName updatedAt" },
];

const withLeaveRequestAvatarUrls = (request) => ({
  ...request,
  employee: withAvatarUrl(request.employee),
  reviewedBy: withAvatarUrl(request.reviewedBy),
  returnedBy: withAvatarUrl(request.returnedBy),
  comments: Array.isArray(request.comments)
    ? request.comments.map((comment) => ({
        ...comment,
        author: withAvatarUrl(comment.author),
      }))
    : [],
});

const dayMs = 24 * 60 * 60 * 1000;

const startOfToday = () => {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
};

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

  if (req.query.role) {
    query.employeeRole = req.query.role;
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
  if (payload.startDate < startOfToday()) return "Start date cannot be in the past";
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

    const now = new Date();
    const todayRange = getManilaDayRange(now);
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [requests, total, metadata] = await Promise.all([
      LeaveRequest.find(query)
        .populate(leaveRequestPopulate)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .maxTimeMS(8000)
        .lean(),
      LeaveRequest.countDocuments(query).maxTimeMS(8000),
      LeaveRequest.aggregate([
        {
          $facet: {
            byStatus: [
              { $match: summaryQuery },
              { $group: { _id: "$status", count: { $sum: 1 } } },
            ],
            byType: [
              { $match: summaryQuery },
              { $group: { _id: "$leaveType", count: { $sum: 1 } } },
            ],
            onLeaveToday: [
              {
                $match: {
                  ...summaryQuery,
                  status: "Approved",
                  startDate: { $lt: todayRange.end },
                  endDate: { $gte: todayRange.start },
                },
              },
              { $count: "count" },
            ],
            approvedThisMonth: [
              {
                $match: {
                  ...summaryQuery,
                  status: { $in: ["Approved", "Returned"] },
                  reviewedAt: {
                    $gte: currentMonthStart,
                    $lt: nextMonthStart,
                  },
                },
              },
              { $count: "count" },
            ],
            leaveTypes: [
              { $match: baseQuery },
              { $group: { _id: "$leaveType" } },
              { $sort: { _id: 1 } },
            ],
            roles: [
              { $match: { ...baseQuery, employeeRole: { $nin: [null, ""] } } },
              { $group: { _id: "$employeeRole" } },
              { $sort: { _id: 1 } },
            ],
          },
        },
      ]).option({ maxTimeMS: 8000 }),
    ]);

    const summaryData = metadata[0] || {};
    const byStatus = Object.fromEntries(
      (summaryData.byStatus || []).map((item) => [item._id, item.count])
    );

    res.status(200).json({
      ...pagedResponse({
        data: requests.map(withLeaveRequestAvatarUrls),
        page,
        limit,
        total,
        key: "leaveRequests",
      }),
      roles: (summaryData.roles || []).map((item) => item._id),
      leaveTypes: (summaryData.leaveTypes || []).map((item) => item._id).filter(Boolean),
      summary: {
        pending: byStatus.Pending || 0,
        approved: byStatus.Approved || 0,
        rejected: byStatus.Rejected || 0,
        returned: byStatus.Returned || 0,
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
      .populate(leaveRequestPopulate)
      .lean();

    res.status(201).json(withLeaveRequestAvatarUrls(createdRequest));
  } catch (error) {
    console.error("Create leave request error:", error);
    res.status(500).json({ message: "Unable to create leave request" });
  }
});

router.patch("/:id/status", protect, async (req, res) => {
  try {
    const status = String(req.body.status || "");
    const comment = String(req.body.comment || "").trim();

    if (!["Approved", "Rejected", "Returned"].includes(status)) {
      return res.status(400).json({ message: "Status must be Approved, Rejected, or Returned" });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    const isAdmin = req.user.role === "admin";
    const isOwner = String(leaveRequest.employee) === String(req.user._id);
    const isEmployeeOwner = req.user.role === "employee" && isOwner;

    if (status === "Returned") {
      if (!isAdmin && !isEmployeeOwner) {
        return res.status(403).json({ message: "You cannot end this employee's leave" });
      }
      if (leaveRequest.status !== "Approved") {
        return res.status(400).json({ message: "Only an approved leave can be marked as returned" });
      }

      const todayRange = getManilaDayRange();
      const isCurrentlyOnLeave =
        leaveRequest.startDate < todayRange.end && leaveRequest.endDate >= todayRange.start;
      if (!isCurrentlyOnLeave) {
        return res.status(400).json({ message: "Only a currently active leave can be marked as returned" });
      }

      leaveRequest.status = "Returned";
      leaveRequest.returnedBy = req.user._id;
      leaveRequest.returnedAt = new Date();
    } else {
      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins can approve or reject leave requests" });
      }

      const canReviewPending = leaveRequest.status === "Pending";
      const canReactivateLeave = status === "Approved" && leaveRequest.status === "Returned";
      if (!canReviewPending && !canReactivateLeave) {
        return res.status(400).json({ message: "This leave status can no longer be changed that way" });
      }

      leaveRequest.status = status;
      leaveRequest.reviewedBy = req.user._id;
      leaveRequest.reviewedAt = new Date();
      if (canReactivateLeave) {
        leaveRequest.returnedBy = undefined;
        leaveRequest.returnedAt = undefined;
      }
    }
    if (comment) {
      leaveRequest.comments.push({
        author: req.user._id,
        text: comment,
      });
    }
    await leaveRequest.save();

    const updatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate(leaveRequestPopulate)
      .lean();

    res.status(200).json(withLeaveRequestAvatarUrls(updatedRequest));
  } catch (error) {
    console.error("Update leave request status error:", error);
    res.status(500).json({ message: "Unable to update leave request status" });
  }
});

router.post("/:id/comments", protect, async (req, res) => {
  try {
    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({ message: "Comment is required" });
    }

    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    const isOwner = String(leaveRequest.employee) === String(req.user._id);
    if (req.user.role !== "admin" && !isOwner) {
      return res.status(403).json({ message: "You cannot comment on this leave request" });
    }

    leaveRequest.comments.push({
      author: req.user._id,
      text,
    });
    await leaveRequest.save();

    const updatedRequest = await LeaveRequest.findById(leaveRequest._id)
      .populate(leaveRequestPopulate)
      .lean();

    res.status(201).json(withLeaveRequestAvatarUrls(updatedRequest));
  } catch (error) {
    console.error("Add leave request comment error:", error);
    res.status(500).json({ message: "Unable to add leave request comment" });
  }
});

export default router;
