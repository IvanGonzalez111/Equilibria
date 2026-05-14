const state = {
  user: null,
  groups: [],
  activeGroupId: null,
  pendingTask: null,
  selectedMemberId: null,
  drawHighlightId: null,
  drawStatus: "",
  drawInProgress: false,
  celebration: null,
  confirmation: null,
  activeView: "dashboard"
};

const DRAW_SOUND_URL = "/assets-mp3/sonido-de-maquina.mp3";
const VICTORY_SOUND_URL = "/assets-mp3/Happy%20Wheels%20victory.mp3";
let drawAudio = null;
let victoryAudio = null;

const els = {
  authScreen: document.querySelector("#auth-screen"),
  mainScreen: document.querySelector("#main-screen"),
  loginForm: document.querySelector("#login-form"),
  registerForm: document.querySelector("#register-form"),
  showLogin: document.querySelector("#show-login"),
  showRegister: document.querySelector("#show-register"),
  logoutButton: document.querySelector("#logout-button"),
  profilePhotoInput: document.querySelector("#profile-photo-input"),
  profileAvatar: document.querySelector("#profile-avatar"),
  profileName: document.querySelector("#profile-name"),
  workspace: document.querySelector("#workspace"),
  sessionTopbar: document.querySelector("#session-topbar"),
  welcomeTitle: document.querySelector("#welcome-title"),
  activeGroupName: document.querySelector("#active-group-name"),
  sectionActiveGroupNames: document.querySelectorAll(".section-active-group-name"),
  messageArea: document.querySelector("#message-area"),
  groupForm: document.querySelector("#group-form"),
  memberForm: document.querySelector("#member-form"),
  taskForm: document.querySelector("#task-form"),
  votesArea: document.querySelector("#votes-area"),
  difficultyPreview: document.querySelector("#difficulty-preview"),
  groupList: document.querySelector("#group-list"),
  memberList: document.querySelector("#member-list"),
  memberSummary: document.querySelector("#member-summary"),
  pendingTaskList: document.querySelector("#pending-task-list"),
  groupStatusCard: document.querySelector("#group-status-card"),
  assignmentContent: document.querySelector("#assignment-content"),
  historyList: document.querySelector("#history-list"),
  rewardList: document.querySelector("#reward-list"),
  celebrationModal: document.querySelector("#celebration-modal"),
  confirmModal: document.querySelector("#confirm-modal")
};

