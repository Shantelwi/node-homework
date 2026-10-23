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

  //reads the title from the req.body
  const { title } = req.body;

  //generates the id by calling taskCounter()
  const id = taskCounter();

  //Create the task
  const task = {
    id,
    title,
    isCompleted: false,
    userId: global.user_id.email,
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
  return res.status(201).json(sanitizedTask); //return the sanitized task with status 200
}

function update(req, res) {}

function deleteTask(req, res) {
  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }
}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
