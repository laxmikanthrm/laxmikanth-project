# To-Do List

A simple to-do list web app built with plain HTML, CSS and JavaScript for the **CMPS 510 final project** (Project 1: To-Do List).

- **Live app:** https://laxmikanthrm.github.io/laxmikanth-project/
- **Report (PDF):** https://laxmikanthrm.github.io/laxmikanth-project/report/CMPS510_Final_Report_ToDo_List.pdf
- **Demo video (1 min):** https://laxmikanthrm.github.io/laxmikanth-project/report/demo.mp4

![Screenshot of the To-Do List app](screenshot.png)

## Features

**Must-have (from the project catalogue)**
- Add a task (click **Add** or press Enter)
- Tick a task as done and delete it
- Tasks stay after the page is refreshed (saved in the browser's `localStorage`)

**Optional extra**
- Filter tasks: **All / Active / Done**, with a count on each button

**Small additions**
- Edit a task (Edit button or double-click; Enter saves, Esc cancels)
- **Clear done** button to remove all finished tasks
- Task counter, for example "2 tasks left"
- Works on phone screens

## How to run locally
Open `index.html` in any web browser. No installation or server is needed.

## Files
| File | Purpose |
|------|---------|
| `index.html` | Page structure |
| `style.css` | Styling and phone layout |
| `script.js` | App logic: add, tick, edit, delete, filter, save to localStorage |
| `report/` | Project report (PDF), use-case diagram and demo video |

## How it works
- All tasks are kept in one array, `tasks`. Each task is `{ id, text, done }`.
- Every change updates the array, saves it with `saveTasks()` (to `localStorage`) and redraws the list with `render()`.
- `render()` shows only the tasks that match the chosen filter. It uses `textContent`, so typed text can't inject HTML.

## Tools and AI assistants used
- Visual Studio Code, Git, GitHub and GitHub Pages
- Playwright for automatic browser testing
- Claude (Anthropic) AI assistant helped write and test the code. I reviewed the code and can explain how it works.
