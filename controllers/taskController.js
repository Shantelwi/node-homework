const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");

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

  if (error) return res.status(400).json({ message: error.message });

  //create and store task
  const task = await prisma.task.create({
    data: {
      title: value.title,
      isCompleted: value.isCompleted,
      userId: global.user_id,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
    },
  });

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

  const tasks = await prisma.task.findMany({
    where: {
      userId: global.user_id,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
    },
  });

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
  const task = await prisma.task.findUnique({
    where: {
      id: taskId,
      userId: global.user_id,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
    },
  });

  //handles missing task
  if (!task) {
    return res.status(404).json({
      message: "Task not found",
    });
  }

  res.status(200).json(task);
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
  if (error) return res.status(400).json({ message: error.message });

  const taskId = parseInt(req.params?.id);
  if (!taskId) {
    return res.status(400).json({
      message: "The task ID passed is not valid.",
    });
  }

  //finds the task belonging to the logged in user and which fields the user is allowed to update
  try {
    const updatedTask = await prisma.task.update({
      where: {
        id: taskId,
        userId: global.user_id,
      },
      data: value,
      select: {
        id: true,
        title: true,
        isCompleted: true,
      },
    });

    return res.status(200).json(updatedTask); //return the  updatedTask with status 200
  } catch (error) {
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Task not found",
      });
    }
    throw error;
  }
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
  try {
    const deletedTask = await prisma.task.delete({
      where: {
        id: taskId,
        userId: global.user_id
      },
      select: {
        id: true,
        title: true,
        isCompleted: true
      }
    });
    return res.status(200).json(deletedTask); //return the  deletedTask with status 200
  } catch (error) {
    //handles missing task
    if (error.code === "P2025") {
      return res.status(404).json({
        message: "Task not found",
      });
    }
    throw error;
  }

}

module.exports = {
  create,
  index,
  show,
  update,
  deleteTask,
};