const api = {
  async request(path, options = {}) {
    try {
      const response = await fetch(path, {
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {})
        },
        ...options
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        const message =
          typeof payload.error === "string" && payload.error.trim()
            ? payload.error
            : response.status === 404
              ? "No se encontró esta acción en el servidor. Reiniciá npm start y probá de nuevo."
              : response.status === 413
                ? "La imagen es demasiado pesada para guardarla."
                : "Ocurrió un error inesperado.";
        const error = new Error(message);
        error.status = response.status;
        error.payload = payload;
        throw error;
      }

      return payload;
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error("No se pudo conectar con el servidor. Revisá que npm start esté corriendo.");
      }
      throw error;
    }
  },
  register(data) {
    return this.request("/api/register", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },
  login(data) {
    return this.request("/api/login", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },
  updateAvatar(userId, avatar) {
    return this.request(`/api/users/${userId}/avatar`, {
      method: "PUT",
      body: JSON.stringify({ avatar })
    });
  },
  groups(userId) {
    return this.request(`/api/groups/${userId}`);
  },
  createGroup(data) {
    return this.request("/api/groups", {
      method: "POST",
      body: JSON.stringify(data)
    });
  },
  deleteGroup(groupId) {
    return this.request(`/api/groups/${groupId}`, {
      method: "DELETE"
    });
  },
  addMember(groupId, data) {
    return this.request(`/api/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },
  deleteMember(groupId, memberId) {
    return this.request(`/api/groups/${groupId}/members/${memberId}`, {
      method: "DELETE"
    });
  },
  updateMemberAvatar(groupId, memberId, avatar) {
    return this.request(`/api/groups/${groupId}/members/${memberId}/avatar`, {
      method: "PUT",
      body: JSON.stringify({ avatar })
    });
  },
  createTask(groupId, data) {
    return this.request(`/api/groups/${groupId}/tasks`, {
      method: "POST",
      body: JSON.stringify(data)
    });
  },
  completeTask(groupId, taskId, memberId) {
    return this.request(`/api/groups/${groupId}/tasks/${taskId}/complete`, {
      method: "PUT",
      body: JSON.stringify({ memberId })
    });
  }
};

function activeGroup() {
  return state.groups.find((group) => group.id === state.activeGroupId) || null;
}

function normalizeErrorMessage(error, fallback = "Ocurrió un error inesperado.") {
  const rawMessage =
    typeof error === "string"
      ? error
      : typeof error?.message === "string"
        ? error.message
        : typeof error?.error === "string"
          ? error.error
          : "";
  const message = rawMessage.trim();

  if (!message || message === "null" || message === "undefined") {
    return fallback;
  }

  return message;
}

function saveSession(user) {
  localStorage.setItem("equilibria:user", JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem("equilibria:user");
}

function showMessage(text, type = "info") {
  const message = normalizeErrorMessage(text);
  els.messageArea.innerHTML = `<div class="message ${type}">${escapeHtml(message)}</div>`;
  window.setTimeout(() => {
    els.messageArea.innerHTML = "";
  }, 4200);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatPoints(points) {
  return Number(points || 0).toLocaleString("es-UY", {
    maximumFractionDigits: 1
  });
}

function rewardClass(reward) {
  if (reward === "Recompensa alta") return "high";
  if (reward === "Recompensa media") return "medium";
  return "";
}

function nextRewardInfo(points) {
  if (points >= 30) {
    return {
      label: "Nivel maximo alcanzado",
      remaining: 0,
      progress: 100
    };
  }

  if (points >= 15) {
    return {
      label: "Faltan puntos para recompensa alta",
      remaining: Number((30 - points).toFixed(1)),
      progress: Math.min(100, Math.round((points / 30) * 100))
    };
  }

  return {
    label: "Faltan puntos para recompensa media",
    remaining: Number((15 - points).toFixed(1)),
    progress: Math.min(100, Math.round((points / 15) * 100))
  };
}

function memberInitial(name) {
  return String(name || "?").trim().charAt(0).toUpperCase();
}

function namesMatch(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

function renderAvatar(person) {
  const name = typeof person === "string" ? person : person?.name;
  const avatar = typeof person === "object" && person?.avatar ? person.avatar : null;
  const fallbackAvatar = state.user?.avatar && namesMatch(name, state.user.name) ? state.user.avatar : null;
  const image = avatar || fallbackAvatar;

  if (image) {
    return `<span class="avatar has-image"><img src="${escapeHtml(image)}" alt="Foto de ${escapeHtml(name)}" /></span>`;
  }

  return `<span class="avatar">${memberInitial(name)}</span>`;
}

function getFormData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, typeof value === "string" ? value.trim() : value])
  );
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ""));
}

function requireUser(payload) {
  if (!payload?.user?.id || !payload.user.email) {
    throw new Error("El servidor no devolvió una sesión válida.");
  }

  return payload.user;
}

function requireGroup(payload) {
  if (!payload?.group?.id) {
    throw new Error("El servidor no devolvió un grupo válido.");
  }

  return payload.group;
}

async function loadGroups() {
  if (!state.user) return;
  const payload = await api.groups(state.user.id);
  state.groups = Array.isArray(payload.groups) ? payload.groups : [];

  if (!state.activeGroupId || !state.groups.some((group) => group.id === state.activeGroupId)) {
    state.activeGroupId = state.groups[0]?.id || null;
  }

  if (!state.groups.length) {
    state.activeView = "groups";
  }

  renderApp();
}

function setAuthMode(mode) {
  const isLogin = mode === "login";
  els.loginForm.classList.toggle("hidden", !isLogin);
  els.registerForm.classList.toggle("hidden", isLogin);
  els.showLogin.classList.toggle("active", isLogin);
  els.showRegister.classList.toggle("active", !isLogin);
}

function renderSession() {
  const loggedIn = Boolean(state.user);
  els.authScreen.classList.toggle("hidden", loggedIn);
  els.mainScreen.classList.toggle("hidden", !loggedIn);

  if (state.user) {
    els.welcomeTitle.textContent = `Hola, ${state.user.name}`;
  }

  renderUserProfile();
}

function renderUserProfile() {
  if (!state.user) {
    els.profileName.textContent = "Usuario";
    els.profileAvatar.textContent = "?";
    return;
  }

  els.profileName.textContent = state.user.name;

  if (state.user.avatar) {
    els.profileAvatar.innerHTML = `<img src="${escapeHtml(state.user.avatar)}" alt="Foto de ${escapeHtml(state.user.name)}" />`;
    return;
  }

  els.profileAvatar.textContent = memberInitial(state.user.name);
}

function renderApp() {
  renderSession();
  const group = activeGroup();

  const groupName = group ? group.name : "Sin grupo";
  els.activeGroupName.textContent = groupName;
  els.sectionActiveGroupNames.forEach((element) => {
    element.textContent = groupName;
  });
  renderPageVisibility();
  syncDifficultyInput();
  renderGroups();
  renderStatus(group);
  renderMembers(group);
  renderTasks(group);
  renderAssignment(group);
  renderHistory(group);
  renderRewards(group);
  renderCelebration();
  renderConfirmation();
}

function setActiveView(view) {
  const validViews = ["dashboard", "groups", "members", "tasks", "history", "rewards"];
  state.activeView = validViews.includes(view) ? view : "dashboard";
  renderPageVisibility();
}

function renderPageVisibility() {
  const isDashboard = state.activeView === "dashboard";
  els.workspace.classList.toggle("has-compact-topbar", !isDashboard);
  els.sessionTopbar.classList.toggle("is-compact", !isDashboard);

  document.querySelectorAll(".page-section").forEach((section) => {
    const isActive = section.dataset.view === state.activeView;
    section.classList.toggle("active", isActive);
    section.hidden = !isActive;
  });

  document.querySelectorAll(".nav-link").forEach((link) => {
    const isActive = link.dataset.target === state.activeView;
    link.classList.toggle("active", isActive);
    link.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function renderGroups() {
  if (!state.groups.length) {
    els.groupList.innerHTML = `<p class="empty-state">Crea tu primer grupo para empezar.</p>`;
    return;
  }

  els.groupList.innerHTML = state.groups
    .map(
      (group) => `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(group.name)}</strong>
            <small>${group.members.length} integrantes · ${group.tasks.length} tareas</small>
          </div>
          <div class="row-actions">
            <button class="select-button ${group.id === state.activeGroupId ? "active" : ""}" data-select-group="${group.id}" type="button">
              ${group.id === state.activeGroupId ? "Activo" : "Seleccionar"}
            </button>
            <button class="danger-button" data-delete-group="${group.id}" type="button">Eliminar</button>
          </div>
        </div>
      `
    )
    .join("");
}

function renderStatus(group) {
  if (!group) {
    els.groupStatusCard.innerHTML = `
      <div>
        <span class="status-label">Pendiente</span>
        <h4>No hay un grupo activo</h4>
        <p class="tiny-muted">Crea o selecciona un grupo para ver el estado de equilibrio.</p>
      </div>
      <div class="score-ring"><div><strong>0</strong><span>pts</span></div></div>
    `;
    return;
  }

  els.groupStatusCard.innerHTML = `
    <div>
      <span class="status-label ${group.status.tone}">${escapeHtml(group.status.label)}</span>
      <h4>Diferencia máxima: ${formatPoints(group.status.difference)} puntos</h4>
      <p class="tiny-muted">Se compara el puntaje más alto contra el más bajo del grupo.</p>
    </div>
    <div class="score-ring">
      <div>
        <strong>${formatPoints(group.status.difference)}</strong>
        <span>pts</span>
      </div>
    </div>
  `;
}

function renderMembers(group) {
  if (!group || !group.members.length) {
    const empty = `<p class="empty-state">Todavía no hay integrantes en el grupo activo.</p>`;
    els.memberSummary.innerHTML = empty;
    els.memberList.innerHTML = empty;
    return;
  }

  const effortSortedMembers = sortMembersByEffort(group.members);
  const topPoints = Math.max(...effortSortedMembers.map((member) => Number(member.points) || 0));

  els.memberSummary.innerHTML = effortSortedMembers
    .map((member) => renderMemberCard(member, topPoints > 0 && Number(member.points) === topPoints))
    .join("");
  els.memberList.innerHTML = group.members
    .map(
      (member) => `
        <div class="list-item">
          <div class="member-top">
            ${renderAvatar(member)}
            <div>
              <strong>${escapeHtml(member.name)}</strong>
              <small>${formatPoints(member.points)} puntos · ${member.tasksCompleted} tareas · ${escapeHtml(member.rewards)}</small>
            </div>
          </div>
          <div class="row-actions">
            <label class="member-photo-button">
              Foto
              <input type="file" accept="image/png,image/jpeg,image/webp" data-member-avatar="${member.id}" />
            </label>
            <button class="danger-button" data-delete-member="${member.id}" type="button">Eliminar</button>
          </div>
        </div>
      `
    )
    .join("");
}

function renderMemberCard(member, isLeader = false) {
  return `
    <div class="member-card ${isLeader ? "is-leader" : ""}">
      <div class="member-top">
        ${renderAvatar(member)}
        <div>
          <strong>${escapeHtml(member.name)}</strong>
          <small>${member.tasksCompleted} tareas</small>
        </div>
      </div>
      <div>
        <span class="member-points">${formatPoints(member.points)}</span>
        <small> puntos acumulados</small>
      </div>
      ${isLeader ? `<span class="effort-badge">Mayor esfuerzo</span>` : ""}
      <span class="reward-badge ${rewardClass(member.rewards)}">${escapeHtml(member.rewards)}</span>
    </div>
  `;
}

function sortMembersByEffort(members) {
  return [...members].sort((a, b) => {
    const pointDifference = (Number(b.points) || 0) - (Number(a.points) || 0);
    if (pointDifference !== 0) return pointDifference;

    const taskDifference = (Number(b.tasksCompleted) || 0) - (Number(a.tasksCompleted) || 0);
    if (taskDifference !== 0) return taskDifference;

    return String(a.name || "").localeCompare(String(b.name || ""), "es");
  });
}

function renderTasks(group) {
  if (!group) {
    els.pendingTaskList.innerHTML = `<p class="empty-state">Crea un grupo para cargar tareas.</p>`;
    return;
  }

  const pendingTasks = group.tasks.filter((task) => !task.completed);

  if (!pendingTasks.length) {
    els.pendingTaskList.innerHTML = `<p class="empty-state">No hay tareas pendientes.</p>`;
    return;
  }

  els.pendingTaskList.innerHTML = pendingTasks
    .map(
      (task) => `
        <div class="list-item">
          <div>
            <strong>${escapeHtml(task.name)}</strong>
            <small>Dificultad ${formatPoints(task.difficulty)} · ${task.votes.length} votos</small>
          </div>
          <button class="select-button" data-select-task="${task.id}" type="button">Asignar</button>
        </div>
      `
    )
    .join("");
}

function renderAssignment(group) {
  if (!group) {
    els.assignmentContent.innerHTML = `<p class="empty-state">Selecciona un grupo para usar la asignación.</p>`;
    return;
  }

  if (!group.members.length) {
    els.assignmentContent.innerHTML = `<p class="empty-state">Agrega integrantes antes de crear o asignar tareas.</p>`;
    return;
  }

  const pendingTask = getCurrentPendingTask(group);

  if (!pendingTask) {
    els.assignmentContent.innerHTML = `
      <p class="empty-state">Crea una tarea o elige una pendiente para ver la sugerencia automática.</p>
      ${renderProbabilityList(group)}
    `;
    return;
  }

  const suggestion = getSuggestedMember(group.members);
  const suggestionContext = getSuggestionContext(group.members, suggestion);
  const selected = group.members.find((member) => member.id === state.selectedMemberId) || suggestion;
  const canApplySuggestion = suggestionContext.showSuggestionAction && selected.id !== suggestion.id;
  const before = Number(selected.points) || 0;
  const after = Number((before + pendingTask.difficulty).toFixed(1));
  const afterStatus = simulateStatus(group.members, selected.id, pendingTask.difficulty);

  els.assignmentContent.innerHTML = `
    <div class="assignment-box">
      <div>
        <p class="eyebrow">Sugerencia inteligente</p>
        <h4>${escapeHtml(suggestionContext.title)}</h4>
        <p class="tiny-muted">${escapeHtml(suggestionContext.reason)}</p>
      </div>
      <div>
        <strong>Tarea: ${escapeHtml(pendingTask.name)}</strong>
        <small>Dificultad: ${formatPoints(pendingTask.difficulty)} puntos</small>
      </div>
      <div class="assignment-actions">
        ${
          canApplySuggestion
            ? `<button class="secondary-button" data-pick-member="${suggestion.id}" type="button">Usar sugerencia</button>`
            : ""
        }
        <button class="primary-button" data-weighted-draw type="button" ${state.drawInProgress ? "disabled" : ""}>
          ${state.drawInProgress ? "Sorteando..." : "Sorteo ponderado"}
        </button>
      </div>
      ${state.drawStatus ? `<div class="draw-status">${escapeHtml(state.drawStatus)}</div>` : ""}
    </div>
    ${renderProbabilityList(group)}
    <div class="simulation-box">
      <div>
        <p class="eyebrow">Simulación</p>
        <h4>Si ${escapeHtml(selected.name)} realiza "${escapeHtml(pendingTask.name)}"</h4>
      </div>
      <div class="simulation-grid">
        <div class="simulation-cell">
          <small>Puntos actuales</small>
          <strong>${formatPoints(before)}</strong>
        </div>
        <div class="simulation-cell">
          <small>Dificultad</small>
          <strong>${formatPoints(pendingTask.difficulty)}</strong>
        </div>
        <div class="simulation-cell">
          <small>Resultado final</small>
          <strong>${formatPoints(after)}</strong>
        </div>
      </div>
      <p class="tiny-muted">Estado del grupo después: ${escapeHtml(afterStatus.label)} · diferencia ${formatPoints(afterStatus.difference)} puntos.</p>
      <div class="assignment-actions">
        <select id="manual-member-select" aria-label="Elegir integrante">
          ${group.members
            .map(
              (member) => `<option value="${member.id}" ${member.id === selected.id ? "selected" : ""}>${escapeHtml(member.name)}</option>`
            )
            .join("")}
        </select>
        <button class="primary-button" data-confirm-task type="button">Confirmar asignación</button>
      </div>
    </div>
  `;
}

function renderProbabilityList(group) {
  const probabilities = calculateProbabilities(group.members);

  if (!probabilities.length) return "";

  const hasEqualLoad =
    group.members.length > 1 &&
    new Set(group.members.map((member) => Number(member.points) || 0)).size === 1;
  const minPoints = Math.min(...group.members.map((member) => Number(member.points) || 0));
  const lowestLoadMembers = group.members.filter((member) => (Number(member.points) || 0) === minPoints);
  const probabilityNote = hasEqualLoad
    ? "Como las cargas están iguales, todos tienen la misma probabilidad."
    : lowestLoadMembers.length > 1
      ? `${lowestLoadMembers.length} integrantes comparten la menor carga; el sorteo reparte más chances entre ese grupo.`
      : "El peso favorece a quienes tienen menos puntos acumulados.";

  return `
    <div class="assignment-box">
      <p class="eyebrow">Probabilidades actuales</p>
      ${probabilities
        .map(
          (item) => `
            <div class="probability-row ${state.drawHighlightId === item.id ? "is-drawing" : ""} ${state.selectedMemberId === item.id && !state.drawInProgress ? "is-selected" : ""}" data-pick-member="${item.id}" role="button" tabindex="0">
              ${renderAvatar(item)}
              <div>
                <strong>${escapeHtml(item.name)}</strong>
                <div class="bar-track"><div class="bar-fill" style="width: ${item.probability}%"></div></div>
              </div>
              <strong>${item.probability}%</strong>
            </div>
          `
        )
        .join("")}
      <small>${probabilityNote}</small>
    </div>
  `;
}

function renderHistory(group) {
  if (!group || !group.history.length) {
    els.historyList.innerHTML = `<p class="empty-state">Aún no hay tareas completadas.</p>`;
    return;
  }

  els.historyList.innerHTML = group.history
    .map((record) => {
      const date = new Date(record.date).toLocaleString("es-UY", {
        dateStyle: "short",
        timeStyle: "short"
      });
      return `
        <div class="history-item">
          <div>
            <strong>${escapeHtml(record.taskName)}</strong>
            <small>Realizada por ${escapeHtml(record.memberName)} · ${date}</small>
          </div>
          <span class="points">+${formatPoints(record.pointsGained)}</span>
        </div>
      `;
    })
    .join("");
}

function renderRewards(group) {
  if (!group || !group.members.length) {
    els.rewardList.innerHTML = `<p class="empty-state">Las recompensas aparecerán cuando agregues integrantes.</p>`;
    return;
  }

  const effortSortedMembers = sortMembersByEffort(group.members);
  const topPoints = Math.max(...effortSortedMembers.map((member) => Number(member.points) || 0));

  els.rewardList.innerHTML = effortSortedMembers
    .map((member) => {
      const isLeader = topPoints > 0 && Number(member.points) === topPoints;

      return `
        <div class="reward-card ${rewardClass(member.rewards)} ${isLeader ? "is-leader" : ""}">
          <div class="member-top">
            ${renderAvatar(member)}
            <div>
              <strong>${escapeHtml(member.name)}</strong>
              <small>${formatPoints(member.points)} puntos</small>
            </div>
          </div>
          ${isLeader ? `<span class="effort-badge">Mayor esfuerzo</span>` : ""}
          <span class="reward-badge ${rewardClass(member.rewards)}">${escapeHtml(member.rewards)}</span>
          <div class="reward-progress" aria-label="Progreso de recompensa">
            <div style="width: ${nextRewardInfo(member.points).progress}%"></div>
          </div>
          <small>${escapeHtml(nextRewardInfo(member.points).label)}${nextRewardInfo(member.points).remaining ? `: ${formatPoints(nextRewardInfo(member.points).remaining)} pts` : ""}</small>
          <small>${member.tasksCompleted} tareas completadas</small>
        </div>
      `;
    })
    .join("");
}

function renderCelebration() {
  if (!state.celebration) {
    els.celebrationModal.classList.add("hidden");
    els.celebrationModal.innerHTML = "";
    return;
  }

  const rewardInfo = nextRewardInfo(state.celebration.totalPoints);
  const rewardTone = rewardClass(state.celebration.reward);

  els.celebrationModal.classList.remove("hidden");
  els.celebrationModal.innerHTML = `
    <div class="celebration-backdrop" data-close-celebration></div>
    <section class="celebration-card ${rewardTone}">
      <div class="burst" aria-hidden="true">
        <span></span><span></span><span></span><span></span><span></span><span></span>
      </div>
      <p class="eyebrow">Tarea completada</p>
      <h3>Felicitaciones, ${escapeHtml(state.celebration.memberName)}</h3>
      <p class="celebration-copy">
        Completaste "${escapeHtml(state.celebration.taskName)}" y sumaste
        <strong>${formatPoints(state.celebration.pointsGained)} puntos</strong>.
      </p>
      <div class="prize-box">
        <span>Premio actual</span>
        <strong>${escapeHtml(state.celebration.reward)}</strong>
      </div>
      <div class="reward-progress big" aria-label="Progreso al siguiente premio">
        <div style="width: ${rewardInfo.progress}%"></div>
      </div>
      <small>${escapeHtml(rewardInfo.label)}${rewardInfo.remaining ? `: ${formatPoints(rewardInfo.remaining)} pts` : ""}</small>
      <div class="assignment-actions">
        <button class="primary-button" data-close-celebration type="button">Seguir</button>
        <button class="secondary-button" data-open-rewards type="button">Ver recompensas</button>
      </div>
    </section>
  `;
}

function renderConfirmation() {
  if (!state.confirmation) {
    els.confirmModal.classList.add("hidden");
    els.confirmModal.innerHTML = "";
    return;
  }

  const busy = Boolean(state.confirmation.isBusy);

  els.confirmModal.classList.remove("hidden");
  els.confirmModal.innerHTML = `
    <div class="confirm-backdrop" data-close-confirm></div>
    <section class="confirm-card">
      <div class="confirm-icon" aria-hidden="true">!</div>
      <p class="eyebrow">Acción irreversible</p>
      <h3>${escapeHtml(state.confirmation.title)}</h3>
      <p>${escapeHtml(state.confirmation.message)}</p>
      ${state.confirmation.detail ? `<small>${escapeHtml(state.confirmation.detail)}</small>` : ""}
      <div class="assignment-actions confirm-actions">
        <button class="secondary-button" data-close-confirm type="button" ${busy ? "disabled" : ""}>Cancelar</button>
        <button class="danger-button confirm-danger" data-accept-confirm type="button" ${busy ? "disabled" : ""}>
          ${busy ? "Eliminando..." : escapeHtml(state.confirmation.confirmLabel)}
        </button>
      </div>
    </section>
  `;
}

function openConfirmation(config) {
  state.confirmation = {
    title: config.title,
    message: config.message,
    detail: config.detail || "",
    confirmLabel: config.confirmLabel || "Eliminar",
    isBusy: false,
    onConfirm: config.onConfirm
  };
  renderConfirmation();
}

function closeConfirmation() {
  if (state.confirmation?.isBusy) return;
  state.confirmation = null;
  renderConfirmation();
}

async function acceptConfirmation() {
  if (!state.confirmation || state.confirmation.isBusy) return;

  const action = state.confirmation.onConfirm;
  state.confirmation.isBusy = true;
  renderConfirmation();

  try {
    await action();
    state.confirmation = null;
    renderConfirmation();
  } catch (error) {
    state.confirmation.isBusy = false;
    renderConfirmation();
    showMessage(normalizeErrorMessage(error), "error");
  }
}

function getCurrentPendingTask(group) {
  if (!state.pendingTask) return null;
  return group.tasks.find((task) => task.id === state.pendingTask.id && !task.completed) || null;
}

function getSuggestedMember(members) {
  return [...members].sort((a, b) => {
    if (a.points !== b.points) return a.points - b.points;
    return a.tasksCompleted - b.tasksCompleted;
  })[0];
}

function formatNameList(names) {
  if (names.length <= 1) return names[0] || "";
  if (names.length === 2) return `${names[0]} y ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

function getSuggestionContext(members, suggestion) {
  const pointsValues = members.map((member) => Number(member.points) || 0);
  const taskValues = members.map((member) => Number(member.tasksCompleted) || 0);
  const allPointsEqual = new Set(pointsValues).size === 1;
  const allTasksEqual = new Set(taskValues).size === 1;
  const minPoints = Math.min(...pointsValues);
  const lowestLoadMembers = members.filter((member) => (Number(member.points) || 0) === minPoints);
  const lowestTaskValues = lowestLoadMembers.map((member) => Number(member.tasksCompleted) || 0);
  const tiedLowestTasks = new Set(lowestTaskValues).size === 1;
  const lowestLoadNames = formatNameList(lowestLoadMembers.map((member) => member.name));

  if (allPointsEqual && allTasksEqual && members.length > 1) {
    return {
      title: `Hay empate total entre los integrantes.`,
      reason: "El sorteo ponderado es ideal para desempatar sin elegir a dedo.",
      showSuggestionAction: false
    };
  }

  if (allPointsEqual && members.length > 1) {
    return {
      title: `Todos tienen los mismos puntos.`,
      reason: `${suggestion.name} aparece primero por tener menos tareas realizadas.`,
      showSuggestionAction: true
    };
  }

  if (lowestLoadMembers.length > 1 && tiedLowestTasks) {
    return {
      title: `${lowestLoadNames} están empatados en la menor carga.`,
      reason: `${lowestLoadMembers.length} integrantes tienen los mismos puntos mínimos; el sorteo ponderado puede desempatar.`,
      showSuggestionAction: false
    };
  }

  if (lowestLoadMembers.length > 1) {
    return {
      title: `${lowestLoadNames} comparten la menor carga.`,
      reason: `Entre ellos, ${suggestion.name} aparece primero por tener menos tareas realizadas.`,
      showSuggestionAction: true
    };
  }

  return {
    title: `${suggestion.name} debería hacer esta tarea.`,
    reason: "Motivo: tiene la menor carga acumulada del grupo.",
    showSuggestionAction: true
  };
}

function calculateProbabilities(members) {
  if (!members.length) return [];
  const maxPoints = Math.max(...members.map((member) => Number(member.points) || 0));
  const withWeights = members.map((member) => ({
    ...member,
    weight: Math.max(1, maxPoints + 5 - (Number(member.points) || 0))
  }));
  const totalWeight = withWeights.reduce((sum, member) => sum + member.weight, 0);

  return withWeights
    .map((member) => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar || null,
      probability: Math.round((member.weight / totalWeight) * 100)
    }))
    .sort((a, b) => {
      if (b.probability !== a.probability) return b.probability - a.probability;
      return String(a.name || "").localeCompare(String(b.name || ""), "es");
    });
}

function pickWeightedMember(members) {
  const maxPoints = Math.max(...members.map((member) => Number(member.points) || 0));
  const weighted = members.map((member) => ({
    ...member,
    weight: Math.max(1, maxPoints + 5 - (Number(member.points) || 0))
  }));
  const total = weighted.reduce((sum, member) => sum + member.weight, 0);
  let cursor = Math.random() * total;

  for (const member of weighted) {
    cursor -= member.weight;
    if (cursor <= 0) return member;
  }

  return weighted[weighted.length - 1];
}

function sleep(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function playDrawSound() {
  stopDrawSound();
  drawAudio = new Audio(DRAW_SOUND_URL);
  drawAudio.volume = 0.5;
  drawAudio.loop = true;
  drawAudio.play().catch(() => {
    drawAudio = null;
  });
}

function stopDrawSound() {
  if (!drawAudio) return;
  drawAudio.pause();
  drawAudio.currentTime = 0;
  drawAudio = null;
}

function playVictorySound() {
  stopVictorySound();
  victoryAudio = new Audio(VICTORY_SOUND_URL);
  victoryAudio.volume = 0.65;
  victoryAudio.play().catch(() => {
    victoryAudio = null;
  });
}

function stopVictorySound() {
  if (!victoryAudio) return;
  victoryAudio.pause();
  victoryAudio.currentTime = 0;
  victoryAudio = null;
}

async function fadeOutDrawSound(duration = 700) {
  if (!drawAudio) return;

  const audio = drawAudio;
  const steps = 10;
  const initialVolume = audio.volume;

  for (let step = 1; step <= steps; step += 1) {
    if (drawAudio !== audio) return;
    audio.volume = Math.max(0, initialVolume * (1 - step / steps));
    await sleep(duration / steps);
  }

  if (drawAudio === audio) {
    stopDrawSound();
  }
}

async function runWeightedDrawAnimation() {
  const group = activeGroup();
  const task = group ? getCurrentPendingTask(group) : null;

  if (!group || !task || !group.members.length || state.drawInProgress) return;

  state.drawInProgress = true;
  state.drawStatus = "Sorteando con prioridad para quienes tienen menos puntos...";
  playDrawSound();
  renderApp();

  try {
    const rounds = Math.max(10, group.members.length * 3);

    for (let index = 0; index < rounds; index += 1) {
      const member = group.members[index % group.members.length];
      state.drawHighlightId = member.id;
      state.selectedMemberId = member.id;
      state.drawStatus = `Evaluando a ${member.name}...`;
      renderApp();
      await sleep(90 + index * 12);
    }

    const winner = pickWeightedMember(group.members);
    state.drawHighlightId = winner.id;
    state.selectedMemberId = winner.id;
    state.drawStatus = `Resultado del sorteo: ${winner.name}`;
    renderApp();
    await sleep(1000);
  } finally {
    await fadeOutDrawSound(800);
    state.drawInProgress = false;
    state.drawHighlightId = null;
    renderApp();
  }
}

function simulateStatus(members, selectedMemberId, difficulty) {
  const simulated = members.map((member) => ({
    ...member,
    points: member.id === selectedMemberId ? Number((member.points + difficulty).toFixed(1)) : member.points
  }));
  const points = simulated.map((member) => Number(member.points) || 0);
  const difference = Math.max(...points) - Math.min(...points);

  if (difference <= 5) return { label: "Equilibrado", difference };
  if (difference <= 12) return { label: "En observación", difference };
  return { label: "Desbalanceado", difference };
}

function syncDifficultyInput() {
  if (!els.votesArea.querySelector("select[name='vote']")) {
    renderVoteInputs();
  }
}

function renderVoteInputs() {
  const group = activeGroup();

  if (!group) {
    els.votesArea.innerHTML = `<p class="empty-state">Crea o selecciona un grupo para cargar tareas.</p>`;
    updateDifficultyPreview();
    return;
  }

  if (!group.members.length) {
    els.votesArea.innerHTML = `<p class="empty-state">Agrega integrantes antes de crear tareas.</p>`;
    updateDifficultyPreview();
    return;
  }

  els.votesArea.innerHTML = renderVoteRow();
  updateDifficultyPreview();
}

function renderVoteRow() {
  return `
    <div class="vote-row">
      <span>
        <strong>Dificultad percibida</strong>
        <small>Tu voto para esta tarea</small>
      </span>
      <select name="vote" aria-label="Tu voto de dificultad">
        <option value="" selected>Elegir</option>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
        <option value="4">4</option>
        <option value="5">5</option>
      </select>
    </div>
  `;
}

function currentVotes() {
  return [...els.votesArea.querySelectorAll("select[name='vote']")]
    .map((select) => Number(select.value))
    .filter((vote) => Number.isFinite(vote) && vote >= 1 && vote <= 5);
}

function isSupportedImageFile(file) {
  const supportedTypes = ["image/png", "image/jpeg", "image/webp"];
  const supportedExtensions = [".png", ".jpg", ".jpeg", ".webp"];
  const fileName = String(file.name || "").toLowerCase();

  return supportedTypes.includes(file.type) || supportedExtensions.some((extension) => fileName.endsWith(extension));
}

function resizeImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("error", () => reject(new Error("No se pudo leer la imagen.")));
    reader.addEventListener("load", () => {
      const image = new Image();

      image.addEventListener("error", () => reject(new Error("El archivo elegido no parece ser una imagen válida.")));
      image.addEventListener("load", () => {
        const size = 360;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const sourceSize = Math.min(image.width, image.height);
        const sourceX = (image.width - sourceSize) / 2;
        const sourceY = (image.height - sourceSize) / 2;

        canvas.width = size;
        canvas.height = size;
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      });

      image.src = reader.result;
    });

    reader.readAsDataURL(file);
  });
}

