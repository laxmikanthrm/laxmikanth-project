"use strict";
/*
 * To-Do List — plain JavaScript, no libraries.
 * All tasks are saved in this browser's localStorage, so they are still
 * there after the page is refreshed. There is no server and no login.
 *
 * Sections:
 *   1. Settings and icons        6. Showing the list (render)
 *   2. Page elements and state   7. Editing, details and subtasks
 *   3. Saving and loading        8. Drag and drop
 *   4. Dates                     9. Reminders, theme, export/import
 *   5. Task actions             10. Events and start-up
 */

/* ===================== 1. Settings and icons ===================== */
const STORAGE_KEY = "todo-list-tasks";
const FILTER_KEY = "todo-list-filter";
const THEME_KEY = "todo-list-theme";

const PRIORITIES = { high: "High", medium: "Medium", low: "Low" };
const CATEGORIES = ["Work", "Personal", "Shopping", "Other"];
const REPEATS = { none: "Doesn't repeat", daily: "Daily", weekly: "Weekly", monthly: "Monthly" };
const FILTERS = ["all", "active", "completed"];

// Icons drawn in the style of the free Lucide icon set (inline SVG, no download needed)
const ICONS = {
  grip: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  repeat: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  tag: '<path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  listChecks: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8M13 12h8M13 18h8"/>',
};

function icon(name) {
  return '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + "</svg>";
}

/* ===================== 2. Page elements and state ===================== */
const $ = (selector) => document.querySelector(selector);

const els = {
  form: $("#task-form"),
  input: $("#task-input"),
  due: $("#new-due"),
  time: $("#new-time"),
  priority: $("#new-priority"),
  category: $("#new-category"),
  repeat: $("#new-repeat"),
  list: $("#task-list"),
  empty: $("#empty-state"),
  emptyEmoji: $("#empty-emoji"),
  emptyTitle: $("#empty-title"),
  emptyText: $("#empty-text"),
  counter: $("#counter"),
  clearCompleted: $("#clear-completed"),
  search: $("#search"),
  categoryFilter: $("#category-filter"),
  filterButtons: document.querySelectorAll(".filter"),
  progressBar: $("#progress-bar"),
  progressFill: $("#progress-fill"),
  progressText: $("#progress-text"),
  today: $("#today"),
  themeToggle: $("#theme-toggle"),
  remindersBtn: $("#reminders-btn"),
  exportJson: $("#export-json"),
  exportCsv: $("#export-csv"),
  importBtn: $("#import-btn"),
  importFile: $("#import-file"),
  toast: $("#toast"),
  toastText: $("#toast-text"),
  toastUndo: $("#toast-undo"),
};

let tasks = loadTasks();
let statusFilter = loadFilter();
let categoryFilter = "all";
let searchText = "";
const expanded = new Set();   // ids of tasks whose details panel is open
let justAddedId = null;       // used for the fade-in animation
let focusAfterRender = null;  // { id, selector } to put the cursor back after re-drawing
let isDragging = false;

/* Small helper to create an element: el("button", { class: "x", text: "Hi", onclick: fn }, [children]) */
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;          // textContent = safe, no HTML injection
    else if (key === "html") node.innerHTML = value;            // only used for our own icon strings
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? "" : value);
  }
  node.append(...children);
  return node;
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function findTask(id) {
  return tasks.find((t) => t.id === id);
}

