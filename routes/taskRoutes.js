const express = require ('express');
const taskController = require("../controllers/taskController");

const router = express.Router();

router.post("/", taskController.create);
router.get("/", taskController.index);
router.get("/:id", taskController.show);
router.post("/bulk", taskController.bulkCreate);
router.patch("/:id", taskController.update);
router.delete("/:id", taskController.deleteTask);

module.exports = router;