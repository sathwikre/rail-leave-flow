import { Router } from "express";
import {
  createEmployee,
  getEmployeeById,
  getEmployees,
  getEmployeesByStation,
  getEmployeeLeaves,
} from "../controllers/employeeController.js";

export const employeeRoutes = Router();

employeeRoutes.get("/", getEmployees);
employeeRoutes.post("/", createEmployee);
employeeRoutes.get("/station/:stationId", getEmployeesByStation);
employeeRoutes.get("/:id", getEmployeeById);
employeeRoutes.get("/:id/leaves", getEmployeeLeaves);
