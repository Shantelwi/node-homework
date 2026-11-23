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

  const recentTasks = await prisma.task.findMany({
    where: {
        userId,
    },
    orderBy: {
        createdAt: "desc",
    },
    take: 10,
    select: {
        id: true,
        title: true,
        isCompleted: true,
        priority: true,
        createdAt: true,
        userId: true,
        User: {
            select: {
                name: true,
            },
        },
    }
  });

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const weeklyProgress = await prisma.task.groupBy({
    by: ["createdAt"],
    where: {
      userId: userId,
      createdAt: {
        gte: oneWeekAgo,
      },
    },
    _count: {
      id: true,
    },
  });

  return res.status(200).json({
    taskStats,
    recentTasks,
    weeklyProgress,
  });

}

async function getUsersWithStats(req, res) {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
  const usersRaw = await prisma.user.findMany({
    include: {
        Task: {
            where: {
                isCompleted: false
            },
            select: {
                id: true
            },
            take: 5,
        },
        _count: {
            select: {
                Task: true
            },
        },
    },
    skip: skip,
    take: limit,
    orderBy: {
        createdAt: "desc"
    },
  });

  const usersWithStats = usersRaw.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    _count: user._count,
    Task: user.Task
  }));

  const totalUsers = await prisma.user.count();

  const pagination = {
    page: page,
    limit: limit,
    total: totalUsers,
    pages: Math.ceil(totalUsers/limit),
    hasNext: page * limit < totalUsers,
    hasPrev: page > 1
  };

  return res.status(200).json({
    users: usersWithStats, 
    pagination: pagination
});
}

async function searchTasks(req, res, next) {
    const q = req.query.q;

    if(!q || q.length < 2) {
        return res.status(400).json({
            error: "Search query must be at least 2 characters"
        });
    }
    const limit = parseInt(req.query.limit) || 20;
    const searchPattern = `%${q}%`;
    const exactMatch = q;
    const startsWith = `${q}%`;

    try {
        const results = await prisma.$queryRaw`
            SELECT
                t.id,
                t.title,
                t.is_completed AS "isCompleted",
                t.priority,
                t.created_at AS "createdAt",
                t.user_id AS "userId",
                u.name AS "user_name"
            FROM tasks t
            JOIN users u ON t.user_id = u.id
            WHERE t.title ILIKE ${searchPattern}
                OR u.name ILIKE ${searchPattern}
            ORDER BY
                CASE
                    WHEN t.title ILIKE ${exactMatch} THEN 1
                    WHEN t.title ILIKE ${startsWith} THEN 2
                    WHEN t.title ILIKE ${searchPattern} THEN 3
                    ELSE 4
                END,
                t.created_at DESC
                LIMIT ${limit}
        `;
        return res.status(200).json({
            results: results,
            query: q,
            count: results.length
        })
    } catch (error) {
        return next (error);
    }
}

module.exports = {
  getUserAnalytics,
  getUsersWithStats,
  searchTasks
};
