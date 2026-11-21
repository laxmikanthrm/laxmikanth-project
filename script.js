// To-Do List - plain JavaScript, tasks saved in the browser's localStorage
const STORAGE_KEY = "todo-list-tasks";

const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const list = document.getElementById("task-list");
const emptyMessage = document.getElementById("empty-message");
const counter = document.getElementById("counter");
const clearDoneBtn = document.getElementById("clear-done");
const filterButtons = document.querySelectorAll(".filter");

let tasks = loadTasks();
let currentFilter = "all";

// ---- Storage (wrapped in try/catch: some browsers block localStorage) ----
function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch (err) {
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (err) {
    console.warn("Could not save tasks:", err);
  }
}

// ---- Actions ----
function addTask(text) {
  tasks.push({ id: Date.now() + Math.random(), text: text, done: false });
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = tasks.find((t) => t.id === id);
  if (task) task.done = !task.done;
  saveTasks();
  render();
}

function editTask(id, newText) {
  const task = tasks.find((t) => t.id === id);
  if (task && newText.trim() !== "") task.text = newText.trim();
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks();
  render();
}

function clearDone() {
  tasks = tasks.filter((t) => !t.done);
  saveTasks();
  render();
}

// ---- Display ----
function startEditing(li, task) {
  const span = li.querySelector(".task-text");
  const field = document.createElement("input");
  field.type = "text";
  field.className = "edit-input";
  field.value = task.text;
  field.maxLength = 200;
  span.replaceWith(field);
  field.focus();
  field.select();

  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    if (save) editTask(task.id, field.value);
    else render();
  };
  field.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  field.addEventListener("blur", () => finish(true));
}

function render() {
  list.innerHTML = "";

  const visible = tasks.filter((t) => {
    if (currentFilter === "active") return !t.done;
    if (currentFilter === "done") return t.done;
    return true;
  });

  visible.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task" + (task.done ? " done" : "");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.setAttribute("aria-label", "Mark task as done");
    checkbox.addEventListener("change", () => toggleTask(task.id));

    const span = document.createElement("span");
    span.className = "task-text";
    span.textContent = task.text; // textContent prevents HTML injection
    span.title = "Double-click to edit";
    span.addEventListener("dblclick", () => startEditing(li, task));

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon-btn edit-btn";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => startEditing(li, task));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "icon-btn delete-btn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", () => deleteTask(task.id));

    li.append(checkbox, span, editBtn, delBtn);
    list.appendChild(li);
  });

  emptyMessage.hidden = visible.length !== 0;
  emptyMessage.textContent = tasks.length === 0 ? "No tasks yet. Add one above!" : "No tasks in this view.";

  const left = tasks.filter((t) => !t.done).length;
  const doneCount = tasks.length - left;
  counter.textContent = tasks.length ? `${left} task${left === 1 ? "" : "s"} left` : "";
  clearDoneBtn.hidden = doneCount === 0;
}

// ---- Events ----
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (text === "") {
    input.focus();
    return;
  }
  addTask(text);
  input.value = "";
  input.focus();
});

filterButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach((b) => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-pressed", b === btn);
    });
    render();
  });
});

clearDoneBtn.addEventListener("click", clearDone);

// Keep several open tabs in sync
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    tasks = loadTasks();
    render();
  }
});

render();
