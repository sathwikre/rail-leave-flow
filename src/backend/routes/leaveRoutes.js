import { Router } from "express";

import {
  approveLeave,
  createLeave,
  getLeaves,
  getLeaveById,
  getLeaveAnalysis,
  rejectLeave
} from "../controllers/leaveController.js";
export const leaveRoutes = Router();

leaveRoutes.get("/", getLeaves);
leaveRoutes.get("/:id", getLeaveById);
leaveRoutes.get("/:id/analysis", getLeaveAnalysis);
leaveRoutes.post("/", createLeave);
leaveRoutes.patch("/:id/approve", approveLeave);
leaveRoutes.patch("/:id/reject", rejectLeave);
