const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const pool = require ("../db/pg-pool");

async function create(req, res) {
  //checks authentication
  if (!global.user_id) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
  if (!req.body) req.body = {};

  //validate req.body and validation error
  const { error, value } = taskSchema.validate(req.body);

  if (error) return res.status(400).json({message: error.message});

  //create and store task
  const result = await pool.query(
    `INSERT INTO tasks (title, is_completed, user_id)
    VALUES ($1, $2, $3) RETURNING id, title, is_completed`,
    [value.title, value.isCompleted, global.user_id]);
  
  const task = result.rows[0];

  //send the response
  res.status(201).json(task);
}

async function index(req, res) {
  //checks authentication
  if (!global.user_id) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  const result = await pool.query("SELECT id, title, is_completed FROM tasks WHERE user_id = $1",
    [global.user_id]
  )

  const tasks = result.rows;

  if (tasks.length === 0) {
    return res.status(404).json({
      message: "Task not found",
    });
  }
  //returns the task array with status 200
  res.status(200).json(tasks);
}

async function show(req, res) {
  //checks authentication
  if (!global.user_id) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  //validates Id
  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  //finds the task belonging to the logged in user
  const result = await pool.query(
    "SELECT id, title, is_completed FROM  tasks WHERE id = $1 AND user_id = $2",
    [taskId, global.user_id]
  );

  const task = result.rows[0];

  //handles missing task
  if (!task) {
    return res.status(404).json({
      message: "Task not found",
    });
  }

  res.status(200).json(task)
}

async function update(req, res) {
  //checks authentication
  if (!global.user_id) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  //validates Id
  const { error, value } = patchTaskSchema.validate(req.body);
  if (error) return res.status(400).json({message: error.message});

  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

//finds the task belonging to the logged in user and which fields the user is allowed to update
  let keys = Object.keys(value);
  keys = keys.map((key) => key === "isCompleted" ? "is_completed" : key);
  const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
  const idParm = `$${keys.length + 1}`;
  const userParm = `$${keys.length + 2}`;
  const result = await pool.query(`UPDATE tasks SET ${setClauses}
        WHERE id = ${idParm} AND user_id = ${userParm} RETURNING id, title, is_completed`,
      [...Object.values(value), taskId, global.user_id]);

  const updatedTask = result.rows[0];

  //handles missing task
  if (!updatedTask) {
    return res.status(404).json({
      message: "Task not found",
    });
  }

  return res.status(200).json(updatedTask); //return the  updatedTask with status 200
}

async function deleteTask(req, res) {
    //checks authentication
  if (!global.user_id) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  //validates id
  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  //find the task belonging to the logged in user and also remove task from deletedTask
  const result = await pool.query(` DELETE FROM tasks
  WHERE id = $1 AND user_id = $2  RETURNING id, title, is_completed`, [taskId, global.user_id]);

  const deletedTask = result.rows[0];

  //handles missing task
  if (!deletedTask) {
    return res.status(404).json({
      message: "Task not found",
    });
  }

  return res.status(200).json(deletedTask); //return the  deletedTask with status 200
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
