/* ===============================================================
   MAIN CONTROLLER (main.js)
   - Initializes the app
   - Imports functions from modules
   - Sets up all event listeners
   =============================================================== */

import * as logic from './logic.js';
import * as ui from './ui.js';

// ---------------------------------------------------------------
// 1. DOM ELEMENT CONSTANTS
// ---------------------------------------------------------------
const generatorView = document.getElementById('generator-view');
const checklistView = document.getElementById('checklist-view');
const generatorForm = document.getElementById('generator-form');
const timetableInput = document.getElementById('timetable-input');
const goalsInput = document.getElementById('goals-input');
const routineDisplay = document.getElementById('routine-display');
const todayDateEl = document.getElementById('today-date');
const streakCounterEl = document.getElementById('streak-counter');
const planSwitcher = document.getElementById('plan-switcher');
const categoryFiltersEl = document.getElementById('category-filters');
const editButton = document.getElementById('edit-button');
const copyTemplateButton = document.getElementById('copy-template-button');
const enableNotificationsButton = document.getElementById('enable-notifications-button');
const analyticsButton = document.getElementById('analytics-button');
const analyticsModal = document.getElementById('analytics-modal');
const analyticsModalClose = analyticsModal.querySelector('.close');
const managePlansButton = document.getElementById('manage-plans-button');
const managePlansModal = document.getElementById('manage-plans-modal');
const managePlansModalClose = managePlansModal.querySelector('.close');
const createNewPlanButton = document.getElementById('create-new-plan-button');
const renamePlanButton = document.getElementById('rename-plan-button');
const deletePlanButton = document.getElementById('delete-plan-button');
const scheduleContainer = document.getElementById('weekly-schedule');
const addTaskModal = document.getElementById('add-task-modal');
const addTaskForm = document.getElementById('add-task-form');
const addTaskModalClose = addTaskModal.querySelector('.close');
const calendarView = document.getElementById('calendar-view');
const monthYearHeader = document.getElementById('month-year-header');
const calendarDays = document.getElementById('calendar-days');
const prevMonthButton = document.getElementById('prev-month-button');
const nextMonthButton = document.getElementById('next-month-button');
const navChecklistButton = document.getElementById('nav-checklist-button');
const navAddButton = document.getElementById('nav-add-button');
const navCalendarButton = document.getElementById('nav-calendar-button');
const mainGreeting = document.getElementById('main-greeting');
const navTodayButton = document.getElementById('nav-today-button');
const searchInput = document.getElementById('search-input');
const exportDataButton = document.getElementById('export-data-button');
const importDataButton = document.getElementById('import-data-button');
const importFileInput = document.getElementById('import-file-input');

// ---------------------------------------------------------------
// 2. STATE MANAGEMENT
// ---------------------------------------------------------------
let saarthiData = {};
let currentDate = new Date();
const DEFAULT_DATA = {
    plans: {}, active_plan_name: null, schedule: {},
    history: {}, streak: { count: 0, last_date: null }
};

// ---------------------------------------------------------------
// 3. APP INITIALIZATION & MAIN FUNCTIONS
// ---------------------------------------------------------------
// In js/main.js, replace these three functions

