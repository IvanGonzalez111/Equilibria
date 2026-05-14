const express = require("express");
const { readDatabase, writeDatabase } = require("../storage/database");
const { createId } = require("../utils/ids");
const {
  calculateReward,
  calculateGroupStatus,
  suggestMember,
  weightedDraw,
  weightedProbabilities
} = require("../services/equilibriaService");

const router = express.Router();

function findGroup(db, groupId) {
  return db.groups.find((group) => group.id === groupId);
}

function enrichGroup(group) {
  group.members = Array.isArray(group.members) ? group.members : [];
  group.tasks = Array.isArray(group.tasks) ? group.tasks : [];
  group.history = Array.isArray(group.history) ? group.history : [];

  return {
    ...group,
    status: calculateGroupStatus(group.members),
    suggestion: suggestMember(group.members),
    probabilities: weightedProbabilities(group.members)
  };
}

router.get("/groups/:userId", (req, res) => {
  const db = readDatabase();
  const groups = db.groups
    .filter((group) => group.userId === req.params.userId)
    .map(enrichGroup);

  return res.json({ groups });
});

router.post("/groups", (req, res) => {
  const { userId, name } = req.body;

  if (!userId || !name || !String(name).trim()) {
    return res.status(400).json({ error: "El nombre del grupo es obligatorio." });
  }

  const db = readDatabase();
  const user = db.users.find((entry) => entry.id === userId);

  if (!user) {
    return res.status(404).json({ error: "Usuario no encontrado." });
  }

  const group = {
    id: createId("grp"),
    userId,
    name: String(name).trim(),
    members: [],
    tasks: [],
    history: []
  };

  db.groups.push(group);
  writeDatabase(db);

  return res.status(201).json({ group: enrichGroup(group) });
});

router.delete("/groups/:groupId", (req, res) => {
  const db = readDatabase();
  const groupIndex = db.groups.findIndex((group) => group.id === req.params.groupId);

  if (groupIndex === -1) {
    return res.status(404).json({ error: "Grupo no encontrado." });
  }

  const [deletedGroup] = db.groups.splice(groupIndex, 1);
  writeDatabase(db);

  return res.json({
    deletedGroupId: deletedGroup.id,
    deletedGroupName: deletedGroup.name
  });
});

router.post("/groups/:groupId/members", (req, res) => {
  const { name } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "El nombre del integrante es obligatorio." });
  }

  const db = readDatabase();
  const group = findGroup(db, req.params.groupId);

  if (!group) {
    return res.status(404).json({ error: "Grupo no encontrado." });
  }

  const duplicatedName = group.members.some(
    (member) => member.name.toLowerCase() === String(name).trim().toLowerCase()
  );

  if (duplicatedName) {
    return res.status(409).json({ error: "Ya existe un integrante con ese nombre en este grupo." });
  }

  const member = {
    id: createId("mem"),
    name: String(name).trim(),
    points: 0,
    tasksCompleted: 0,
    rewards: calculateReward(0),
    avatar: null
  };

  group.members.push(member);
  writeDatabase(db);

  return res.status(201).json({ member, group: enrichGroup(group) });
});

router.put("/groups/:groupId/members/:memberId/avatar", (req, res) => {
  const { avatar } = req.body;
  const avatarValue = typeof avatar === "string" ? avatar.trim() : null;

  if (
    avatarValue &&
    (!/^data:image\/(png|jpeg|jpg|webp);base64,/.test(avatarValue) || avatarValue.length > 1_500_000)
  ) {
    return res.status(400).json({ error: "La imagen debe ser PNG, JPG o WebP y pesar menos de 1.5 MB." });
  }

  const db = readDatabase();
  const group = findGroup(db, req.params.groupId);

  if (!group) {
    return res.status(404).json({ error: "Grupo no encontrado." });
  }

  group.members = Array.isArray(group.members) ? group.members : [];
  const member = group.members.find((entry) => entry.id === req.params.memberId);

  if (!member) {
    return res.status(404).json({ error: "Integrante no encontrado." });
  }

  member.avatar = avatarValue || null;
  writeDatabase(db);

  return res.json({ member, group: enrichGroup(group) });
});

