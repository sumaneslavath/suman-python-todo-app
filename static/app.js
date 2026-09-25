let currentFilter = "all";

const form = document.getElementById("taskForm");
const taskId = document.getElementById("taskId");
const title = document.getElementById("title");
const description = document.getElementById("description");
const dueDate = document.getElementById("dueDate");
const cancelBtn = document.getElementById("cancelBtn");
const formTitle = document.getElementById("formTitle");
const saveBtn = document.getElementById("saveBtn");
const taskList = document.getElementById("taskList");

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[c]));
}

function dateOnly(value) {
  return new Date(value + "T00:00:00");
}

function dateStatus(task) {
  if (task.status === "completed") return "";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = dateOnly(task.dueDate);

  if (due < today) return "overdue";

  const threeDays = new Date(today);
  threeDays.setDate(today.getDate() + 3);
  if (due <= threeDays) return "due-soon";

  return "";
}

async function updateStats() {
  const response = await fetch("/api/tasks?filter=all");
  if (!response.ok) return;
  const tasks = await response.json();
  document.getElementById("totalCount").textContent = tasks.length;
  document.getElementById("pendingCount").textContent =
    tasks.filter(t => t.status === "pending").length;
  document.getElementById("completedCount").textContent =
    tasks.filter(t => t.status === "completed").length;
}

function renderTasks(tasks) {
  if (!tasks.length) {
    taskList.innerHTML = `<div class="empty">No ${currentFilter === "all" ? "" : currentFilter + " "}tasks found.</div>`;
    return;
  }

  taskList.innerHTML = tasks.map(task => {
    const ds = dateStatus(task);
    const dateBadge = ds === "overdue"
      ? '<span class="badge overdue">OVERDUE</span>'
      : ds === "due-soon"
        ? '<span class="badge due-soon">DUE WITHIN 3 DAYS</span>'
        : "";
    const statusBadge = task.status === "completed"
      ? '<span class="badge completed">COMPLETED</span>'
      : '<span class="badge pending">PENDING</span>';

    return `
      <article class="task-card ${task.status === "completed" ? "completed" : ""} ${ds}">
        <div class="task-row">
          <div class="check-wrap">
            <input type="checkbox" ${task.status === "completed" ? "checked" : ""}
              onchange="toggleComplete(${task.id})" aria-label="Toggle task completion">
          </div>
          <div class="task-content">
            <div class="task-top">
              <h3 class="task-title">${escapeHtml(task.title)}</h3>
              <div>${statusBadge} ${dateBadge}</div>
            </div>
            <p class="description">${escapeHtml(task.description || "No description")}</p>
            <div class="meta">📅 Due: ${escapeHtml(task.dueDate)}</div>
            <div class="actions">
              <button class="action edit" onclick="editTask(${task.id})">Edit</button>
              <button class="action delete" onclick="deleteTask(${task.id})">Delete</button>
            </div>
          </div>
        </div>
      </article>`;
  }).join("");
}

async function loadTasks() {
  const response = await fetch(`/api/tasks?filter=${currentFilter}`);
  const tasks = await response.json();
  renderTasks(tasks);
  await updateStats();
}

form.addEventListener("submit", async event => {
  event.preventDefault();

  const payload = {
    title: title.value.trim(),
    description: description.value.trim(),
    dueDate: dueDate.value
  };

  const id = taskId.value;
  const response = await fetch(id ? `/api/tasks/${id}` : "/api/tasks", {
    method: id ? "PUT" : "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    alert(error.error || "Unable to save task.");
    return;
  }

  resetForm();
  await loadTasks();
});

async function toggleComplete(id) {
  const response = await fetch(`/api/tasks/${id}/complete`, {method: "PATCH"});
  if (!response.ok) {
    alert("Unable to update task.");
    return;
  }
  await loadTasks();
}

async function deleteTask(id) {
  if (!confirm("Delete this task?")) return;
  const response = await fetch(`/api/tasks/${id}`, {method: "DELETE"});
  if (!response.ok) {
    alert("Unable to delete task.");
    return;
  }
  await loadTasks();
}

async function editTask(id) {
  const response = await fetch("/api/tasks?filter=all");
  const tasks = await response.json();
  const task = tasks.find(t => t.id === id);
  if (!task) return;

  taskId.value = task.id;
  title.value = task.title;
  description.value = task.description || "";
  dueDate.value = task.dueDate;
  formTitle.textContent = "Edit Task";
  saveBtn.textContent = "✓ Update Task";
  cancelBtn.classList.remove("hidden");
  window.scrollTo({top: 0, behavior: "smooth"});
}

function resetForm() {
  form.reset();
  taskId.value = "";
  formTitle.textContent = "Add a New Task";
  saveBtn.textContent = "＋ Add Task";
  cancelBtn.classList.add("hidden");
}

cancelBtn.addEventListener("click", resetForm);

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
    button.classList.add("active");
    currentFilter = button.dataset.filter;
    loadTasks();
  });
});

loadTasks();
