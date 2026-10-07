/**
 * taskAllocation.service.js
 * 
 * Hungarian Task Allocation Optimizer for CLIENTRA.
 * Uses the Kuhn-Munkres (Hungarian) combinatorial optimization algorithm (O(n^3))
 * to find the mathematically optimal, minimum-cost bipartite match between
 * unassigned project backlog tasks and active agency employees.
 * 
 * Factors:
 * 1. Skill Match Score (requiredSkills vs technical/soft skills & position).
 * 2. Workload Penalty (real-time active tasks in progress/to do).
 * 3. Priority Affinity (Urgent/High priority favor top skill fitness).
 * 4. Multi-slot capacity expansion for load-balanced distribution.
 */

import mongoose from "mongoose";
import { Project, ProjectTask } from "../models/projectModel.js";
import Task from "../models/Admin/taskmodel.js";
import User from "../models/userModel.js";

/**
 * Pure JavaScript implementation of the Kuhn-Munkres (Hungarian) Algorithm.
 * Solves the minimum weight bipartite matching problem in O(n^3) time.
 * 
 * @param {Array<Array<number>>} costMatrix - Square n x n matrix of non-negative costs.
 * @returns {{ assignment: Array<number>, totalCost: number }}
 *   assignment[i] = column assigned to row i.
 */
export const hungarianAlgorithm = (costMatrix) => {
  const n = Array.isArray(costMatrix) ? costMatrix.length : 0;
  if (n === 0) return { assignment: [], totalCost: 0 };

  const u = new Array(n + 1).fill(0);
  const v = new Array(n + 1).fill(0);
  const p = new Array(n + 1).fill(0);
  const way = new Array(n + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(Infinity);
    const used = new Array(n + 1).fill(false);

    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = Infinity;
      let j1 = 0;

      for (let j = 1; j <= n; j++) {
        if (!used[j]) {
          const cur = costMatrix[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minv[j]) {
            minv[j] = cur;
            way[j] = j0;
          }
          if (minv[j] < delta) {
            delta = minv[j];
            j1 = j;
          }
        }
      }

      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }

      j0 = j1;
    } while (p[j0] !== 0);

    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  const assignment = new Array(n);
  for (let j = 1; j <= n; j++) {
    if (p[j] > 0) {
      assignment[p[j] - 1] = j - 1;
    }
  }

  let totalCost = 0;
  for (let i = 0; i < n; i++) {
    if (assignment[i] !== undefined && assignment[i] < costMatrix[i].length) {
      totalCost += costMatrix[i][assignment[i]];
    }
  }

  return { assignment, totalCost };
};

/**
 * Normalizes a skill or title string for robust matching.
 */
const normalizeStr = (str) =>
  String(str || "")
    .toLowerCase()
    .trim()
    .replace(/[._\-/\\]+/g, " ")
    .replace(/\s+/g, " ");

const SKILL_KEYWORDS_MAP = [
  { match: /\b(?:ui|ux|figma|wireframe|prototype|landing page|mockup|interface)\b/i, skills: ["UI/UX", "Figma"] },
  { match: /\b(?:ai image|prompt|midjourney|photoshop|illustration|graphic|banner|ad)\b/i, skills: ["AI Image", "Graphic Design", "Photoshop"] },
  { match: /\b(?:ai video|video|edit|ugc|reels|tiktok|premiere|after effects|capcut)\b/i, skills: ["Video Editing", "UGC Video"] },
  { match: /\b(?:react|frontend|javascript|node|backend|api|css|html|fullstack|code)\b/i, skills: ["Frontend", "React", "JavaScript"] },
  { match: /\b(?:script|copy|content|blog|write|article)\b/i, skills: ["Scriptwriting", "Copywriting"] },
];

/**
 * Infers required skills from task title, description, and subtasks when not explicitly set.
 */
export const extractInferredSkills = (task = {}) => {
  if (Array.isArray(task.requiredSkills) && task.requiredSkills.length > 0) {
    return task.requiredSkills;
  }

  const textToScan = [
    task.title || "",
    task.description || "",
    ...(Array.isArray(task.subtasks)
      ? task.subtasks.map((st) => (typeof st === "string" ? st : st?.title || ""))
      : []),
  ].join(" ");

  const inferred = new Set();
  SKILL_KEYWORDS_MAP.forEach(({ match, skills }) => {
    if (match.test(textToScan)) {
      skills.forEach((s) => inferred.add(s));
    }
  });

  if (inferred.size === 0) {
    const cleanTitle = String(task.title || "").trim();
    if (cleanTitle && cleanTitle.length < 30) {
      inferred.add(cleanTitle);
    } else {
      inferred.add("Production Support");
    }
  }

  return Array.from(inferred);
};

