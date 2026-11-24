const { taskSchema, patchTaskSchema } = require("../validation/taskSchema");
const prisma = require("../db/prisma");
const Joi = require("joi");

async function create(req, res) {
  if (!req.body) req.body = {};

  //validate req.body and validation error
  const { error, value } = taskSchema.validate(req.body);

  if (error) return res.status(400).json({ message: error.message });

  //create and store task
  const task = await prisma.task.create({
    data: {
      title: value.title,
      isCompleted: value.isCompleted,
      userId: req.user.id,
      priority: value.priority,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  //send the response
  res.status(201).json(task);
}

async function index(req, res) {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  //Build where clause with optional search filter
  const whereClause = { userId: req.user.id };

  if (req.query.find) {
    whereClause.title = {
      contains: req.query.find,
      mode: "insensitive",
    };
  }

  const getOrderBy = (query) => {
    const validSortFields = ["title", "priority", "createdAt", "isCompleted"];
    const sortBy = query.sortBy || "createdAt";
    const sortDirection = query.sortDirection === "asc" ? "asc" : "desc";

    if (validSortFields.includes(sortBy)) {
      return { [sortBy]: sortDirection };
    }
    return { createdAt: "desc" };
  };

  //Get tasks with pagination and eager loading
  const tasks = await prisma.task.findMany({
    where: whereClause,
    orderBy: getOrderBy(req.query),
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      createdAt: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    skip,
    take: limit,
  });

  //Get total count for pagination metadata
  const totalTasks = await prisma.task.count({
    where: whereClause,
  });

  //Build pagination object with complete metadata
  const pagination = {
    page: page,
    limit: limit,
    total: totalTasks,
    pages: Math.ceil(totalTasks / limit),
    hasNext: page * limit < totalTasks,
    hasPrev: page > 1,
  };
  //returns the task array with status 200
  res.status(200).json({ tasks, pagination });
}

async function show(req, res) {
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
      userId: req.user.id,
    },
    select: {
      id: true,
      title: true,
      isCompleted: true,
      priority: true,
      User: {
        select: {
          name: true,
          email: true,
        },
      }
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
        userId: req.user.id,
      },
      data: value,
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
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

async function bulkCreate(req, res, next) {
  const tasks = req.body?.tasks;

  if (!Array.isArray(tasks)) {
    return res.status(400).json({
      message: "Tasks should be an array",
    });
  }

  if (tasks.length === 0) {
    return res.status(400).json({
      message: "Tasks array cannot be empty",
    });
  }

  const bulkTaskSchema = Joi.array().items(taskSchema).min(1);

  const { error, value } = bulkTaskSchema.validate(tasks, {
    abortEarly: false,
  });

  if (error) {
    return res.status(400).json({
      message: "Validation failed",
      details: error.details,
    });
  }

  const preparedTasks = value.map((task) => ({
    title: task.title,
    priority: task.priority,
    isCompleted: task.isCompleted,
    userId: req.user.id,
  }));

  try {
    const result = await prisma.task.createMany({
      data: preparedTasks,
    });
    return res.status(201).json({
      tasksCreated: result.count,
      totalRequested: preparedTasks.length
    });
  } catch (error) {
    return next(error);
  }
}

async function deleteTask(req, res) {
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
        userId: req.user.id,
      },
      select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
      },
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
  bulkCreate,
  update,
  deleteTask,
};
