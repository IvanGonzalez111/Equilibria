function calculateReward(points) {
  if (points >= 30) return "Recompensa alta";
  if (points >= 15) return "Recompensa media";
  return "Sin recompensa";
}

function calculateGroupStatus(members) {
  if (!members.length) {
    return {
      label: "Sin integrantes",
      difference: 0,
      tone: "neutral"
    };
  }

  const points = members.map((member) => Number(member.points) || 0);
  const difference = Math.max(...points) - Math.min(...points);

  if (difference <= 5) {
    return {
      label: "Equilibrado",
      difference,
      tone: "balanced"
    };
  }

  if (difference <= 12) {
    return {
      label: "En observación",
      difference,
      tone: "watch"
    };
  }

  return {
    label: "Desbalanceado",
    difference,
    tone: "danger"
  };
}

function suggestMember(members) {
  if (!members.length) return null;
  return [...members].sort((a, b) => {
    if (a.points !== b.points) return a.points - b.points;
    return a.tasksCompleted - b.tasksCompleted;
  })[0];
}

function weightedProbabilities(members) {
  if (!members.length) return [];
  const maxPoints = Math.max(...members.map((member) => Number(member.points) || 0));
  const weights = members.map((member) => ({
    memberId: member.id,
    name: member.name,
    points: member.points,
    weight: Math.max(1, maxPoints + 5 - (Number(member.points) || 0))
  }));
  const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);

  return weights.map((item) => ({
    ...item,
    probability: Math.round((item.weight / totalWeight) * 100)
  }));
}

function weightedDraw(members) {
  const probabilities = weightedProbabilities(members);
  if (!probabilities.length) return null;

  const totalWeight = probabilities.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const item of probabilities) {
    cursor -= item.weight;
    if (cursor <= 0) {
      return {
        memberId: item.memberId,
        probabilities
      };
    }
  }

  return {
    memberId: probabilities[probabilities.length - 1].memberId,
    probabilities
  };
}

module.exports = {
  calculateReward,
  calculateGroupStatus,
  suggestMember,
  weightedProbabilities,
  weightedDraw
};
