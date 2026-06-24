import { Router } from "express";
import {
  createEmployee,
  getEmployeeById,
  getEmployees,
  getEmployeesByStation,
  getEmployeeLeaves,
  getEmployeeRemarks,
  createEmployeeRemark,
  updateEmployeeDesignation,
} from "../controllers/employeeController.js";

export const employeeRoutes = Router();

employeeRoutes.get("/", getEmployees);
employeeRoutes.post("/", createEmployee);
employeeRoutes.get("/station/:stationId", getEmployeesByStation);
employeeRoutes.put("/:id/designation", updateEmployeeDesignation);
employeeRoutes.get("/:id/remarks", getEmployeeRemarks);
employeeRoutes.post("/:id/remarks", createEmployeeRemark);
employeeRoutes.get("/:id/leaves", getEmployeeLeaves);
employeeRoutes.get("/:id", getEmployeeById);
