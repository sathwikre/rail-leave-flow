import { Router } from "express";
import {
  createEmployee,
  getEmployeeById,
  getEmployees,
  getEmployeesByStation,
  getEmployeeLeaves,
<<<<<<< HEAD
  getEmployeeRemarks,
  createEmployeeRemark,
=======
  updateEmployeeDetails,
>>>>>>> 593b618f7d8cffc6941e685de84f9ca432f347d0
  updateEmployeeDesignation,
} from "../controllers/employeeController.js";

export const employeeRoutes = Router();

employeeRoutes.get("/", getEmployees);
employeeRoutes.post("/", createEmployee);
employeeRoutes.get("/station/:stationId", getEmployeesByStation);
<<<<<<< HEAD
employeeRoutes.put("/:id/designation", updateEmployeeDesignation);
employeeRoutes.get("/:id/remarks", getEmployeeRemarks);
employeeRoutes.post("/:id/remarks", createEmployeeRemark);
=======
employeeRoutes.put("/:employeeId", updateEmployeeDetails);
employeeRoutes.put("/:employeeId/designation", updateEmployeeDesignation);
employeeRoutes.get("/:id", getEmployeeById);
>>>>>>> 593b618f7d8cffc6941e685de84f9ca432f347d0
employeeRoutes.get("/:id/leaves", getEmployeeLeaves);
employeeRoutes.get("/:id", getEmployeeById);