function updateDifficultyPreview() {
  const votes = currentVotes();
  const difficulty = votes.length ? votes.reduce((sum, vote) => sum + vote, 0) / votes.length : null;
  els.difficultyPreview.textContent = difficulty === null ? "--" : difficulty.toFixed(1);
}

function clearPendingAssignmentPreview() {
  if (!state.pendingTask) return;
  state.pendingTask = null;
  state.selectedMemberId = null;
  state.drawHighlightId = null;
  state.drawStatus = "";
  state.drawInProgress = false;
  renderTasks(activeGroup());
  renderAssignment(activeGroup());
}

async function handleLogin(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = getFormData(form);

  if (!isValidEmail(formData.email)) {
    showMessage("Ingresá un email válido.", "error");
    return;
  }

  try {
    const payload = await api.login(formData);
    state.user = requireUser(payload);
    saveSession(state.user);
    form.reset();
    renderSession();
    await loadGroups();
    showMessage("Sesión iniciada correctamente.", "success");
  } catch (error) {
    showMessage(normalizeErrorMessage(error), "error");
  }
}

async function handleRegister(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = getFormData(form);

  if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
    showMessage("Todos los campos son obligatorios.", "error");
    return;
  }

  if (!isValidEmail(formData.email)) {
    showMessage("Ingresá un email válido.", "error");
    return;
  }

  if (formData.password !== formData.confirmPassword) {
    showMessage("La contraseña y la confirmación deben coincidir.", "error");
    return;
  }

  try {
    const payload = await api.register(formData);
    state.user = requireUser(payload);
    saveSession(state.user);
    form.reset();
    renderSession();
    await loadGroups();
    showMessage("Cuenta creada. Ya estás dentro de Equilibria.", "success");
  } catch (error) {
    if (error.status === 409) {
      setAuthMode("login");
      els.loginForm.elements.email.value = formData.email || "";
      els.loginForm.elements.password.focus();
      showMessage("Esa cuenta ya existe. Iniciá sesión con ese email y contraseña.", "error");
      return;
    }

    showMessage(normalizeErrorMessage(error), "error");
  }
}

