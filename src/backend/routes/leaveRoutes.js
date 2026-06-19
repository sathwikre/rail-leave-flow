import { Router } from "express";

import {
  approveLeave,
  createLeave,
  getLeaves,
  getLeaveById,
  rejectLeave
} from "../controllers/leaveController.js";
export const leaveRoutes = Router();

leaveRoutes.get("/", getLeaves);
leaveRoutes.get("/:id", getLeaveById);
leaveRoutes.post("/", createLeave);
leaveRoutes.patch("/:id/approve", approveLeave);
leaveRoutes.patch("/:id/reject", rejectLeave);