function shorten(text, max = 40) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/* ===================== 3. Saving and loading ===================== */
// localStorage can throw (e.g. blocked in some private windows), so every use is wrapped in try/catch.
function storageGet(key) {
  try { return localStorage.getItem(key); } catch (err) { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch (err) { console.warn("Could not save:", err); }
}

function loadTasks() {
  try {
    const data = JSON.parse(storageGet(STORAGE_KEY));
    return Array.isArray(data) ? data.map(normalizeTask).filter(Boolean) : [];
  } catch (err) {
    return [];
  }
}

function saveTasks() {
  storageSet(STORAGE_KEY, JSON.stringify(tasks));
}

function loadFilter() {
  const saved = storageGet(FILTER_KEY);
  if (saved === "done") return "completed"; // name used by an older version
  return FILTERS.includes(saved) ? saved : "all";
}

/* Makes sure every task has all fields with valid values.
   Also upgrades tasks saved by older versions of the app. */
function normalizeTask(raw) {
  if (!raw || typeof raw.text !== "string" || raw.text.trim() === "") return null;
  const isOneOf = (value, list) => list.includes(value);
  return {
    id: raw.id !== undefined && raw.id !== null ? String(raw.id) : newId(),
    text: raw.text.trim().slice(0, 200),
    done: Boolean(raw.done),
    due: /^\d{4}-\d{2}-\d{2}$/.test(raw.due) ? raw.due : "",
    time: /^\d{2}:\d{2}$/.test(raw.time) ? raw.time : "",
    priority: isOneOf(raw.priority, Object.keys(PRIORITIES)) ? raw.priority : "medium",
    category: isOneOf(raw.category, CATEGORIES) ? raw.category : "Other",
    repeat: isOneOf(raw.repeat, Object.keys(REPEATS)) ? raw.repeat : "none",
    subtasks: Array.isArray(raw.subtasks)
      ? raw.subtasks
          .filter((s) => s && typeof s.text === "string" && s.text.trim() !== "")
          .map((s) => ({ id: s.id ? String(s.id) : newId(), text: s.text.trim().slice(0, 200), done: Boolean(s.done) }))
      : [],
    notified: Boolean(raw.notified),
  };
}

/* ===================== 4. Dates ===================== */
const pad = (n) => String(n).padStart(2, "0");

// "2026-11-21" style key for a date in the user's own time zone
function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dueDateTime(task) {
  const when = parseDateKey(task.due);
  if (task.time) {
    const [h, m] = task.time.split(":").map(Number);
    when.setHours(h, m, 0, 0);
  }
  return when;
}

function addRepeat(key, repeat) {
  const d = parseDateKey(key);
  if (repeat === "daily") d.setDate(d.getDate() + 1);
  if (repeat === "weekly") d.setDate(d.getDate() + 7);
  if (repeat === "monthly") {
    const day = d.getDate();
    d.setMonth(d.getMonth() + 1);
    if (d.getDate() !== day) d.setDate(0); // e.g. Jan 31 -> Feb 28
  }
  return dateKey(d);
}

// Next due date of a repeating task: never in the past
function nextDueDate(task) {
  const today = dateKey(new Date());
  let next = addRepeat(task.due || today, task.repeat);
  while (next < today) next = addRepeat(next, task.repeat);
  return next;
}

// Text and status ("overdue", "today", "upcoming") for the due-date badge
function dueInfo(task) {
  if (!task.due) return null;
  const now = new Date();
  const today = dateKey(now);
  const tomorrow = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1));
  const date = dueDateTime(task);

  let label;
  if (task.due === today) label = "Today";
  else if (task.due === tomorrow) label = "Tomorrow";
  else {
    const options = { weekday: "short", month: "short", day: "numeric" };
    if (date.getFullYear() !== now.getFullYear()) options.year = "numeric";
    label = date.toLocaleDateString(undefined, options);
  }
  if (task.time) label += ", " + date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  let status = "upcoming";
  if (!task.done) {
    const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (task.due < today || (task.due === today && task.time && task.time < nowTime)) status = "overdue";
    else if (task.due === today) status = "today";
  }
  if (status === "overdue") label = "Overdue · " + label;
  return { label, status };
}

function isPastDue(task) {
  return Boolean(task.due && task.time && dueDateTime(task) <= new Date());
}