async function handleProfilePhotoChange(event) {
  const file = event.target.files?.[0];

  if (!file || !state.user) return;

  if (!isSupportedImageFile(file)) {
    showMessage("Elegí una imagen PNG, JPG o WebP.", "error");
    event.target.value = "";
    return;
  }

  if (file.size > 6 * 1024 * 1024) {
    showMessage("La imagen es muy pesada. Elegí una foto de hasta 6 MB.", "error");
    event.target.value = "";
    return;
  }

  try {
    const avatar = await resizeImageFile(file);
    const payload = await api.updateAvatar(state.user.id, avatar);
    state.user = requireUser(payload);
    saveSession(state.user);
    renderSession();
    showMessage("Foto de perfil actualizada.", "success");
  } catch (error) {
    showMessage(normalizeErrorMessage(error), "error");
  } finally {
    event.target.value = "";
  }
}

async function handleMemberPhotoChange(event) {
  const input = event.target;
  const file = input.files?.[0];
  const group = activeGroup();
  const memberId = input.dataset.memberAvatar;

  if (!file || !group || !memberId) return;

  if (!isSupportedImageFile(file)) {
    showMessage("Elegí una imagen PNG, JPG o WebP.", "error");
    input.value = "";
    return;
  }

  if (file.size > 6 * 1024 * 1024) {
    showMessage("La imagen es muy pesada. Elegí una foto de hasta 6 MB.", "error");
    input.value = "";
    return;
  }

  try {
    const avatar = await resizeImageFile(file);
    const payload = await api.updateMemberAvatar(group.id, memberId, avatar);
    replaceGroup(requireGroup(payload));
    renderApp();
    showMessage("Foto del integrante actualizada.", "success");
  } catch (error) {
    showMessage(normalizeErrorMessage(error), "error");
  } finally {
    input.value = "";
  }
}