function initializeApp() {
    // 1. Set the greeting
    const hour = new Date().getHours();
    if (hour < 12) { mainGreeting.innerHTML = "Good Morning, Raghvendra ☀️"; } 
    else if (hour < 18) { mainGreeting.innerHTML = "Good Afternoon, Raghvendra 🌤️"; } 
    else { mainGreeting.innerHTML = "Good Evening, Raghvendra 🌙"; }

    // 2. Load all data
    saarthiData = logic.loadData(DEFAULT_DATA);
    ui.updatePlanSwitcherUI(planSwitcher, saarthiData);
    todayDateEl.textContent = `Today: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
    
    // 3. Reset daily templates if needed
    dailyResetCheck();

    // 4. Show the correct view and update stats
    updateUI();
}

function dailyResetCheck() {
    const activePlan = saarthiData.plans[saarthiData.active_plan_name];
    if (!activePlan || !activePlan.data) return;
    
    const today = new Date().toLocaleDateString('en-CA');
    if (activePlan.last_saved_date !== today) {
        activePlan.data.forEach(section => {
            section.tasks.forEach(task => {
                task.completed = false;
                if (task.subtasks) task.subtasks.forEach(st => st.completed = false);
            });
        });
        activePlan.last_saved_date = today;
        logic.saveData(saarthiData);
    }
}

function updateUI() {
    // Generate the unified "Today" view data every time the UI updates
    const todayRoutine = logic.generateTodayViewData(saarthiData);
    
    // Render the main checklist with the merged data
    ui.renderRoutine(todayRoutine, routineDisplay);

    // Update the streak counter with animation
    const streakResult = logic.updateStreak(saarthiData);
    saarthiData = streakResult.data;
    if (streakCounterEl.textContent !== streakResult.text && streakResult.text) {
        streakCounterEl.textContent = streakResult.text;
        streakCounterEl.classList.add('animate');
        setTimeout(() => {
            streakCounterEl.classList.remove('animate');
        }, 500);
    } else {
        streakCounterEl.textContent = streakResult.text;
    }

    // Show the checklist or generator based on whether there are tasks for today
    if (todayRoutine.length > 0) {
        generatorView.hidden = true;
        checklistView.hidden = false;
    } else {
        generatorView.hidden = false;
        checklistView.hidden = true;
    }
}

// ---------------------------------------------------------------
// 4. EVENT LISTENERS
// ---------------------------------------------------------------
generatorForm.addEventListener('submit', (e) => {
    e.preventDefault();
    let planName = saarthiData.active_plan_name;

    if (!planName || !saarthiData.plans[planName]) {
        planName = prompt("Name this new plan:", "My Daily Plan");
        if (!planName) return; // User cancelled
        if (saarthiData.plans[planName]) {
            alert("A plan with that name already exists.");
            return;
        }
    }

    const timetableText = timetableInput.value;
    const goalsText = goalsInput.value;
    const newPlanData = logic.parseInputs(timetableText, goalsText);

    // Save the new plan data
    saarthiData.plans[planName] = {
        data: newPlanData,
        rawTimetable: timetableText,
        rawGoals: goalsText,
        last_saved_date: new Date().toLocaleDateString('en-CA')
    };
    saarthiData.active_plan_name = planName;
    logic.saveData(saarthiData);

    // --- CORRECTED LOGIC ---
    // Instead of re-initializing the whole app, just render the plan we just made.
    ui.renderRoutine(newPlanData, routineDisplay);
    ui.updatePlanSwitcherUI(planSwitcher, saarthiData);
    
    // Switch the view manually
    generatorView.hidden = true;
    checklistView.hidden = false;
});

editButton.addEventListener('click', () => {
    const activePlan = saarthiData.plans[saarthiData.active_plan_name];
    if (!activePlan) { alert("No active plan to edit."); return; }
    timetableInput.value = activePlan.rawTimetable || '';
    goalsInput.value = activePlan.rawGoals || '';
    checklistView.hidden = true;
    generatorView.hidden = false;
});

planSwitcher.addEventListener('change', (e) => {
    saarthiData.active_plan_name = e.target.value;
    logic.saveData(saarthiData);
    initializeApp();
});

managePlansButton.addEventListener('click', () => {
    ui.renderScheduleUI(scheduleContainer, saarthiData);
    managePlansModal.showModal();
});
managePlansModalClose.addEventListener('click', () => managePlansModal.close());

createNewPlanButton.addEventListener('click', () => {
    managePlansModal.close();
    const newPlanName = prompt("Enter a name for your new plan:", "New Plan");
    if (!newPlanName) return;
    if (saarthiData.plans[newPlanName]) { alert("A plan with that name already exists."); return; }
    saarthiData.active_plan_name = newPlanName;
    saarthiData.plans[newPlanName] = { data: null, rawTimetable: '', rawGoals: '' };
    timetableInput.value = '';
    goalsInput.value = '';
    logic.saveData(saarthiData);
    initializeApp();
});

renamePlanButton.addEventListener('click', () => {
    const oldName = saarthiData.active_plan_name;
    if (!oldName) { alert("No active plan to rename."); return; }
    const newName = prompt("Enter the new name for this plan:", oldName);
    if (!newName || newName === oldName) return;
    if (saarthiData.plans[newName]) { alert("A plan with that name already exists."); return; }
    
    saarthiData.plans[newName] = saarthiData.plans[oldName];
    delete saarthiData.plans[oldName];
    // Update schedule to point to new name
    if (saarthiData.schedule) {
        for (const day in saarthiData.schedule) {
            if (saarthiData.schedule[day] === oldName) {
                saarthiData.schedule[day] = newName;
            }
        }
    }
    saarthiData.active_plan_name = newName;

    logic.saveData(saarthiData);
    ui.updatePlanSwitcherUI(planSwitcher, saarthiData);
    ui.renderScheduleUI(scheduleContainer, saarthiData);
    managePlansModal.close();
});

deletePlanButton.addEventListener('click', () => {
    const planToDelete = saarthiData.active_plan_name;
    if (!planToDelete) { alert("No active plan to delete."); return; }
    if (confirm(`Are you sure you want to delete the plan "${planToDelete}"? This cannot be undone.`)) {
        delete saarthiData.plans[planToDelete];
        if (saarthiData.schedule) {
            for (const day in saarthiData.schedule) {
                if (saarthiData.schedule[day] === planToDelete) {
                    delete saarthiData.schedule[day];
                }
            }
        }
        saarthiData.active_plan_name = null;
        logic.saveData(saarthiData);
        managePlansModal.close();
        initializeApp();
    }
});

analyticsButton.addEventListener('click', () => {
    const activePlanData = saarthiData.plans[saarthiData.active_plan_name]?.data;
    ui.renderWeeklyChart(saarthiData.history || {});
    ui.renderCategoryDonutChart(activePlanData);
    analyticsModal.showModal();
});
analyticsModalClose.addEventListener('click', () => analyticsModal.close());

routineDisplay.addEventListener('click', (e) => {
    const target = e.target;
    const taskRow = target.closest('.task-row');
    const alarmButton = target.closest('[data-alarm-section-id]');
    const activePlan = saarthiData.plans[saarthiData.active_plan_name];

    if (alarmButton) {
        const sectionId = alarmButton.dataset.alarmSectionId;
        const section = activePlan.data.find(s => s.id === sectionId);
        if (section) ui.setAlarm(section);
        return;
    }

    if (!taskRow) return;
    
    const { sectionId, taskIndex, subtaskIndex } = taskRow.dataset;
    const section = activePlan.data.find(s => s.id === sectionId);
    if (!section) return;

    let task;
    if (subtaskIndex !== undefined) {
        task = section.tasks[taskIndex].subtasks[subtaskIndex];
    } else {
        task = section.tasks[taskIndex];
    }
    if (!task) return;
    
    const action = target.dataset.action;
    if (action === 'delete') {
        if (confirm('Are you sure you want to delete this task?')) {
            if (subtaskIndex !== undefined) {
                section.tasks[taskIndex].subtasks.splice(subtaskIndex, 1);
            } else {
                section.tasks.splice(taskIndex, 1);
            }
        } else { return; }
    } else if (action === 'toggle-star') {
        task.starred = !task.starred;
    } else { // Default action is to toggle check
        task.completed = !task.completed;
    }
    
    saarthiData = logic.updateHistory(saarthiData);
    updateUI();
});

categoryFiltersEl.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const category = e.target.dataset.category;
        document.querySelectorAll('.task-container').forEach(taskEl => {
            taskEl.style.display = (category === 'all' || taskEl.dataset.taskCategory === category) ? 'block' : 'none';
        });
    }
});

scheduleContainer.addEventListener('change', (e) => {
    if (e.target.tagName === 'SELECT') {
        const day = e.target.dataset.day;
        const planName = e.target.value;
        if (!saarthiData.schedule) saarthiData.schedule = {};
        if (planName) { saarthiData.schedule[day] = planName; } 
        else { delete saarthiData.schedule[day]; }
        logic.saveData(saarthiData);
    }
});

enableNotificationsButton.addEventListener('click', () => {
    if (!('Notification' in window)) { alert('This browser does not support desktop notifications.'); return; }
    Notification.requestPermission().then(permission => { if (permission === 'granted') { new Notification('Saarthi Reminders Activated!', { body: 'You can now set alarms for your schedule.' }); } });
});
    
copyTemplateButton.addEventListener('click', () => {
    const template = `// --- TEMPLATE FOR YOUR DAILY TIMETABLE ---\n---\n8:00-9:00 AM - Morning Focus Block\n[ ] * A starred (priority) task #work\n    > This is a note for the main task.\n    [ ] A sub-task\n---\n\n// --- TEMPLATE FOR TODAY'S ONE-TIME GOALS ---\n[ ] A goal for today #personal`;
    navigator.clipboard.writeText(template.trim()).then(() => alert('Template copied to clipboard!'));
});

