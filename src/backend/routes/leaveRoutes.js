import { Router } from "express";
import { approveLeave, createLeave, getLeaves, rejectLeave } from "../controllers/leaveController.js";

export const leaveRoutes = Router();

leaveRoutes.get("/", getLeaves);
leaveRoutes.post("/", createLeave);
leaveRoutes.patch("/:id/approve", approveLeave);
leaveRoutes.patch("/:id/reject", rejectLeave);