/* ===================== 5. Task actions ===================== */
function addTask(fields) {
  const task = normalizeTask({ ...fields, id: newId() });
  if (!task) return;
  if (task.time && !task.due) task.due = dateKey(new Date()); // a time without a date means today
  task.notified = isPastDue(task); // don't send a reminder for a time that has already passed
  tasks.push(task);
  justAddedId = task.id;

  // Make sure the new task is visible (e.g. if the "Completed" filter or a search is on)
  if (!getVisibleTasks().includes(task)) {
    searchText = "";
    els.search.value = "";
    categoryFilter = "all";
    els.categoryFilter.value = "all";
    setStatusFilter("all", false);
  }
  saveTasks();
  render();
}

function updateTask(id, changes) {
  const task = findTask(id);
  if (!task) return;
  Object.assign(task, changes);
  if ("due" in changes || "time" in changes) {
    if (task.time && !task.due) task.due = dateKey(new Date());
    task.notified = isPastDue(task);
  }
  saveTasks();
  render();
}

function toggleTask(id) {
  const task = findTask(id);
  if (!task) return;
  task.done = !task.done;

  // Completing a repeating task creates the next one
  if (task.done && task.repeat !== "none") {
    const next = {
      ...task,
      id: newId(),
      done: false,
      due: nextDueDate(task),
      subtasks: task.subtasks.map((s) => ({ ...s, id: newId(), done: false })),
    };
    next.notified = isPastDue(next);
    tasks.splice(tasks.indexOf(task) + 1, 0, next);
    justAddedId = next.id;
    showToast(`Next "${shorten(task.text, 24)}" added for ${dueInfo(next).label}`);
  }
  saveTasks();
  render();
}

// Deleting keeps a copy of the list so the user can press Undo
function deleteTask(id) {
  const task = findTask(id);
  if (!task) return;
  const before = JSON.stringify(tasks);
  tasks = tasks.filter((t) => t.id !== id);
  expanded.delete(id);
  saveTasks();
  render();
  showToast(`Deleted "${shorten(task.text, 30)}"`, () => restore(before));
}

function clearCompleted() {
  const count = tasks.filter((t) => t.done).length;
  if (count === 0) return;
  const before = JSON.stringify(tasks);
  tasks = tasks.filter((t) => !t.done);
  saveTasks();
  render();
  showToast(`Cleared ${plural(count, "completed task")}`, () => restore(before));
}

function restore(savedJson) {
  tasks = JSON.parse(savedJson);
  saveTasks();
  render();
}

function setStatusFilter(filter, rerender = true) {
  statusFilter = FILTERS.includes(filter) ? filter : "all";
  storageSet(FILTER_KEY, statusFilter);
  els.filterButtons.forEach((btn) => {
    const isCurrent = btn.dataset.filter === statusFilter;
    btn.classList.toggle("active", isCurrent);
    btn.setAttribute("aria-pressed", String(isCurrent));
  });
  if (rerender) render();
}

/* ===================== 6. Showing the list (render) ===================== */
function getVisibleTasks() {
  const query = searchText.trim().toLowerCase();
  return tasks.filter((t) => {
    if (statusFilter === "active" && t.done) return false;
    if (statusFilter === "completed" && !t.done) return false;
    if (categoryFilter !== "all" && t.category !== categoryFilter) return false;
    if (query) {
      const inText = t.text.toLowerCase().includes(query);
      const inSubtasks = t.subtasks.some((s) => s.text.toLowerCase().includes(query));
      if (!inText && !inSubtasks) return false;
    }
    return true;
  });
}

// Re-draws the whole list from the `tasks` array. Simple and easy to follow.
function render() {
  const visible = getVisibleTasks();
  els.list.replaceChildren(...visible.map(buildTaskItem));
  justAddedId = null;

  renderEmptyState(visible.length);
  renderCounts();

  if (focusAfterRender) {
    const item = els.list.querySelector(`[data-id="${CSS.escape(focusAfterRender.id)}"]`);
    const target = item && item.querySelector(focusAfterRender.selector);
    if (target) target.focus();
    focusAfterRender = null;
  }
}

