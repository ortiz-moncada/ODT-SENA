import express from "express";
import {getTasks,getTasksByWorker,postTasks,putTasks,entregarTarea,getMonthlyTasks} from "../controllers/tasks.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/create",verifyToken, postTasks);
router.get("/monthly", getMonthlyTasks); 
router.get("/seeTasks", verifyToken, getTasks);
router.get("/byWorker/:worker", verifyToken, getTasksByWorker); 
router.put("/:id", verifyToken, putTasks);
router.post("/entregar/:id", verifyToken, entregarTarea);

export default router;