async function handleGroupCreate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!state.user) return;

  try {
    const data = getFormData(form);
    const payload = await api.createGroup({ userId: state.user.id, name: data.name });
    const group = requireGroup(payload);
    state.groups.push(group);
    state.activeGroupId = group.id;
    form.reset();
    state.pendingTask = null;
    state.selectedMemberId = null;
    state.activeView = "members";
    renderApp();
    showMessage("Grupo creado y seleccionado.", "success");
  } catch (error) {
    showMessage(normalizeErrorMessage(error), "error");
  }
}

async function handleMemberCreate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const group = activeGroup();

  if (!group) {
    showMessage("Primero crea o selecciona un grupo.", "error");
    return;
  }

  try {
    const payload = await api.addMember(group.id, getFormData(form));
    replaceGroup(requireGroup(payload));
    form.reset();
    state.activeView = "members";
    renderApp();
    showMessage("Integrante agregado.", "success");
  } catch (error) {
    showMessage(normalizeErrorMessage(error), "error");
  }
}

async function handleTaskCreate(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const group = activeGroup();

  if (!group) {
    showMessage("Primero crea o selecciona un grupo.", "error");
    return;
  }

  if (!group.members.length) {
    showMessage("Agrega integrantes antes de crear tareas.", "error");
    return;
  }

  if (!currentVotes().length) {
    showMessage("Elegí la dificultad de la tarea antes de guardarla.", "error");
    return;
  }

  try {
    const data = getFormData(form);
    const payload = await api.createTask(group.id, {
      name: data.name,
      votes: currentVotes()
    });
    replaceGroup(requireGroup(payload));
    state.pendingTask = payload.task;
    state.selectedMemberId = payload.suggestion?.id || group.members[0]?.id || null;
    state.drawHighlightId = null;
    state.drawStatus = "";
    state.drawInProgress = false;
    form.reset();
    renderVoteInputs();
    state.activeView = "tasks";
    renderApp();
    showMessage("Tarea guardada. Revisa la simulación antes de confirmar.", "success");
  } catch (error) {
    showMessage(normalizeErrorMessage(error), "error");
  }
}

