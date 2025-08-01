document.addEventListener('DOMContentLoaded', () => {
    // --- Get all the HTML elements ---
    const generatorView = document.getElementById('generator-view');
    const checklistView = document.getElementById('checklist-view');
    const generatorForm = document.getElementById('generator-form');
    const timetableInput = document.getElementById('timetable-input');
    const goalsInput = document.getElementById('goals-input');
    const routineDisplay = document.getElementById('routine-display');
    const todayDateEl = document.getElementById('today-date');
    const resetButton = document.getElementById('reset-button');
    const editButton = document.getElementById('edit-button');
    const enableNotificationsButton = document.getElementById('enable-notifications-button');
    const copyTemplateButton = document.getElementById('copy-template-button');

    // --- App's main data variable ---
    let routineData = null;
    let notificationsEnabled = false;

    // --- PARSING AND RENDERING FUNCTIONS ---
    function parseInputs(timetableText, goalsText) {
    let routine = [];

    const parseSectionText = (text) => {
        const lines = text.split('\n').filter(Boolean);
        let tasks = [];
        let lastTask = null;
        let lastSubtask = null;

        lines.forEach(line => {
            const trimmedLine = line.trim();
            const isNote = trimmedLine.startsWith('>');
            const isSubtask = /^\s+/.test(line) && !isNote;
            let taskText = trimmedLine.replace('[ ]', '').replace('>', '').trim();

            const isStarred = taskText.startsWith('*');
            if (isStarred) taskText = taskText.substring(1).trim();

            // NEW: Look for a category tag
            let category = null;
            const categoryMatch = taskText.match(/#(\w+)\s*$/);
            if (categoryMatch && !isSubtask) {
                category = categoryMatch[1]; // The word after #
                taskText = taskText.replace(categoryMatch[0], '').trim(); // Remove tag from text
            }

            const taskObject = { text: taskText, completed: false, starred: isStarred, note: '', category: category };

            if (isNote && lastTask) {
                if(lastSubtask) lastSubtask.note = (lastSubtask.note || '') + taskText;
                else lastTask.note = (lastTask.note || '') + taskText;
            } else if (isSubtask && tasks.length > 0) {
                lastTask = tasks[tasks.length - 1];
                if (!lastTask.subtasks) lastTask.subtasks = [];
                // Subtasks inherit the category
                taskObject.category = lastTask.category;
                lastTask.subtasks.push(taskObject);
                lastSubtask = taskObject;
            } else {
                taskObject.subtasks = [];
                tasks.push(taskObject);
                lastTask = taskObject;
                lastSubtask = null;
            }
        });
        return tasks.filter(task => task.text);
    };

    const timetableSections = timetableText.split('---').map(s => s.trim()).filter(Boolean);
    const parsedTimetable = timetableSections.map((section, index) => {
        const lines = section.split('\n').map(l => l.trim());
        const header = lines.shift();
        return { id: `t${index}`, header: header, tasks: parseSectionText(lines.join('\n')) };
    });
    routine = routine.concat(parsedTimetable);

    if (goalsText.trim()) {
        routine.push({ id: 'g1', header: "🎯 Today's Goals", tasks: parseSectionText(goalsText) });
    }
    return routine;
}

    // Paste this over your old renderRoutine function
// Paste this over your old renderRoutine function
function renderRoutine() {
    routineDisplay.innerHTML = '';
    if (!routineData) return;

    routineData.forEach(section => {
        const article = document.createElement('article');
        article.dataset.sectionContainer = 'true';

        let tasksHTML = section.tasks.map((task, taskIndex) => {
            const taskNoteHTML = task.note ? `<div class="task-note">${task.note}</div>` : '';
            const starIcon = task.starred ? '⭐' : '☆';
            const categoryTag = task.category ? `<code class="category-tag">#${task.category}</code>` : '';
            const isCompleted = task.completed ? 'completed' : '';
            
            let subtasksHTML = '';
            if (task.subtasks && task.subtasks.length > 0) {
                subtasksHTML = task.subtasks.map((subtask, subtaskIndex) => {
                    const subtaskNoteHTML = subtask.note ? `<div class="task-note subtask-note">${subtask.note}</div>` : '';
                    const subtaskStarIcon = subtask.starred ? '⭐' : '☆';
                    const isSubtaskCompleted = subtask.completed ? 'completed' : '';
                    
                    return `
                        <div class="subtask">
                            <div class="task-row ${isSubtaskCompleted}" data-section-id="${section.id}" data-task-index="${taskIndex}" data-subtask-index="${subtaskIndex}">
                                <div class="checkbox" data-action="toggle-check"></div>
                                <div class="task-content">
                                    <span class="star-button" data-action="toggle-star">${subtaskStarIcon}</span>
                                    <span class="task-text">${subtask.text}</span>
                                </div>
                            </div>
                            ${subtaskNoteHTML}
                        </div>
                    `;
                }).join('');
            }

            return `
                <div class="task-container" data-task-category="${task.category || 'none'}">
                     <div class="task-row ${isCompleted}" data-section-id="${section.id}" data-task-index="${taskIndex}">
                        <div class="checkbox" data-action="toggle-check"></div>
                        <div class="task-content">
                            <span class="star-button" data-action="toggle-star">${starIcon}</span>
                            <strong class="task-text">${task.text}</strong>
                            ${categoryTag}
                        </div>
                    </div>
                    ${taskNoteHTML}
                    <div class="subtask-wrapper">${subtasksHTML}</div>
                </div>
            `;
        }).join('');

        article.innerHTML = `
            <header>
                <strong>${section.header}</strong>
                <button class="outline" data-alarm-section-id="${section.id}" style="padding: 2px 8px;" aria-label="Set Alarm">🔔</button>
            </header>
            <div class="article-body">${tasksHTML}</div>
        `;
        routineDisplay.appendChild(article);
    });
}

    // --- LOCAL STORAGE & STATE FUNCTIONS ---
    function saveState(timetableText, goalsText) {
        localStorage.setItem('saarthi_plan', JSON.stringify(routineData));
        localStorage.setItem('saarthi_plan_date', new Date().toLocaleDateString('en-CA'));
        if (timetableText !== undefined && goalsText !== undefined) {
            localStorage.setItem('saarthi_timetable_text', timetableText);
            localStorage.setItem('saarthi_goals_text', goalsText);
        }
    }

    function initialLoad() {
        const savedPlan = JSON.parse(localStorage.getItem('saarthi_plan'));
        const savedDate = localStorage.getItem('saarthi_plan_date');
        const today = new Date().toLocaleDateString('en-CA');
        todayDateEl.textContent = `Today: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`;
        if (savedPlan) {
            routineData = savedPlan;
            if (savedDate !== today) {
                routineData.forEach(section => section.tasks.forEach(task => task.completed = false));
                saveState();
            }
            renderRoutine();
            generatorView.hidden = true;
            checklistView.hidden = false;
        } else {
            generatorView.hidden = false;
            checklistView.hidden = true;
        }
    }

    // --- ALARM FUNCTIONS ---
    function requestNotificationPermission() {
        if (!('Notification' in window)) {
            alert('This browser does not support desktop notifications.'); return;
        }
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                notificationsEnabled = true;
                new Notification('Saarthi Reminders Activated!', {
                    body: 'You can now set alarms for your schedule.',
                    icon: 'https://www.google.com/s2/favicons?domain=raghvendra.vercel.app'
                });
            }
        });
    }

    function setAlarm(section) {
        if (Notification.permission !== 'granted') {
             alert('Please enable notifications first by clicking the button at the top.');
             return;
        }
        const timeMatch = section.header.match(/(\d{1,2}:\d{2})\s*(AM|PM)?/i);
        if (!timeMatch) {
            alert('Could not find a valid time (e.g., 4:00 or 5:30 PM) in this section header to set an alarm.'); return;
        }
        let [_, timeStr, ampm] = timeMatch;
        let [hours, minutes] = timeStr.split(':').map(Number);
        if (ampm && /pm/i.test(ampm) && hours < 12) hours += 12;
        if (ampm && /am/i.test(ampm) && hours === 12) hours = 0;
        const now = new Date();
        const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        if (alarmTime < now) {
            alert(`This time (${timeStr}) has already passed today. Alarm not set.`); return;
        }
        const timeToAlarm = alarmTime.getTime() - now.getTime();
        setTimeout(() => {
            new Notification(section.header, {
                body: `Time to start: ${section.tasks.map(t => t.text).join(', ')}`,
                icon: 'https://www.google.com/s2/favicons?domain=raghvendra.vercel.app'
            });
        }, timeToAlarm);
        alert(`Alarm successfully set for ${timeStr}!`);
    }

    // --- EVENT LISTENERS ---
    generatorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const timetableText = timetableInput.value;
        const goalsText = goalsInput.value;
        routineData = parseInputs(timetableText, goalsText);
        saveState(timetableText, goalsText);
        initialLoad();
    });

    editButton.addEventListener('click', () => {
        timetableInput.value = localStorage.getItem('saarthi_timetable_text') || '';
        goalsInput.value = localStorage.getItem('saarthi_goals_text') || '';
        checklistView.hidden = true;
        generatorView.hidden = false;
    });

    resetButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to erase this plan and start over?')) {
            localStorage.removeItem('saarthi_plan');
            localStorage.removeItem('saarthi_plan_date');
            localStorage.removeItem('saarthi_timetable_text');
            localStorage.removeItem('saarthi_goals_text');
            routineData = null;
            initialLoad();
        }
    });

    routineDisplay.addEventListener('click', (e) => {
    const target = e.target;
    const taskRow = target.closest('.task-row');
    if (!taskRow) return; // Exit if the click wasn't inside a task row

    const action = target.dataset.action;
    const { sectionId, taskIndex, subtaskIndex } = taskRow.dataset;

    const section = routineData.find(s => s.id === sectionId);
    if (!section) return;

    let task;
    if (subtaskIndex !== undefined) {
        task = section.tasks[taskIndex].subtasks[subtaskIndex];
    } else {
        task = section.tasks[taskIndex];
    }
    if (!task) return;

    if (action === 'toggle-check') {
        task.completed = !task.completed;
    } else if (action === 'toggle-star') {
        task.starred = !task.starred;
    } else {
        // If the user clicks anywhere else on the row, toggle completion
        task.completed = !task.completed;
    }

    saveState();
    renderRoutine();
});

    enableNotificationsButton.addEventListener('click', requestNotificationPermission);

    copyTemplateButton.addEventListener('click', () => {
    const template = `
// --- TEMPLATE FOR YOUR DAILY TIMETABLE ---
// Use this format for each time block. Separate blocks with ---

---
6:00-7:00 AM - Morning Block
[ ] Task 1 for this block
[ ] Task 2
    [ ] Sub-task for Task 2
---
7:00-8:00 AM - Another Block
[ ] Another task
---

// --- TEMPLATE FOR TODAY'S ONE-TIME GOALS ---
// List your unique goals for today below.

[ ] A specific goal for today
[ ] Another specific goal
`;

    navigator.clipboard.writeText(template.trim())
        .then(() => {
            alert('Template copied to clipboard!');
        })
        .catch(err => {
            console.error('Failed to copy template: ', err);
            alert('Could not copy template. See console for details.');
        });
});
    document.getElementById('category-filters').addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        const category = e.target.dataset.category;
        const allTasks = document.querySelectorAll('.task-container');

        allTasks.forEach(task => {
            if (category === 'all' || task.dataset.taskCategory === category) {
                task.style.display = 'block';
            } else {
                task.style.display = 'none';
            }
        });
    }
});

    // --- INITIALIZE APP ---
    initialLoad();
});