const prisma = require("../db/prisma");

async function getUserAnalytics(req, res) {
  const userId = parseInt(req.params.id);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({
      message: "Invalid user ID",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return res.status(404).json({
      message: "User not found",
    });
  }

  const taskStats = await prisma.task.groupBy({
    by: ["isCompleted"],
    where: {
      userId: userId,
    },
    _count: {
      id: true,
    },
  });

  const totalTasks = taskStats.reduce((total, group) => {
    return total + group._count.id;
  }, 0);

  const completedGroup = taskStats.find((group) => group.isCompleted === true);

  const completedTasks = completedGroup?._count.id ?? 0;

  const incompleteTasks = totalTasks - completedTasks;

  const completionPercentage =
    totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
  return res.status(200).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    analytics: {
      totalTasks,
      completedTasks,
      incompleteTasks,
      completionPercentage,
    },
  });
}

async function getUsersWithStats(req, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      Task: {
        select: {
            isCompleted: true,
        },
      },
    },
  });

  const usersWithStats = users.map((user) => {
    const totalTasks = user.Task.length;

    const completedTasks = user.Task.filter(
      (task) => task.isCompleted === true
    ).length;

    const incompleteTasks = totalTasks - completedTasks;

    const completionPercentage = 
       totalTasks > 0 
       ? (completedTasks / totalTasks) * 100
       : 0;

    return {
        id: user.id,
        name: user.name,
        email: user.email,
        totalTasks,
        completedTasks,
        incompleteTasks,
        completionPercentage,
    };
  });

  return res.status(200).json(usersWithStats);
}

module.exports = {
  getUserAnalytics,
  getUsersWithStats
};