function renderEmptyState(visibleCount) {
  els.empty.hidden = visibleCount > 0;
  if (visibleCount > 0) return;

  let emoji = "🎉", title = "Nothing to do", text = "Add your first task above.";
  if (tasks.length > 0) {
    if (searchText.trim() || categoryFilter !== "all") {
      emoji = "🔍"; title = "No matching tasks"; text = "Try another search word or category.";
    } else if (statusFilter === "active") {
      emoji = "🎉"; title = "Nothing to do"; text = "Every task is completed. Well done!";
    } else if (statusFilter === "completed") {
      emoji = "✅"; title = "No completed tasks yet"; text = "Tick a task to mark it as completed.";
    }
  }
  els.emptyEmoji.textContent = emoji;
  els.emptyTitle.textContent = title;
  els.emptyText.textContent = text;
}

function renderCounts() {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.done).length;
  const left = total - completed;

  $("#count-all").textContent = total;
  $("#count-active").textContent = left;
  $("#count-completed").textContent = completed;

  els.counter.textContent = total ? `${plural(left, "task")} left` : "";
  els.clearCompleted.hidden = completed === 0;

  const percent = total ? Math.round((completed / total) * 100) : 0;
  els.progressFill.style.width = percent + "%";
  els.progressBar.setAttribute("aria-valuenow", percent);
  els.progressText.textContent = total ? `${percent}% done · ${completed} of ${total} completed` : "No tasks yet";
}

function badge(className, iconName, label) {
  const node = el("span", { class: "badge " + className, html: icon(iconName) });
  node.append(document.createTextNode(label));
  return node;
}

function buildTaskItem(task) {
  const info = dueInfo(task);
  const isOpen = expanded.has(task.id);
  let classes = `task priority-${task.priority}`;
  if (task.done) classes += " done";
  if (info && info.status === "overdue") classes += " overdue";
  if (task.id === justAddedId) classes += " entering";

  const li = el("li", { class: classes, "data-id": task.id });
  li.addEventListener("animationend", () => li.classList.remove("entering"));

  const handle = el("button", {
    type: "button",
    class: "drag-handle",
    title: "Drag to reorder (or focus and use the arrow keys)",
    "aria-label": `Move "${task.text}" (use the up and down arrow keys)`,
    html: icon("grip"),
    onpointerdown: (e) => startDrag(e, li),
    onkeydown: (e) => moveWithKeys(e, task.id),
  });

  const check = el("input", {
    type: "checkbox",
    class: "check task-check",
    "aria-label": `Mark "${task.text}" as completed`,
    onchange: () => toggleTask(task.id),
  });
  check.checked = task.done;

  const text = el("span", {
    class: "task-text",
    text: task.text,
    title: "Double-click to edit",
    ondblclick: () => startEditing(li, task),
  });

  const meta = el("div", { class: "task-meta" });
  meta.append(badge(`priority-badge ${task.priority}`, "flag", PRIORITIES[task.priority]));
  meta.append(badge("category-badge", "tag", task.category));
  if (info) meta.append(badge(`due-badge ${info.status}`, "calendar", info.label));
  if (task.repeat !== "none") meta.append(badge("repeat-badge", "repeat", REPEATS[task.repeat]));
  if (task.subtasks.length) {
    const doneSteps = task.subtasks.filter((s) => s.done).length;
    meta.append(badge("subtask-badge", "listChecks", `${doneSteps}/${task.subtasks.length}`));
  }

  const actions = el("div", { class: "task-actions" }, [
    el("button", {
      type: "button",
      class: "icon-btn details-btn" + (isOpen ? " open" : ""),
      "aria-expanded": String(isOpen),
      "aria-label": "Details and subtasks",
      title: "Details and subtasks",
      html: icon("chevron"),
      onclick: () => {
        if (isOpen) expanded.delete(task.id);
        else expanded.add(task.id);
        render();
      },
    }),
    el("button", {
      type: "button",
      class: "icon-btn edit-btn",
      "aria-label": "Edit task",
      title: "Edit",
      html: icon("pencil"),
      onclick: () => startEditing(li, task),
    }),
    el("button", {
      type: "button",
      class: "icon-btn delete-btn",
      "aria-label": "Delete task",
      title: "Delete",
      html: icon("trash"),
      onclick: () => removeWithAnimation(li, () => deleteTask(task.id)),
    }),
  ]);

  li.append(handle, check, el("div", { class: "task-body" }, [text, meta]), actions);
  if (isOpen) li.append(buildDetails(task));
  return li;
}

