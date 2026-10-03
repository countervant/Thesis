import test from "node:test";
import assert from "node:assert/strict";
import {
  hungarianAlgorithm,
  calculateSkillMatch,
  buildAllocationCostMatrix,
  getPriorityWeight,
} from "../services/taskAllocation.service.js";

test("Hungarian Algorithm - Solves standard square assignment with optimal minimum cost", () => {
  // Classic 3x3 assignment test
  // Expected minimum cost assignment: W0->T0 (10), W1->T1 (1), W2->T2 (9) => sum = 20
  const costMatrix = [
    [10, 19, 8],
    [10, 1, 12],
    [13, 16, 9],
  ];

  const result = hungarianAlgorithm(costMatrix);
  assert.equal(result.totalCost, 20);
  assert.deepEqual(result.assignment, [0, 1, 2]);
});

test("Hungarian Algorithm - Handles rectangular matrix with dummy padding", () => {
  // 2 real workers, 3 tasks.
  // Row 2 is dummy with high penalty (500)
  const costMatrix = [
    [10, 19, 8],
    [10, 1, 12],
    [500, 500, 500],
  ];

  const result = hungarianAlgorithm(costMatrix);
  // Real workers should take the cheapest available real tasks:
  // W0 takes T2 (cost 8), W1 takes T1 (cost 1), Dummy takes T0 (cost 500) => total 509
  assert.equal(result.totalCost, 509);
  assert.equal(result.assignment[0], 2);
  assert.equal(result.assignment[1], 1);
  assert.equal(result.assignment[2], 0);
});

test("calculateSkillMatch - Accurately computes exact, partial and role synergy matches", () => {
  const employee = {
    position: "Senior UI/UX Designer",
    skillGroups: {
      technical: ["Figma", "Design Systems", "Prototyping"],
      soft: ["Communication"],
      other: [],
    },
  };

  // Case 1: 100% skill match + synergy
  const res1 = calculateSkillMatch(["Figma", "Design Systems"], employee, "Design Systems Spec");
  assert.ok(res1.score >= 0.9, "Score should be >= 0.9 for full match");
  assert.equal(res1.matchedSkills.length, 2);
  assert.equal(res1.missingSkills.length, 0);

  // Case 2: Partial match
  const res2 = calculateSkillMatch(["Figma", "React", "Node.js"], employee, "Full Stack Feature");
  assert.ok(res2.score > 0.3 && res2.score < 0.6, "Partial match should reflect 1 of 3 skills");
  assert.equal(res2.matchedSkills.length, 1);
  assert.equal(res2.missingSkills.length, 2);

  // Case 3: No required skills specified (uses position relevance)
  const res3 = calculateSkillMatch([], employee, "UI Redesign Mockup");
  assert.ok(res3.score >= 0.5, "Should return baseline or role synergy when no skills are specified");
});

test("getPriorityWeight - Correctly weights priority levels", () => {
  assert.equal(getPriorityWeight("Urgent"), 1.0);
  assert.equal(getPriorityWeight("High"), 0.8);
  assert.equal(getPriorityWeight("Medium"), 0.5);
  assert.equal(getPriorityWeight("Low"), 0.2);
});

test("buildAllocationCostMatrix - Creates balanced cost matrix with slot expansion", () => {
  const employees = [
    {
      _id: "emp1",
      firstName: "Alice",
      position: "UI Designer",
      skillGroups: { technical: ["Figma"] },
      currentActiveTasks: 1,
    },
    {
      _id: "emp2",
      firstName: "Bob",
      position: "Frontend Dev",
      skillGroups: { technical: ["React"] },
      currentActiveTasks: 0,
    },
  ];

  const tasks = [
    { _id: "t1", title: "Landing Page Figma", requiredSkills: ["Figma"], priority: "High" },
    { _id: "t2", title: "React Component", requiredSkills: ["React"], priority: "Medium" },
    { _id: "t3", title: "Mobile Wireframes", requiredSkills: ["Figma"], priority: "Low" },
  ];

  const { costMatrix, slots, paddedSize } = buildAllocationCostMatrix(employees, tasks);

  assert.ok(paddedSize >= tasks.length, "Matrix should be at least size of tasks");
  assert.equal(costMatrix.length, paddedSize);
  assert.equal(costMatrix[0].length, paddedSize);
  assert.ok(slots.length >= 2, "Slots should be created for employees");
});
