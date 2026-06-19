import { Router } from "express";
import { getEmployeeReport, getStationReport, getStationById } from "../controllers/reportController.js";

export const reportRoutes = Router();

reportRoutes.get("/station", getStationReport);
reportRoutes.get("/station/:id", getStationById);
reportRoutes.get("/employee", getEmployeeReport);