/**
 * Calculates Skill Match Score between task requirements and employee skill profile.
 * 
 * @param {Array<string>} requiredSkills - Skills specified on the task.
 * @param {Object} employee - Employee document with skillGroups & position.
 * @param {string} taskTitle - Title of the task for contextual keyword synergy.
 * @returns {{ score: number, matchedSkills: Array<string>, missingSkills: Array<string> }}
 */
export const calculateSkillMatch = (requiredSkills = [], employee = {}, taskTitle = "") => {
  const normRequired = (Array.isArray(requiredSkills) ? requiredSkills : [])
    .map(normalizeStr)
    .filter(Boolean);

  const empSkills = new Set();
  const tech = employee?.skillGroups?.technical || [];
  const soft = employee?.skillGroups?.soft || [];
  const other = employee?.skillGroups?.other || [];
  [...tech, ...soft, ...other].forEach((s) => {
    const norm = normalizeStr(s);
    if (norm) empSkills.add(norm);
  });

  const positionNorm = normalizeStr(employee?.position || "");
  const titleNorm = normalizeStr(taskTitle || "");

  // If no required skills were specified on the task, evaluate position relevance
  if (normRequired.length === 0) {
    let fallbackScore = 0.5; // neutral baseline
    if (positionNorm && titleNorm) {
      const posWords = positionNorm.split(" ").filter((w) => w.length > 2);
      const hasWordMatch = posWords.some((w) => titleNorm.includes(w));
      if (hasWordMatch) fallbackScore = 0.75;
    }
    return {
      score: fallbackScore,
      matchedSkills: [],
      missingSkills: [],
    };
  }

  const matchedSkills = [];
  const missingSkills = [];

const isSkillMatch = (skillA, skillB) => {
  if (!skillA || !skillB) return false;
  if (skillA === skillB) return true;
  // If either string is 3 characters or fewer (e.g., "ai", "ui", "ux", "ad"), require exact match or word boundary
  if (skillA.length <= 3 || skillB.length <= 3) {
    const escapedA = skillA.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedB = skillB.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regexA = new RegExp(`(?:^|\\s)${escapedA}(?:$|\\s)`, "i");
    const regexB = new RegExp(`(?:^|\\s)${escapedB}(?:$|\\s)`, "i");
    return regexA.test(skillB) || regexB.test(skillA);
  }
  return skillA.includes(skillB) || skillB.includes(skillA);
};

  normRequired.forEach((req) => {
    let matched = false;
    // 1. Exact or bounded word match in employee skills set
    for (const skill of empSkills) {
      if (isSkillMatch(skill, req)) {
        matched = true;
        break;
      }
    }
    // 2. Position match (e.g. "Designer" matches "UI/UX" or "Design")
    if (!matched && positionNorm && isSkillMatch(positionNorm, req)) {
      matched = true;
    }

    if (matched) {
      matchedSkills.push(req);
    } else {
      missingSkills.push(req);
    }
  });

  const coverage = matchedSkills.length / normRequired.length;

  // Synergy bonus: If employee position matches task title or has 100% skill coverage
  let synergyBonus = 0;
  if (coverage === 1.0) synergyBonus += 0.1;
  if (positionNorm && titleNorm) {
    const posTokens = positionNorm.split(" ").filter((w) => w.length > 2);
    if (posTokens.some((t) => titleNorm.includes(t))) {
      synergyBonus += 0.05;
    }
  }

  const score = Math.min(1.0, Math.max(0.05, coverage + synergyBonus));
  return { score, matchedSkills, missingSkills };
};

/**
 * Calculates priority weight factor.
 */
export const getPriorityWeight = (priority) => {
  const norm = String(priority || "").toLowerCase();
  switch (norm) {
    case "urgent":
      return 1.0;
    case "high":
      return 0.8;
    case "medium":
      return 0.5;
    case "low":
    default:
      return 0.2;
  }
};

/**
 * Builds the cost matrix with multi-slot employee expansion and dummy node padding.
 */