function removeWithAnimation(li, done) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return done();
  li.classList.add("leaving");
  setTimeout(done, 240);
}

/* ===================== 7. Editing, details and subtasks ===================== */
// Swap the task text for an input box. Enter saves, Esc cancels.
function startEditing(li, task) {
  const span = li.querySelector(".task-text");
  if (!span) return;
  const field = el("input", { type: "text", class: "edit-input", value: task.text, maxlength: "200", "aria-label": "Edit task" });
  span.replaceWith(field);
  field.focus();
  field.select();

  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    const value = field.value.trim();
    if (save && value && value !== task.text) updateTask(task.id, { text: value });
    else render();
  };
  field.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); finish(true); }
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); finish(false); }
  });
  field.addEventListener("blur", () => finish(true));
}

function selectBox(options, current, onChange) {
  const select = el("select", { onchange: (e) => onChange(e.target.value) });
  for (const [value, label] of options) {
    const option = el("option", { value, text: label });
    if (value === current) option.selected = true;
    select.append(option);
  }
  return select;
}

function field(label, control) {
  return el("label", { class: "field" }, [el("span", { text: label }), control]);
}

function buildDetails(task) {
  const due = el("input", { type: "date", value: task.due, onchange: (e) => updateTask(task.id, { due: e.target.value }) });
  const time = el("input", { type: "time", value: task.time, onchange: (e) => updateTask(task.id, { time: e.target.value }) });
  const priority = selectBox(Object.entries(PRIORITIES), task.priority, (v) => updateTask(task.id, { priority: v }));
  const category = selectBox(CATEGORIES.map((c) => [c, c]), task.category, (v) => updateTask(task.id, { category: v }));
  const repeat = selectBox(Object.entries(REPEATS), task.repeat, (v) => updateTask(task.id, { repeat: v }));

  const steps = el("ul", { class: "subtasks" }, task.subtasks.map((step) => {
    const box = el("input", {
      type: "checkbox",
      class: "check small",
      "aria-label": `Mark step "${step.text}" as done`,
      onchange: () => { step.done = !step.done; saveTasks(); render(); },
    });
    box.checked = step.done;
    return el("li", { class: "subtask" + (step.done ? " done" : "") }, [
      box,
      el("span", { text: step.text }),
      el("button", {
        type: "button",
        class: "icon-btn remove-step",
        "aria-label": `Remove step "${step.text}"`,
        title: "Remove step",
        html: icon("x"),
        onclick: () => { task.subtasks = task.subtasks.filter((s) => s !== step); saveTasks(); render(); },
      }),
    ]);
  }));

  const stepInput = el("input", {
    type: "text",
    class: "subtask-input",
    placeholder: "Add a step and press Enter",
    maxlength: "200",
    "aria-label": "Add a subtask",
    onkeydown: (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = e.target.value.trim();
        if (!value) return;
        task.subtasks.push({ id: newId(), text: value, done: false });
        focusAfterRender = { id: task.id, selector: ".subtask-input" };
        saveTasks();
        render();
      } else if (e.key === "Escape") {
        e.target.value = "";
        e.target.blur();
      }
    },
  });

  return el("div", { class: "task-details" }, [
    el("div", { class: "detail-fields" }, [
      field("Due date", due), field("Time", time), field("Priority", priority),
      field("Category", category), field("Repeat", repeat),
    ]),
    el("div", { class: "subtask-section" }, [el("h3", { text: "Subtasks" }), steps, stepInput]),
  ]);
}