// Close the "Add Task" modal
addTaskModalClose.addEventListener('click', () => addTaskModal.close());

// Handle the form submission
addTaskForm.addEventListener('submit', (e) => {
    e.preventDefault();

    // Create the new task object from form data
    const taskText = e.target.taskText.value;
    const dueDate = e.target.dueDate.value; // YYYY-MM-DD format

    const newTask = {
        text: taskText,
        completed: false,
        starred: e.target.isStarred.checked,
        note: e.target.notes.value,
        category: e.target.category.value.replace('#', '').trim() || null,
        subtasks: []
    };

    if (dueDate) {
        // If a due date is set, add it to the scheduled tasks list
        if (!saarthiData.scheduledTasks) saarthiData.scheduledTasks = {};
        if (!saarthiData.scheduledTasks[dueDate]) saarthiData.scheduledTasks[dueDate] = [];
        saarthiData.scheduledTasks[dueDate].push(newTask);

    } else {
        // If no date, add it to the active plan's "Goals" or last section
        const activePlan = saarthiData.plans[saarthiData.active_plan_name];
        if (!activePlan || !activePlan.data) {
            alert("Please create or select a plan first to add daily tasks.");
            return;
        }
        let targetSection = activePlan.data.find(section => section.id === 'g1');
        if (!targetSection) targetSection = activePlan.data[activePlan.data.length - 1];
        targetSection.tasks.push(newTask);
    }

    logic.saveData(saarthiData);
    updateUI(); // Re-render the UI

    addTaskForm.reset();
    addTaskModal.close();
});

