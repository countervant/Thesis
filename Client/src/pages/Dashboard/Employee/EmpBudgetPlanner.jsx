import Budget from "../Admin/Budget.jsx";
import { budgetPlannerAPI } from "../../../services/api.js";

const EmpBudgetPlanner = (props) => (
  <Budget {...props} dataAPI={budgetPlannerAPI} />
);

export default EmpBudgetPlanner;
