import { Router } from "express";
import { getStationById, getStations } from "../controllers/stationController.js";

export const stationRoutes = Router();

stationRoutes.get("/", getStations);
stationRoutes.get("/:id", getStationById);