router.delete("/groups/:groupId/members/:memberId", (req, res) => {
  const db = readDatabase();
  const group = findGroup(db, req.params.groupId);

  if (!group) {
    return res.status(404).json({ error: "Grupo no encontrado." });
  }

  group.members = Array.isArray(group.members) ? group.members : [];
  group.tasks = Array.isArray(group.tasks) ? group.tasks : [];

  const memberIndex = group.members.findIndex((member) => member.id === req.params.memberId);

  if (memberIndex === -1) {
    return res.status(404).json({ error: "Integrante no encontrado." });
  }

  const [deletedMember] = group.members.splice(memberIndex, 1);
  group.tasks.forEach((task) => {
    if (task.assignedTo === deletedMember.id) {
      task.assignedTo = null;
    }
  });
  writeDatabase(db);

  return res.json({
    deletedMemberId: deletedMember.id,
    deletedMemberName: deletedMember.name,
    group: enrichGroup(group)
  });
});

router.post("/groups/:groupId/tasks", (req, res) => {
  const { name, votes } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: "El nombre de la tarea es obligatorio." });
  }

  if (!Array.isArray(votes) || !votes.length) {
    return res.status(400).json({ error: "Debes ingresar al menos un voto de dificultad." });
  }

  const parsedVotes = votes.map(Number);
  const invalidVote = parsedVotes.some((vote) => Number.isNaN(vote) || vote < 1 || vote > 5);

  if (invalidVote) {
    return res.status(400).json({ error: "Los votos deben estar entre 1 y 5." });
  }

  const db = readDatabase();
  const group = findGroup(db, req.params.groupId);

  if (!group) {
    return res.status(404).json({ error: "Grupo no encontrado." });
  }

  if (!group.members.length) {
    return res.status(400).json({ error: "Agrega integrantes antes de crear tareas." });
  }

  const difficulty = Number(
    (parsedVotes.reduce((sum, vote) => sum + vote, 0) / parsedVotes.length).toFixed(1)
  );
  const suggested = suggestMember(group.members);
  const draw = weightedDraw(group.members);

  const task = {
    id: createId("tsk"),
    name: String(name).trim(),
    votes: parsedVotes,
    difficulty,
    assignedTo: null,
    completed: false
  };

  group.tasks.push(task);
  writeDatabase(db);

  return res.status(201).json({
    task,
    suggestion: suggested,
    draw,
    probabilities: weightedProbabilities(group.members),
    group: enrichGroup(group)
  });
});

router.put("/groups/:groupId/tasks/:taskId/complete", (req, res) => {
  const { memberId } = req.body;
  const db = readDatabase();
  const group = findGroup(db, req.params.groupId);

  if (!group) {
    return res.status(404).json({ error: "Grupo no encontrado." });
  }

  const task = group.tasks.find((entry) => entry.id === req.params.taskId);
  const member = group.members.find((entry) => entry.id === memberId);

  if (!task) {
    return res.status(404).json({ error: "Tarea no encontrada." });
  }

  if (!member) {
    return res.status(404).json({ error: "Integrante no encontrado." });
  }

  if (task.completed) {
    return res.status(409).json({ error: "Esta tarea ya fue completada." });
  }

  task.assignedTo = member.id;
  task.completed = true;
  member.points = Number((member.points + task.difficulty).toFixed(1));
  member.tasksCompleted += 1;
  member.rewards = calculateReward(member.points);

  const historyRecord = {
    id: createId("hst"),
    taskName: task.name,
    memberName: member.name,
    pointsGained: task.difficulty,
    date: new Date().toISOString()
  };

  group.history.unshift(historyRecord);
  writeDatabase(db);

  return res.json({
    task,
    member,
    historyRecord,
    group: enrichGroup(group)
  });
});

router.get("/groups/:groupId/history", (req, res) => {
  const db = readDatabase();
  const group = findGroup(db, req.params.groupId);

  if (!group) {
    return res.status(404).json({ error: "Grupo no encontrado." });
  }

  return res.json({ history: group.history });
});

module.exports = router;