/* ===================== 8. Drag and drop ===================== */
// Uses pointer events, so it works with a mouse and with a finger on a phone.
function startDrag(event, li) {
  if (event.button !== 0) return;
  event.preventDefault();
  li.classList.add("dragging");
  isDragging = true;

  // Listen on the whole page: moving the row in the list would cancel a "pointer capture" on the handle.
  const onMove = (e) => {
    const others = [...els.list.children].filter((item) => item !== li);
    const before = others.find((item) => {
      const box = item.getBoundingClientRect();
      return e.clientY < box.top + box.height / 2;
    });
    if (before) {
      if (li.nextElementSibling !== before) els.list.insertBefore(li, before);
    } else if (els.list.lastElementChild !== li) {
      els.list.appendChild(li);
    }
  };

  const onUp = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    li.classList.remove("dragging");
    isDragging = false;
    saveOrder([...els.list.children].map((item) => item.dataset.id));
  };

  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

// Keyboard alternative: focus the handle and press the up/down arrows
function moveWithKeys(event, id) {
  if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
  event.preventDefault();
  const ids = [...els.list.children].map((item) => item.dataset.id);
  const from = ids.indexOf(id);
  const to = event.key === "ArrowUp" ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return;
  [ids[from], ids[to]] = [ids[to], ids[from]];
  focusAfterRender = { id, selector: ".drag-handle" };
  saveOrder(ids);
}

// `ids` is the new order of the tasks on screen. Hidden tasks (filtered out) keep their places.
function saveOrder(ids) {
  const slots = [];
  tasks.forEach((t, index) => { if (ids.includes(t.id)) slots.push(index); });
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const reordered = tasks.slice();
  slots.forEach((slot, i) => { reordered[slot] = byId.get(ids[i]); });
  tasks = reordered;
  saveTasks();
  render();
}

/* ===================== 9. Reminders, theme, export/import, toast ===================== */
// --- Toast message with optional Undo ---
let toastTimer = null;
let undoAction = null;

function showToast(message, undo) {
  clearTimeout(toastTimer);
  undoAction = undo || null;
  els.toastText.textContent = message;
  els.toastUndo.hidden = !undo;
  els.toast.classList.add("show");
  toastTimer = setTimeout(hideToast, undo ? 6000 : 4000);
}

function hideToast() {
  els.toast.classList.remove("show");
  undoAction = null;
}

// --- Reminders: checked every 15 seconds while the page is open ---
function checkReminders() {
  let changed = false;
  for (const task of tasks) {
    if (task.done || task.notified || !task.due || !task.time) continue;
    if (dueDateTime(task) <= new Date()) {
      task.notified = true;
      changed = true;
      showToast(`⏰ Reminder: "${shorten(task.text, 34)}" is due now`);
      if ("Notification" in window && Notification.permission === "granted") {
        try { new Notification("To-Do reminder", { body: task.text }); } catch (err) { /* some phones need a service worker */ }
      }
    }
  }
  if (changed) {
    saveTasks();
    render();
  }
}

function updateRemindersButton() {
  const supported = "Notification" in window;
  const permission = supported ? Notification.permission : "unsupported";
  let label = "Turn on reminders";
  if (permission === "granted") label = "Reminders are on";
  if (permission === "denied") label = "Notifications are blocked in your browser settings";
  if (!supported) label = "Reminders (shown on this page)";
  els.remindersBtn.innerHTML = icon("bell");
  els.remindersBtn.classList.toggle("on", permission === "granted");
  els.remindersBtn.title = label;
  els.remindersBtn.setAttribute("aria-label", label);
}

