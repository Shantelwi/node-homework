const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");

const taskCounter = (() => {
  let lastTaskNumber = 0;
  return () => {
    lastTaskNumber += 1;
    return lastTaskNumber;
  };
})();

function create(req, res) {
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

  //Create the task
  const task = {
    id: taskCounter(),
    userId: global.user_id.email,
    ...value,
  };

  //sanitized the task
  const sanitizedTask = { ...task };
  delete sanitizedTask.userId;

  //store the task
  global.tasks.push(task);

  //send the response
  res.status(201).json({
    ...sanitizedTask,
  });
}

function index(req, res) {
  //checks authentication
  if (!global.user_id) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  //filters tasks belonging to the logged in user
  const userTasks = global.tasks.filter((task) => {
    return task.userId === global.user_id.email;
  });

  //returns a response when user has no tasks
  if (userTasks.length === 0) {
    return res.status(404).json({
        message: "No tasks Found"
    });
  }

  //removes userId from each task
  const sanitizedTasks = userTasks.map((task) => {
    const sanitizedTask = { ...task };
    delete sanitizedTask.userId;
    return sanitizedTask;
  });

  //returns the sanitized task array with status 200
  res.status(200).json(sanitizedTasks);
}

function show(req, res) {
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
  const task = global.tasks.find((task) => {
    return task.id === taskId && task.userId === global.user_id.email;
  });

  //handles missing task
  if (!task) {
    return res.status(404).json({
      message: "Task not found",
    });
  }

  //remove userId if task is found
  const sanitizedTask = { ...task };
  delete sanitizedTask.userId;
  return res.status(200).json(sanitizedTask); //return the sanitized task with status 200
}

function update(req, res) {
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

  //finds the task belonging to the logged in user
  const task = global.tasks.find((task) => {
    return task.id === taskId && task.userId === global.user_id.email;
  });

  //handles missing task
  if (!task) {
    return res.status(404).json({
      message: "Task not found",
    });
  }

  //which fields the user is allowed to update
  Object.assign(task, value);

  //remove userId if task is found
  const sanitizedTask = { ...task };
  delete sanitizedTask.userId;
  return res.status(200).json(sanitizedTask); //return the sanitized task with status 200
}

function deleteTask(req, res) {
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

  //find the task belonging to the logged in user and also remove task from global.tasks
  const task = global.tasks.findIndex((task) => {
    return task.id === taskId && task.userId === global.user_id.email;
  });

  //handles missing task
  if (task === -1) {
    return res.status(404).json({
      message: "Task not found",
    });
  }
  
  
  const sanitizedTask = { ...global.tasks[task] };
  delete sanitizedTask.userId;
  global.tasks.splice(task, 1);
  return res.status(200).json(sanitizedTask); //return the sanitized task with status 200
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