// In js/main.js, replace your old view-switcher listeners with these

navTodayButton.addEventListener('click', () => {
    checklistView.hidden = false;
    calendarView.hidden = true;
    navTodayButton.classList.add('active');
    navCalendarButton.classList.remove('active');
    // Re-run initializeApp to ensure the "Today" view is fresh
    initializeApp(); 
});

navCalendarButton.addEventListener('click', () => {
    checklistView.hidden = true;
    calendarView.hidden = false;
    navCalendarButton.classList.add('active');
    navChecklistButton.classList.remove('active');
    // Render the calendar when switching to it
    ui.renderCalendar(currentDate, calendarDays, monthYearHeader, saarthiData.scheduledTasks);
});

navAddButton.addEventListener('click', () => {
    addTaskModal.showModal();
});

// Do the same for the prev and next month buttons
prevMonthButton.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    ui.renderCalendar(currentDate, calendarDays, monthYearHeader, saarthiData.scheduledTasks);
});
nextMonthButton.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    ui.renderCalendar(currentDate, calendarDays, monthYearHeader, saarthiData.scheduledTasks);
});

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const allTasks = document.querySelectorAll('.task-container');

    allTasks.forEach(taskEl => {
        const taskText = taskEl.textContent.toLowerCase();
        if (taskText.includes(searchTerm)) {
            taskEl.style.display = 'block';
        } else {
            taskEl.style.display = 'none';
        }
    });
});

exportDataButton.addEventListener('click', () => {
    logic.exportData(saarthiData);
});

importDataButton.addEventListener('click', () => {
    // Trigger the hidden file input
    importFileInput.click();
});

importFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        logic.importData(file, (importedData) => {
            if (confirm("This will overwrite all current data. Are you sure you want to proceed?")) {
                saarthiData = importedData;
                logic.saveData(saarthiData);
                // Reset the file input so the same file can be loaded again
                importFileInput.value = ""; 
                managePlansModal.close();
                initializeApp();
            }
        });
    }
});

// ---------------------------------------------------------------
// 5. APP INITIALIZATION
// ---------------------------------------------------------------
initializeApp();