export const buildAllocationCostMatrix = (employees, tasks, options = {}) => {
  const {
    maxTasksPerEmployee = 3,
    weightSkill = 0.55,
    weightPriority = 0.25,
    weightWorkload = 0.20,
    maxWorkloadCapacity = 5,
  } = options;

  const mTasks = tasks.length;
  if (mTasks === 0 || employees.length === 0) {
    return {
      costMatrix: [],
      slots: [],
      tasks: [],
      paddedSize: 0,
    };
  }

  // 1. Expand employee capacity into multiple slot candidates
  // Dynamic slot count ensures every task has potential matching slots
  const targetSlotsPerEmp = Math.max(
    1,
    Math.min(maxTasksPerEmployee, Math.ceil(mTasks / employees.length) + 1)
  );

  const slots = [];
  employees.forEach((emp) => {
    const baseLoad = emp.currentActiveTasks || 0;
    for (let s = 0; s < targetSlotsPerEmp; s++) {
      slots.push({
        employee: emp,
        slotIndex: s,
        simulatedLoad: baseLoad + s,
      });
    }
  });

  const nSlots = slots.length;
  const K = Math.max(nSlots, mTasks); // Dimension to make square K x K
  const DUMMY_COST = 99999;

  // 2. Initialize K x K cost matrix
  const costMatrix = Array.from({ length: K }, () => new Array(K).fill(0));
  const detailMatrix = Array.from({ length: K }, () => new Array(K).fill(null));

  for (let i = 0; i < K; i++) {
    for (let j = 0; j < K; j++) {
      const isRealSlot = i < nSlots;
      const isRealTask = j < mTasks;

      if (isRealSlot && isRealTask) {
        const slot = slots[i];
        const emp = slot.employee;
        const task = tasks[j];

        // A. Skill Match
        const skillResult = calculateSkillMatch(
          task.requiredSkills,
          emp,
          task.title
        );

        // B. Workload Penalty
        const workloadPenalty = Math.min(
          1.0,
          slot.simulatedLoad / maxWorkloadCapacity
        );

        // C. Priority Affinity
        const priorityWeight = getPriorityWeight(task.priority);
        const priorityFit = priorityWeight * skillResult.score;

        // D. Composite Fitness (Higher = Better)
        const fitness =
          weightSkill * skillResult.score +
          weightPriority * priorityFit -
          weightWorkload * workloadPenalty;

        // E. Hungarian Minimization Cost = (MaxFitness - Fitness) * 1000
        // Max theoretical fitness with weights is 0.55*1 + 0.25*1 - 0.20*0 = 0.80.
        // We use 1.0 as the upper bound so (1.0 - fitness) is strictly non-negative.
        const cost = Math.max(0, Math.round((1.0 - fitness) * 1000));

        costMatrix[i][j] = cost;
        detailMatrix[i][j] = {
          skillScore: skillResult.score,
          matchedSkills: skillResult.matchedSkills,
          missingSkills: skillResult.missingSkills,
          workloadPenalty,
          priorityFit,
          fitness,
          cost,
          simulatedLoad: slot.simulatedLoad,
        };
      } else if (!isRealSlot && isRealTask) {
        // Dummy employee slot assigned to real task (High penalty so real workers are picked first)
        costMatrix[i][j] = DUMMY_COST;
        detailMatrix[i][j] = { dummyEmployee: true, cost: DUMMY_COST };
      } else if (isRealSlot && !isRealTask) {
        // Real employee slot assigned to dummy task (Cost = 0: idle capacity carries zero penalty)
        costMatrix[i][j] = 0;
        detailMatrix[i][j] = { dummyTask: true, cost: 0 };
      } else {
        // Dummy employee to dummy task
        costMatrix[i][j] = 0;
        detailMatrix[i][j] = { dummyBoth: true, cost: 0 };
      }
    }
  }

  return {
    costMatrix,
    detailMatrix,
    slots,
    tasks,
    paddedSize: K,
  };
};

const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];
const EMPLOYEE_SELECT = "_id firstName lastName email position avatar skillGroups role isActive";

/**
 * Normalizes any priority string to Title Case ("Low" | "Medium" | "High" | "Urgent").
 */