function requestReminders() {
  if (!("Notification" in window)) {
    showToast("Your browser can't show notifications. Reminders will appear on this page instead.");
    return;
  }
  if (Notification.permission === "granted") {
    showToast("Reminders are on. Give a task a date and time to be reminded.");
    return;
  }
  Notification.requestPermission().then((permission) => {
    updateRemindersButton();
    showToast(permission === "granted"
      ? "Reminders are on. You'll be notified while this page is open."
      : "Notifications not allowed. Reminders will still appear on this page.");
  });
}

// --- Dark mode ---
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === "dark";
  els.themeToggle.innerHTML = icon(isDark ? "sun" : "moon");
  const label = isDark ? "Switch to light mode" : "Switch to dark mode";
  els.themeToggle.title = label;
  els.themeToggle.setAttribute("aria-label", label);
}

function toggleTheme() {
  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  storageSet(THEME_KEY, theme);
  applyTheme(theme);
}

// --- Export and import ---
function downloadFile(filename, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = el("a", { href: url, download: filename });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportJSON() {
  downloadFile(`todo-tasks-${dateKey(new Date())}.json`, JSON.stringify(tasks, null, 2), "application/json");
  showToast(`Exported ${plural(tasks.length, "task")} as JSON`);
}

const CSV_COLUMNS = ["text", "done", "due", "time", "priority", "category", "repeat", "subtasks"];

function csvCell(value) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = "'" + text; // stops spreadsheet apps from running it as a formula
  return '"' + text.replace(/"/g, '""') + '"';
}

function exportCSV() {
  const rows = [CSV_COLUMNS.join(",")];
  for (const t of tasks) {
    const steps = t.subtasks.map((s) => (s.done ? "[x] " : "[ ] ") + s.text).join(" | ");
    rows.push([t.text, t.done ? "yes" : "no", t.due, t.time, t.priority, t.category, t.repeat, steps].map(csvCell).join(","));
  }
  downloadFile(`todo-tasks-${dateKey(new Date())}.csv`, "﻿" + rows.join("\r\n"), "text/csv");
  showToast(`Exported ${plural(tasks.length, "task")} as CSV`);
}

function parseCSV(text) {
  const rows = [];
  let row = [], cell = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else cell += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function tasksFromCSV(text) {
  const rows = parseCSV(text);
  if (rows.length < 2) return [];
  const header = rows[0].map((h) => h.trim().toLowerCase());
  return rows.slice(1).map((cells) => {
    const o = {};
    header.forEach((name, i) => {
      let value = (cells[i] || "").trim();
      if (/^'[=+\-@]/.test(value)) value = value.slice(1);
      o[name] = value;
    });
    const category = CATEGORIES.find((c) => c.toLowerCase() === (o.category || "").toLowerCase());
    return {
      text: o.text || o.task || o.name,
      done: /^(yes|true|1|x|done)$/i.test(o.done || ""),
      due: o.due,
      time: o.time,
      priority: (o.priority || "").toLowerCase(),
      category,
      repeat: (o.repeat || "").toLowerCase(),
      subtasks: (o.subtasks || "").split("|").map((s) => s.trim()).filter(Boolean)
        .map((s) => ({ text: s.replace(/^\[[ xX]\]\s*/, ""), done: /^\[[xX]\]/.test(s) })),
    };
  });
}

function importFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const text = String(reader.result).replace(/^﻿/, "");
      const raw = file.name.toLowerCase().endsWith(".csv") ? tasksFromCSV(text) : JSON.parse(text);
      const imported = (Array.isArray(raw) ? raw : [])
        .map((r) => normalizeTask({ ...r, id: newId() }))
        .filter(Boolean);
      if (imported.length === 0) {
        showToast("No tasks found in that file.");
        return;
      }
      imported.forEach((t) => { t.notified = t.notified || isPastDue(t); });
      const before = JSON.stringify(tasks);
      tasks = tasks.concat(imported);
      saveTasks();
      render();
      showToast(`Imported ${plural(imported.length, "task")}`, () => restore(before));
    } catch (err) {
      showToast("Sorry, that file couldn't be read. Use a JSON or CSV file.");
    }
  };
  reader.readAsText(file);
}

