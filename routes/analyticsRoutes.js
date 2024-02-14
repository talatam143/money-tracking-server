import express from "express";
import {
  chartAnalytics,
  transactionsAnalytics,
} from "../Controllers/analyticsController.js";
import { authentication } from "../Controllers/Authentication.js";

const analyticsRoutes = express.Router();

analyticsRoutes.get("/transactions", authentication, transactionsAnalytics);
analyticsRoutes.get("/charts", authentication, chartAnalytics);

export default analyticsRoutes;
