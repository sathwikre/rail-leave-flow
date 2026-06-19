import { Router } from "express";
import { getEmployeeReport, getStationReport } from "../controllers/reportController.js";

export const reportRoutes = Router();

reportRoutes.get("/station", getStationReport);
reportRoutes.get("/employee", getEmployeeReport);
