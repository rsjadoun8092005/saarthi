document.addEventListener('DOMContentLoaded', () => {
    // ===================================================================================
    // 1. DOM ELEMENT CONSTANTS
    // ===================================================================================
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
    const analyticsButton = document.getElementById('analytics-button');
    const analyticsModal = document.getElementById('analytics-modal');
    const modalCloseButton = analyticsModal.querySelector('.close');
    const categoryFiltersEl = document.getElementById('category-filters');
    const streakCounterEl = document.getElementById('streak-counter');

    // ===================================================================================
    // 2. STATE VARIABLES
    // ===================================================================================
    let routineData = null;
    let weeklyChart = null;
    let categoryChart = null;

    // ===================================================================================
    // 3. CORE APP LOGIC (Loading, Saving, Parsing, Rendering)
    // ===================================================================================

    /**
     * Loads the app, checking localStorage for a saved plan.
     * Shows either the generator or the checklist.
     * Resets daily tasks if the date has changed.
     */
    function initialLoad() {
        const savedPlan = JSON.parse(localStorage.getItem('saarthi_plan'));
        const savedDate = localStorage.getItem('saarthi_plan_date');
        const today = new Date().toLocaleDateString('en-CA');
        todayDateEl.textContent = `Today: ${new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}`;

        if (savedPlan) {
            routineData = savedPlan;
            if (savedDate !== today) {
                routineData.forEach(section => {
                    section.tasks.forEach(task => {
                        task.completed = false;
                        if (task.subtasks) {
                            task.subtasks.forEach(st => st.completed = false);
                        }
                    });
                });
                saveState(); // Save the reset state
            }
            renderRoutine();
            generatorView.hidden = true;
            checklistView.hidden = false;
        } else {
            generatorView.hidden = false;
            checklistView.hidden = true;
        }
        updateStreak();
    }

    /**
     * Saves the current routine data and raw text inputs to localStorage.
     */
    function saveState(timetableText, goalsText) {
        localStorage.setItem('saarthi_plan', JSON.stringify(routineData));
        localStorage.setItem('saarthi_plan_date', new Date().toLocaleDateString('en-CA'));
        if (timetableText !== undefined && goalsText !== undefined) {
            localStorage.setItem('saarthi_timetable_text', timetableText);
            localStorage.setItem('saarthi_goals_text', goalsText);
        }
    }

    /**
     * Parses the raw text from the generator into a structured JSON object.
     */
    function parseInputs(timetableText, goalsText) {
        // (This complex function remains the same as the last version)
        let routine = [];
        const parseSectionText = (text) => {
            const lines = text.split('\n').filter(Boolean);
            let tasks = [];
            let lastTask = null; let lastSubtask = null;
            lines.forEach(line => {
                const trimmedLine = line.trim();
                const isNote = trimmedLine.startsWith('>');
                const isSubtask = /^\s+/.test(line) && !isNote;
                let taskText = trimmedLine.replace('[ ]', '').replace('>', '').trim();
                const isStarred = taskText.startsWith('*');
                if (isStarred) taskText = taskText.substring(1).trim();
                let category = null;
                const categoryMatch = taskText.match(/#(\w+)\s*$/);
                if (categoryMatch && !isSubtask) {
                    category = categoryMatch[1];
                    taskText = taskText.replace(categoryMatch[0], '').trim();
                }
                const taskObject = { text: taskText, completed: false, starred: isStarred, note: '', category: category };
                if (isNote && lastTask) {
                    if (lastSubtask) lastSubtask.note = (lastSubtask.note || '') + taskText;
                    else lastTask.note = (lastTask.note || '') + taskText;
                } else if (isSubtask && tasks.length > 0) {
                    lastTask = tasks[tasks.length - 1];
                    if (!lastTask.subtasks) lastTask.subtasks = [];
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

    /**
     * Renders the entire checklist UI from the routineData object.
     */
    function renderRoutine() {
    routineDisplay.innerHTML = '';
    if (!routineData) return;

    routineData.forEach(section => {
        const article = document.createElement('article');
        article.dataset.sectionContainer = 'true';

        let totalTasks = 0, completedTasks = 0;
        section.tasks.forEach(task => { /* ... (stats calculation is the same) ... */ });
        // (The stats calculation logic remains the same, so it's omitted for brevity here, but should be in your file)

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
                                    <span class="delete-button" data-action="delete" title="Delete Task">🗑️</span>
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
                            <span class="delete-button" data-action="delete" title="Delete Task">🗑️</span>
                        </div>
                    </div>
                    ${taskNoteHTML}
                    <div class="subtask-wrapper">${subtasksHTML}</div>
                </div>
            `;
        }).join('');

        // The stats calculation logic needs to be here as well to work
        section.tasks.forEach(task => {
            totalTasks++; if (task.completed) completedTasks++;
            if (task.subtasks) { task.subtasks.forEach(subtask => { totalTasks++; if (subtask.completed) completedTasks++; }); }
        });
        const statsText = `${completedTasks} / ${totalTasks} completed`;

        article.innerHTML = `
            <header>
                <div style="flex-grow: 1;">
                    <strong>${section.header}</strong>
                    <div style="font-size: 0.8em; color: var(--pico-secondary-foreground);">${statsText}</div>
                </div>
                <button class="outline" data-alarm-section-id="${section.id}" style="padding: 2px 8px;" aria-label="Set Alarm">🔔</button>
            </header>
            <div class="article-body">${tasksHTML}</div>
        `;
        routineDisplay.appendChild(article);
    });
}

    // ===================================================================================
    // 4. FEATURE FUNCTIONS (Analytics, Notifications)
    // ===================================================================================

    /**
     * Calculates and displays the current daily streak.
     */
    function updateStreak() {
        if (!routineData) { if (streakCounterEl) streakCounterEl.textContent = ''; return; }
        const today = new Date().toLocaleDateString('en-CA');
        const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
        let streakCount = parseInt(localStorage.getItem('saarthi_streak_count') || '0', 10);
        let lastCompletedDate = localStorage.getItem('saarthi_last_completed_date');
        const anyTaskCompletedToday = routineData.some(s => s.tasks.some(t => t.completed || (t.subtasks && t.subtasks.some(st => st.completed))));

        if (anyTaskCompletedToday) {
            if (lastCompletedDate !== today) {
                if (lastCompletedDate === yesterday) { streakCount++; } else { streakCount = 1; }
                localStorage.setItem('saarthi_last_completed_date', today);
            }
        } else {
            if (lastCompletedDate === today) {
                streakCount--;
                localStorage.setItem('saarthi_last_completed_date', yesterday);
            }
        }
        localStorage.setItem('saarthi_streak_count', streakCount);
        streakCounterEl.textContent = streakCount > 0 ? `🔥 ${streakCount} Day Streak!` : '';
    }

    /**
     * Updates the historical record of completed tasks.
     */
    function updateHistory() {
        const today = new Date().toLocaleDateString('en-CA');
        const history = JSON.parse(localStorage.getItem('saarthi_history') || '{}');
        const completedCount = routineData.reduce((count, section) => {
            const main = section.tasks.filter(t => t.completed).length;
            const sub = section.tasks.reduce((sc, t) => sc + (t.subtasks ? t.subtasks.filter(st => st.completed).length : 0), 0);
            return count + main + sub;
        }, 0);
        history[today] = completedCount;
        localStorage.setItem('saarthi_history', JSON.stringify(history));
    }

    /**
     * Renders the weekly progress bar chart in the analytics modal.
     */
    function renderWeeklyChart() {
        const history = JSON.parse(localStorage.getItem('saarthi_history') || '{}');
        const labels = []; const data = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(Date.now() - i * 86400000);
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            data.push(history[date.toLocaleDateString('en-CA')] || 0);
        }
        const ctx = document.getElementById('weekly-chart').getContext('2d');
        if (weeklyChart) weeklyChart.destroy();
        weeklyChart = new Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Tasks Completed', data, backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }] }, options: { scales: { y: { beginAtZero: true, ticks: { color: 'var(--pico-color)' } }, x: { ticks: { color: 'var(--pico-color)' } } }, plugins: { legend: { labels: { color: 'var(--pico-color)' } } } } });
    }

    /**
     * Renders the category donut chart in the analytics modal.
     */
    function renderCategoryDonutChart() {
        const categoryCounts = {}; let tasksWithoutCategory = 0;
        routineData.forEach(section => {
            section.tasks.forEach(task => {
                const checkTask = (t, parentCategory) => {
                    if (!t.completed) {
                        const category = t.category || parentCategory;
                        if (category) { categoryCounts[category] = (categoryCounts[category] || 0) + 1; } else { tasksWithoutCategory++; }
                    }
                };
                checkTask(task);
                if (task.subtasks) task.subtasks.forEach(st => checkTask(st, task.category));
            });
        });
        if (tasksWithoutCategory > 0) categoryCounts['uncategorized'] = tasksWithoutCategory;
        const labels = Object.keys(categoryCounts); const data = Object.values(categoryCounts);
        const ctx = document.getElementById('category-chart').getContext('2d');
        if (categoryChart) categoryChart.destroy();
        categoryChart = new Chart(ctx, { type: 'doughnut', data: { labels, datasets: [{ label: 'Pending Tasks', data, backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(139, 92, 246, 0.7)'], borderColor: 'var(--pico-card-background-color)', borderWidth: 2 }] }, options: { responsive: true, plugins: { legend: { position: 'top', labels: { color: 'var(--pico-color)' } } } } });
    }
    
    /**
     * Handles notification permissions.
     */
    function requestNotificationPermission() {
        if (!('Notification' in window)) { alert('This browser does not support desktop notifications.'); return; }
        Notification.requestPermission().then(permission => { if (permission === 'granted') { new Notification('Saarthi Reminders Activated!', { body: 'You can now set alarms for your schedule.' }); } });
    }
    
    /**
     * Sets a timeout for a notification for a specific section.
     */
    function setAlarm(section) {
        if (Notification.permission !== 'granted') { alert('Please enable notifications first.'); return; }
        const timeMatch = section.header.match(/(\d{1,2}:\d{2})\s*(AM|PM)?/i);
        if (!timeMatch) { alert('Could not find a valid time in this section header.'); return; }
        let [_, timeStr, ampm] = timeMatch;
        let [hours, minutes] = timeStr.split(':').map(Number);
        if (ampm && /pm/i.test(ampm) && hours < 12) hours += 12;
        if (ampm && /am/i.test(ampm) && hours === 12) hours = 0;
        const now = new Date();
        const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
        if (alarmTime < now) { alert(`This time (${timeStr}) has already passed today.`); return; }
        setTimeout(() => { new Notification(section.header, { body: `Time to start: ${section.tasks.map(t => t.text).join(', ')}` }); }, alarmTime.getTime() - now.getTime());
        alert(`Alarm successfully set for ${timeStr}!`);
    }

    // ===================================================================================
    // 5. EVENT LISTENERS
    // ===================================================================================

    generatorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        routineData = parseInputs(timetableInput.value, goalsInput.value);
        saveState(timetableInput.value, goalsInput.value);
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
            localStorage.clear(); // Simply clear all app data
            routineData = null;
            initialLoad();
        }
    });

    analyticsButton.addEventListener('click', (event) => {
        event.preventDefault();
        renderWeeklyChart();
        renderCategoryDonutChart();
        analyticsModal.showModal();
    });

    modalCloseButton.addEventListener('click', (event) => {
        event.preventDefault();
        analyticsModal.close();
    });

    routineDisplay.addEventListener('click', (e) => {
    const target = e.target;
    const taskRow = target.closest('.task-row');
    if (!taskRow) return;

    const action = target.dataset.action;
    const { sectionId, taskIndex, subtaskIndex } = taskRow.dataset;

    const section = routineData.find(s => s.id === sectionId);
    if (!section) return;

    // Handle Delete Action
    if (action === 'delete') {
        if (confirm('Are you sure you want to delete this task?')) {
            if (subtaskIndex !== undefined) {
                section.tasks[taskIndex].subtasks.splice(subtaskIndex, 1);
            } else {
                section.tasks.splice(taskIndex, 1);
            }
        } else {
            return; // User cancelled
        }
    } else {
        // Handle Check and Star Actions
        let task;
        if (subtaskIndex !== undefined) {
            task = section.tasks[taskIndex].subtasks[subtaskIndex];
        } else {
            task = section.tasks[taskIndex];
        }
        if (!task) return;

        if (action === 'toggle-check') { task.completed = !task.completed; } 
        else if (action === 'toggle-star') { task.starred = !task.starred; } 
        else { task.completed = !task.completed; }
    }

    saveState();
    renderRoutine();
    updateStreak();
    updateHistory();
});

    categoryFiltersEl.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const category = e.target.dataset.category;
            document.querySelectorAll('.task-container').forEach(taskEl => {
                taskEl.style.display = (category === 'all' || taskEl.dataset.taskCategory === category) ? 'block' : 'none';
            });
        }
    });

    enableNotificationsButton.addEventListener('click', requestNotificationPermission);
    
    copyTemplateButton.addEventListener('click', () => {
        const template = `
    // --- TEMPLATE FOR YOUR DAILY TIMETABLE ---
    // Use --- to separate time blocks.
    // Use indentation for sub-tasks and notes.
    
    ---
    8:00-9:00 AM - Morning Focus Block
    [ ] * A starred (priority) task #work
        > This is a note for the main task.
        [ ] A sub-task
        [ ] Another sub-task
            > This is a note for a sub-task.
    ---
    1:00-2:00 PM - Learning Block
    [ ] A normal task #learning
    ---
    
    // --- TEMPLATE FOR TODAY'S ONE-TIME GOALS ---
    
    [ ] A goal for today #personal
    [ ] * Another important goal
    `;
        navigator.clipboard.writeText(template.trim()).then(() => alert('Template copied to clipboard!'));
    });

    // ===================================================================================
    // 6. APP INITIALIZATION
    // ===================================================================================
    initialLoad();
});