async function completeSelectedTask() {
  const group = activeGroup();
  const task = group ? getCurrentPendingTask(group) : null;

  if (!group || !task || !state.selectedMemberId) {
    showMessage("Selecciona una tarea y un integrante para confirmar.", "error");
    return;
  }

  try {
    const payload = await api.completeTask(group.id, task.id, state.selectedMemberId);
    replaceGroup(requireGroup(payload));
    state.celebration = {
      memberName: payload.member.name,
      taskName: payload.task.name,
      pointsGained: payload.task.difficulty,
      totalPoints: payload.member.points,
      reward: payload.member.rewards
    };
    state.pendingTask = null;
    state.selectedMemberId = null;
    state.drawHighlightId = null;
    state.drawStatus = "";
    state.drawInProgress = false;
    renderApp();
    playVictorySound();
  } catch (error) {
    showMessage(normalizeErrorMessage(error), "error");
  }
}

async function deleteGroup(groupId) {
  const group = state.groups.find((entry) => entry.id === groupId);

  if (!group) {
    showMessage("No se encontró el grupo a eliminar.", "error");
    return;
  }

  openConfirmation({
    title: "Eliminar grupo",
    message: `¿Eliminar el grupo "${group.name}"?`,
    detail: "Se borrarán sus integrantes, tareas e historial.",
    confirmLabel: "Eliminar grupo",
    onConfirm: async () => {
      const wasActive = state.activeGroupId === groupId;
      await api.deleteGroup(groupId);
      state.groups = state.groups.filter((entry) => entry.id !== groupId);

      if (wasActive) {
        state.activeGroupId = state.groups[0]?.id || null;
        state.pendingTask = null;
        state.selectedMemberId = null;
        state.drawHighlightId = null;
        state.drawStatus = "";
        state.drawInProgress = false;
      }

      state.activeView = "groups";
      renderApp();
      showMessage(`Grupo "${group.name}" eliminado.`, "success");
    }
  });
}

