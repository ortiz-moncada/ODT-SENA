import express from "express";
import {getTasks,getTasksByWorker,postTasks,putTasks,entregarTarea,getMonthlyTasks} from "../controllers/tasks.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/create", postTasks);
router.get("/seeTasks", getTasks);
router.get("/byWorker/:worker", getTasksByWorker); 
router.put("/:id",verifyToken, putTasks);
router.post("/entregar/:id", verifyToken, entregarTarea);
router.get("/monthly", getMonthlyTasks);

export default router;