/* ===================== 10. Events and start-up ===================== */
function fillSelect(select, options, selected) {
  for (const [value, label] of options) {
    const option = el("option", { value, text: label });
    if (value === selected) option.selected = true;
    select.append(option);
  }
}

function showTodayDate() {
  els.today.textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

els.form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = els.input.value.trim();
  if (!text) {
    els.input.classList.remove("shake");
    void els.input.offsetWidth; // restart the shake animation
    els.input.classList.add("shake");
    els.input.focus();
    return;
  }
  addTask({
    text,
    due: els.due.value,
    time: els.time.value,
    priority: els.priority.value,
    category: els.category.value,
    repeat: els.repeat.value,
  });
  els.form.reset();
  els.input.focus();
});

els.input.addEventListener("animationend", () => els.input.classList.remove("shake"));

els.filterButtons.forEach((btn) => btn.addEventListener("click", () => setStatusFilter(btn.dataset.filter)));

els.search.addEventListener("input", () => {
  searchText = els.search.value;
  render();
});

els.categoryFilter.addEventListener("change", () => {
  categoryFilter = els.categoryFilter.value;
  render();
});

els.clearCompleted.addEventListener("click", clearCompleted);
els.toastUndo.addEventListener("click", () => {
  if (undoAction) undoAction();
  hideToast();
});
els.themeToggle.addEventListener("click", toggleTheme);
els.remindersBtn.addEventListener("click", requestReminders);
els.exportJson.addEventListener("click", exportJSON);
els.exportCsv.addEventListener("click", exportCSV);
els.importBtn.addEventListener("click", () => els.importFile.click());
els.importFile.addEventListener("change", () => {
  if (els.importFile.files[0]) importFile(els.importFile.files[0]);
  els.importFile.value = "";
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  const typing = e.target.closest && e.target.closest("input, textarea, select");

  if (e.key === "Escape") {
    if (e.target === els.search) {
      els.search.value = "";
      searchText = "";
      render();
      els.search.blur();
    } else if (e.target === els.input) {
      els.input.value = "";
    }
    hideToast();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !typing && undoAction) {
    e.preventDefault();
    undoAction();
    hideToast();
    return;
  }
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "/") { e.preventDefault(); els.search.focus(); }
  if (e.key === "n" || e.key === "N") { e.preventDefault(); els.input.focus(); }
});

// Keep several open tabs in sync
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    tasks = loadTasks();
    render();
  }
});

// Every 15 seconds: check reminders and refresh "Today"/"Overdue" labels
setInterval(() => {
  checkReminders();
  showTodayDate();
  const editing = els.list.contains(document.activeElement) && document.activeElement.matches("input[type=text], input[type=date], input[type=time], select");
  if (!isDragging && !editing) render();
}, 15000);

// Start-up
fillSelect(els.category, CATEGORIES.map((c) => [c, c]), "Personal");
fillSelect(els.repeat, Object.entries(REPEATS), "none");
fillSelect(els.categoryFilter, [["all", "All categories"], ...CATEGORIES.map((c) => [c, c])], "all");
// form.reset() should return to these defaults
els.category.querySelector('option[value="Personal"]').defaultSelected = true;
els.repeat.querySelector('option[value="none"]').defaultSelected = true;

$("#search-icon").innerHTML = icon("search");
els.exportJson.innerHTML = icon("download") + "Export JSON";
els.exportCsv.innerHTML = icon("download") + "Export CSV";
els.importBtn.innerHTML = icon("upload") + "Import";

applyTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
updateRemindersButton();
showTodayDate();
setStatusFilter(statusFilter, false);
checkReminders();
render();