export const normalizePriority = (priority) => {
  const lower = String(priority || "").toLowerCase();
  if (!VALID_PRIORITIES.includes(lower)) return "Medium";
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const hasValue = (value) => Boolean(value && String(value).trim());

/**
 * True when a board Task has no project-level or subtask-level assignee.
 */
export const isTaskUnassigned = (task) =>
  !hasValue(task?.assignedTo) &&
  !(Array.isArray(task?.assignees) && task.assignees.some(hasValue)) &&
  !(Array.isArray(task?.subtasks) && task.subtasks.some((s) => hasValue(s?.assignedTo)));

/**
 * Fetches active, non-archived board Tasks that have nobody assigned.
 * Shared by the optimizer and the backlog summary endpoint.
 */
export const findUnassignedBoardTasks = async (select = "_id title description priority status subtasks assignedTo assignees") => {
  const activeTasks = await Task.find({
    status: { $ne: "done" },
    archivedAt: { $exists: false },
  })
    .select(select)
    .lean();
  return activeTasks.filter(isTaskUnassigned);
};

/**
 * Optimizes task allocation for a project using the Hungarian algorithm.
 * 
 * @param {string|mongoose.Types.ObjectId} projectId - Project ID.
 * @param {Array<Object>} [customTasks] - Optional backlog tasks override for preview.
 * @param {Object} [options] - Solver options.
 * @returns {Promise<Object>} Allocation optimization result.
 */
export const optimizeTaskAllocation = async (projectId, customTasks = null, options = {}) => {
  const startTime = Date.now();

  let targetProject = null;
  if (projectId && mongoose.Types.ObjectId.isValid(projectId)) {
    targetProject = await Project.findById(projectId).lean();
  }

  const withSkillsAndPriority = (t) => ({
    ...t,
    requiredSkills: extractInferredSkills(t),
    priority: normalizePriority(t.priority),
  });

  // 1. Fetch unassigned backlog tasks
  let tasks = [];
  if (Array.isArray(customTasks) && customTasks.length > 0) {
    tasks = customTasks.map((t, idx) => ({
      _id: t._id || t.id || `custom-task-${idx}`,
      title: String(t.title || "Untitled Task").trim(),
      description: String(t.description || "").trim(),
      requiredSkills: extractInferredSkills(t),
      priority: normalizePriority(t.priority),
      status: t.status || t.apiStatus || "pending",
      assignedTo: t.assignedTo || null,
      subtasks: t.subtasks || [],
    }));
  } else if (targetProject) {
    tasks = (
      await ProjectTask.find({
        project: targetProject._id,
        $or: [{ status: "Backlog" }, { assignedTo: null }],
      }).lean()
    ).map(withSkillsAndPriority);
  } else {
    // Global fallback: unassigned tasks across both Task and ProjectTask
    const [unassignedBoardTasks, unassignedProjectTasks] = await Promise.all([
      findUnassignedBoardTasks(),
      ProjectTask.find({
        $or: [{ status: "Backlog" }, { assignedTo: null }, { assignedTo: { $exists: false } }],
      }).lean(),
    ]);

    const seenIds = new Set(unassignedBoardTasks.map((t) => String(t._id)));
    tasks = [
      ...unassignedBoardTasks.map(withSkillsAndPriority),
      ...unassignedProjectTasks
        .filter((t) => !seenIds.has(String(t._id)))
        .map(withSkillsAndPriority),
    ];
  }

  if (!tasks || tasks.length === 0) {
    return {
      success: true,
      project: targetProject,
      matches: [],
      unassignedTasks: [],
      availableEmployees: [],
      metrics: {
        totalTasks: 0,
        assignedTasks: 0,
        unassignedTasksCount: 0,
        averageFitScore: 0,
        executionTimeMs: Date.now() - startTime,
      },
      message: "No unassigned backlog tasks found to allocate.",
    };
  }

  // 2. Fetch active agency employees (fall back to admins if no employees exist)
  const findActiveStaff = (roles) =>
    User.find({ role: { $in: roles }, isActive: { $ne: false } })
      .select(EMPLOYEE_SELECT)
      .lean();

  let rawEmployees = await findActiveStaff(["employee"]);
  if (rawEmployees.length === 0) {
    rawEmployees = await findActiveStaff(["employee", "admin"]);
  }

  if (rawEmployees.length === 0) {
    throw new Error(
      "No active employees or team members found in the agency to allocate tasks to."
    );
  }

  // 3. Compute real-time active task workload for each employee across both collections
  const employeeIds = rawEmployees.map((e) => e._id);
  const [projectTaskCounts, adminTaskCounts] = await Promise.all([
    ProjectTask.aggregate([
      {
        $match: {
          assignedTo: { $in: employeeIds },
          status: { $in: ["To Do", "In Progress", "In Review"] },
        },
      },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
    ]),
    Task.aggregate([
      {
        $match: {
          $or: [
            { assignedTo: { $in: employeeIds } },
            { assignees: { $in: employeeIds } },
          ],
          status: { $in: ["in_progress", "pending", "review"] },
          archivedAt: { $exists: false },
        },
      },
      {
        $group: {
          _id: { $ifNull: ["$assignedTo", { $arrayElemAt: ["$assignees", 0] }] },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const workloadMap = new Map();
  [...projectTaskCounts, ...adminTaskCounts].forEach((w) => {
    if (!w?._id) return;
    const key = String(w._id);
    workloadMap.set(key, (workloadMap.get(key) || 0) + w.count);
  });

  const employees = rawEmployees.map((e) => ({
    ...e,
    currentActiveTasks: workloadMap.get(String(e._id)) || 0,
  }));

  // 4. Construct Bipartite Cost Matrix
  const { costMatrix, detailMatrix, slots, paddedSize } =
    buildAllocationCostMatrix(employees, tasks, options);

  // 5. Execute Hungarian Algorithm
  const { assignment, totalCost } = hungarianAlgorithm(costMatrix);

  // 6. Synthesize Results
  const matches = [];
  const assignedTaskIds = new Set();
  const employeeTaskCounts = new Map();

  for (let i = 0; i < slots.length; i++) {
    const taskCol = assignment[i];
    if (taskCol !== undefined && taskCol < tasks.length) {
      const matchedTask = tasks[taskCol];
      const slot = slots[i];
      const emp = slot.employee;
      const details = detailMatrix[i][taskCol];

      // Calculate transparent fit score (0-100%)
      // High fitness (e.g. 0.70+) translates to 90-100%, minimum baseline is 20%
      const rawFit = Math.min(1.0, Math.max(0.1, (details?.fitness || 0) + 0.35));
      const fitPercentage = Math.round(rawFit * 100);

      const matchReasons = [];
      if (details?.matchedSkills?.length > 0) {
        matchReasons.push(
          `Matches required skills: ${details.matchedSkills.join(", ")}`
        );
      }
      if (emp.position) {
        matchReasons.push(`Role synergy: ${emp.position}`);
      }
      if (slot.simulatedLoad <= 1) {
        matchReasons.push("Low current workload (available capacity)");
      } else {
        matchReasons.push(`Current active tasks: ${slot.simulatedLoad}`);
      }
      if (matchedTask.priority === "Urgent" || matchedTask.priority === "High") {
        matchReasons.push(`Prioritized for ${matchedTask.priority} urgency`);
      }

      matches.push({
        task: matchedTask,
        assignedEmployee: {
          _id: emp._id,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: emp.email,
          position: emp.position || "Team Member",
          avatar: emp.avatar || "",
          currentActiveTasks: slot.simulatedLoad,
          skillGroups: emp.skillGroups || { technical: [] },
        },
        fitScore: fitPercentage,
        matchedSkills: details?.matchedSkills || [],
        missingSkills: details?.missingSkills || [],
        matchReasons,
        cost: details?.cost || 0,
        slotIndex: slot.slotIndex,
      });

      assignedTaskIds.add(String(matchedTask._id));
      const currentAssigned = employeeTaskCounts.get(String(emp._id)) || 0;
      employeeTaskCounts.set(String(emp._id), currentAssigned + 1);
    }
  }

  // 7. Collect Unassigned Tasks (if tasks exceeded capacity or could not match)
  const unassignedTasks = tasks.filter((t) => !assignedTaskIds.has(String(t._id)));

  // 8. Available employees with remaining capacity
  const availableEmployees = employees.map((emp) => ({
    _id: emp._id,
    firstName: emp.firstName,
    lastName: emp.lastName,
    position: emp.position,
    allocatedInThisRun: employeeTaskCounts.get(String(emp._id)) || 0,
    totalActiveTasks:
      emp.currentActiveTasks + (employeeTaskCounts.get(String(emp._id)) || 0),
  }));

  // Sort matches by priority (Urgent first, then High, etc.)
  const priorityOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
  matches.sort(
    (a, b) =>
      (priorityOrder[a.task.priority] ?? 2) -
      (priorityOrder[b.task.priority] ?? 2)
  );

  const avgFitScore =
    matches.length > 0
      ? Math.round(
          matches.reduce((sum, m) => sum + m.fitScore, 0) / matches.length
        )
      : 0;

  return {
    success: true,
    project: targetProject,
    matches,
    unassignedTasks,
    availableEmployees,
    metrics: {
      totalTasks: tasks.length,
      assignedTasks: matches.length,
      unassignedTasksCount: unassignedTasks.length,
      averageFitScore: avgFitScore,
      totalOptimizationCost: totalCost,
      matrixDimensions: `${paddedSize}x${paddedSize}`,
      executionTimeMs: Date.now() - startTime,
    },
  };
};

/**
 * Commits task allocation assignments to MongoDB.
 * Updates ProjectTask.assignedTo and transitions status to 'To Do'.
 * 
 * @param {string|mongoose.Types.ObjectId} projectId - Project ID.
 * @param {Array<{ taskId: string, employeeId: string }>} assignments - Array of assignments.
 * @param {string} [updatedStatus='To Do'] - Status to transition tasks to.
 * @returns {Promise<Object>} Commit summary.
 */
export const commitTaskAllocation = async (
  projectId,
  assignments = [],
  updatedStatus = "To Do",
  actingUser = null
) => {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    throw new Error("No assignments provided to commit.");
  }

  const validStatuses = ["Backlog", "To Do", "In Progress", "In Review", "Completed", "in_progress", "pending"];
  const finalStatus = validStatuses.includes(updatedStatus) ? updatedStatus : "To Do";

  const validAssignments = assignments.filter((a) => a?.taskId && a?.employeeId);
  if (validAssignments.length === 0) {
    throw new Error("No valid task-to-employee pairs found in assignments payload.");
  }

  const validAdminOps = [];
  const validProjectOps = [];

  const adminTaskStatus = ["pending", "in_progress"].includes(updatedStatus)
    ? updatedStatus
    : "in_progress";

  const actorId = actingUser?._id && mongoose.Types.ObjectId.isValid(actingUser._id)
    ? new mongoose.Types.ObjectId(actingUser._id)
    : null;

  const actorName = actingUser
    ? [actingUser.firstName, actingUser.lastName].filter(Boolean).join(" ").trim() ||
      actingUser.companyName ||
      actingUser.email ||
      "Administrator"
    : "Administrator";

  for (const a of validAssignments) {
    if (!mongoose.Types.ObjectId.isValid(a.taskId) || !mongoose.Types.ObjectId.isValid(a.employeeId)) {
      continue;
    }
    const tId = new mongoose.Types.ObjectId(a.taskId);
    const eId = new mongoose.Types.ObjectId(a.employeeId);

    validAdminOps.push({
      updateOne: {
        filter: { _id: tId },
        update: {
          $set: {
            assignedTo: eId,
            assignees: [eId],
            status: adminTaskStatus,
          },
          $push: {
            activities: {
              type: "task_created",
              title: "Task Assigned",
              details: "Assigned via Hungarian Task Allocation Optimizer",
              actor: actorId || eId,
              actorName,
              createdAt: new Date(),
            },
          },
        },
      },
    });

    validProjectOps.push({
      updateOne: {
        filter: { _id: tId },
        update: {
          $set: {
            assignedTo: eId,
            status: finalStatus,
          },
        },
      },
    });
  }

  if (validAdminOps.length === 0) {
    throw new Error("No valid task or employee IDs found in assignments payload.");
  }

  // A task id lives in exactly one collection, so each op only matches there.
  const safeBulkWrite = async (model, ops, label) => {
    try {
      const res = await model.bulkWrite(ops, { ordered: false });
      return res.modifiedCount || 0;
    } catch (err) {
      console.error(`[commitTaskAllocation] ${label} bulkWrite failed:`, err.message);
      return 0;
    }
  };

  const [boardModified, projectModified] = await Promise.all([
    safeBulkWrite(Task, validAdminOps, "Task"),
    safeBulkWrite(ProjectTask, validProjectOps, "ProjectTask"),
  ]);
  const modifiedCount = boardModified + projectModified;

  if (modifiedCount === 0) {
    const error = new Error("No tasks were updated. They may have been assigned or removed already.");
    error.status = 409;
    throw error;
  }

  return {
    success: true,
    modifiedCount,
    message: `Successfully assigned ${modifiedCount} task(s).`,
  };
};

export default {
  hungarianAlgorithm,
  calculateSkillMatch,
  buildAllocationCostMatrix,
  optimizeTaskAllocation,
  commitTaskAllocation,
};
