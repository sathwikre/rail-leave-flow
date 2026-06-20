import { Router } from "express";
import {
  createEmployee,
  getEmployeeById,
  getEmployees,
  getEmployeesByStation,
  getEmployeeLeaves,
  updateEmployeeDesignation,
} from "../controllers/employeeController.js";

export const employeeRoutes = Router();

employeeRoutes.get("/", getEmployees);
employeeRoutes.post("/", createEmployee);
employeeRoutes.get("/station/:stationId", getEmployeesByStation);
employeeRoutes.put("/:employeeId/designation", updateEmployeeDesignation);
employeeRoutes.get("/:id", getEmployeeById);
employeeRoutes.get("/:id/leaves", getEmployeeLeaves);