async function deleteMember(memberId) {
  const group = activeGroup();
  const member = group?.members.find((entry) => entry.id === memberId);

  if (!group || !member) {
    showMessage("No se encontró el integrante a eliminar.", "error");
    return;
  }

  openConfirmation({
    title: "Eliminar integrante",
    message: `¿Eliminar a "${member.name}" del grupo?`,
    detail: "El historial ya registrado se conservará.",
    confirmLabel: "Eliminar integrante",
    onConfirm: async () => {
      const payload = await api.deleteMember(group.id, memberId);
      const updatedGroup = requireGroup(payload);
      replaceGroup(updatedGroup);

      if (state.selectedMemberId === memberId) {
        state.selectedMemberId = getSuggestedMember(updatedGroup.members)?.id || null;
      }

      state.activeView = "members";
      renderApp();
      showMessage(`Integrante "${member.name}" eliminado.`, "success");
    }
  });
}

function replaceGroup(updatedGroup) {
  state.groups = state.groups.map((group) => (group.id === updatedGroup.id ? updatedGroup : group));
}

function bindEvents() {
  els.showLogin.addEventListener("click", () => setAuthMode("login"));
  els.showRegister.addEventListener("click", () => setAuthMode("register"));
  els.loginForm.addEventListener("submit", handleLogin);
  els.registerForm.addEventListener("submit", handleRegister);
  els.groupForm.addEventListener("submit", handleGroupCreate);
  els.memberForm.addEventListener("submit", handleMemberCreate);
  els.taskForm.addEventListener("submit", handleTaskCreate);
  els.profilePhotoInput.addEventListener("change", handleProfilePhotoChange);
  els.logoutButton.addEventListener("click", () => {
    stopDrawSound();
    stopVictorySound();
    state.user = null;
    state.groups = [];
    state.activeGroupId = null;
    state.pendingTask = null;
    state.selectedMemberId = null;
    state.drawHighlightId = null;
    state.drawStatus = "";
    state.drawInProgress = false;
    state.celebration = null;
    state.confirmation = null;
    clearSession();
    renderApp();
    showMessage("Sesión cerrada.", "info");
  });

  els.votesArea.addEventListener("change", () => {
    updateDifficultyPreview();
    clearPendingAssignmentPreview();
  });

  els.taskForm.addEventListener("input", (event) => {
    if (event.target.matches("input[name='name']")) {
      clearPendingAssignmentPreview();
    }
  });

  document.addEventListener("click", (event) => {
    const groupButton = event.target.closest("[data-select-group]");
    const deleteGroupButton = event.target.closest("[data-delete-group]");
    const deleteMemberButton = event.target.closest("[data-delete-member]");
    const taskButton = event.target.closest("[data-select-task]");
    const pickButton = event.target.closest("[data-pick-member]");
    const drawButton = event.target.closest("[data-weighted-draw]");
    const confirmButton = event.target.closest("[data-confirm-task]");
    const closeCelebrationButton = event.target.closest("[data-close-celebration]");
    const openRewardsButton = event.target.closest("[data-open-rewards]");
    const closeConfirmButton = event.target.closest("[data-close-confirm]");
    const acceptConfirmButton = event.target.closest("[data-accept-confirm]");
    const navLink = event.target.closest(".nav-link");

    if (closeConfirmButton) {
      closeConfirmation();
      return;
    }

    if (acceptConfirmButton) {
      acceptConfirmation();
      return;
    }

    if (closeCelebrationButton) {
      stopVictorySound();
      state.celebration = null;
      renderCelebration();
      return;
    }

    if (openRewardsButton) {
      stopVictorySound();
      state.celebration = null;
      state.activeView = "rewards";
      renderApp();
      return;
    }

    if (deleteGroupButton) {
      deleteGroup(deleteGroupButton.dataset.deleteGroup);
      return;
    }

    if (deleteMemberButton) {
      deleteMember(deleteMemberButton.dataset.deleteMember);
      return;
    }

    if (groupButton) {
      state.activeGroupId = groupButton.dataset.selectGroup;
      state.pendingTask = null;
      state.selectedMemberId = null;
      state.drawHighlightId = null;
      state.drawStatus = "";
      state.drawInProgress = false;
      state.activeView = "dashboard";
      renderApp();
    }

    if (taskButton) {
      const group = activeGroup();
      state.pendingTask = group.tasks.find((task) => task.id === taskButton.dataset.selectTask);
      state.selectedMemberId = getSuggestedMember(group.members)?.id || null;
      state.drawHighlightId = null;
      state.drawStatus = "";
      state.drawInProgress = false;
      state.activeView = "tasks";
      renderApp();
    }

    if (pickButton) {
      state.selectedMemberId = pickButton.dataset.pickMember;
      state.drawHighlightId = null;
      state.drawStatus = "";
      renderApp();
    }

    if (drawButton) {
      runWeightedDrawAnimation();
    }

    if (confirmButton) {
      completeSelectedTask();
    }

    if (navLink) {
      event.preventDefault();
      setActiveView(navLink.dataset.target);
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-member-avatar]")) {
      handleMemberPhotoChange(event);
      return;
    }

    if (event.target.id === "manual-member-select") {
      state.selectedMemberId = event.target.value;
      state.drawHighlightId = null;
      state.drawStatus = "";
      renderApp();
    }
  });

  document.addEventListener("keydown", (event) => {
    const pickRow = event.target.closest(".probability-row[data-pick-member]");
    if (!pickRow || !["Enter", " "].includes(event.key)) return;

    event.preventDefault();
    state.selectedMemberId = pickRow.dataset.pickMember;
    state.drawHighlightId = null;
    state.drawStatus = "";
    renderApp();
  });
}

window.addEventListener("error", (event) => {
  showMessage(normalizeErrorMessage(event.error || event.message), "error");
});

window.addEventListener("unhandledrejection", (event) => {
  showMessage(normalizeErrorMessage(event.reason), "error");
});

async function boot() {
  bindEvents();
  renderVoteInputs();
  const storedUser = localStorage.getItem("equilibria:user");

  if (storedUser) {
    try {
      state.user = JSON.parse(storedUser);
      renderSession();
      await loadGroups();
    } catch (error) {
      clearSession();
      state.user = null;
      renderSession();
      showMessage("La sesión guardada no se pudo recuperar. Iniciá sesión de nuevo.", "error");
    }
  } else {
    renderSession();
  }
}

boot();
