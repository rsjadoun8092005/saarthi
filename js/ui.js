/* ===============================================================
   UI MODULE
   - Handles all rendering and DOM manipulation.
   =============================================================== */

let weeklyChart = null;
let categoryChart = null;

// In js/ui.js, replace your entire renderRoutine function with this
export function renderRoutine(routineData, routineDisplayEl) {
    routineDisplayEl.innerHTML = '';
    if (!routineData) return;
    
    routineData.forEach(section => {
        const article = document.createElement('article');
        article.dataset.sectionContainer = 'true';

        // Calculate stats and progress percentage for the section
        let totalTasks = 0, completedTasks = 0;
        section.tasks.forEach(task => {
            totalTasks++;
            if (task.completed) completedTasks++;
            if (task.subtasks) {
                task.subtasks.forEach(subtask => {
                    totalTasks++;
                    if (subtask.completed) completedTasks++;
                });
            }
        });
        const statsText = `${completedTasks} / ${totalTasks} completed`;
        const progressPercent = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

        // Map tasks to HTML
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
                    return `<div class="subtask"><div class="task-row ${isSubtaskCompleted}" data-section-id="${section.id}" data-task-index="${taskIndex}" data-subtask-index="${subtaskIndex}"><div class="checkbox" data-action="toggle-check"></div><div class="task-content"><span class="star-button" data-action="toggle-star">${subtaskStarIcon}</span><span class="task-text">${subtask.text}</span><span class="delete-button" data-action="delete" title="Delete Task">🗑️</span></div></div>${subtaskNoteHTML}</div>`;
                }).join('');
            }
            return `<div class="task-container" data-task-category="${task.category || 'none'}"><div class="task-row ${isCompleted}" data-section-id="${section.id}" data-task-index="${taskIndex}"><div class="checkbox" data-action="toggle-check"></div><div class="task-content"><span class="star-button" data-action="toggle-star">${starIcon}</span><strong class="task-text">${task.text}</strong>${categoryTag}<span class="delete-button" data-action="delete" title="Delete Task">🗑️</span></div></div>${taskNoteHTML}<div class="subtask-wrapper">${subtasksHTML}</div></div>`;
        }).join('');
        
        // Build the final HTML for the article
        article.innerHTML = `
            <header>
                <div style="flex-grow: 1;">
                    <strong>${section.header}</strong>
                    <div style="font-size: 0.8em; color: var(--pico-secondary-foreground);">${statsText}</div>
                </div>
                <button class="outline" data-alarm-section-id="${section.id}" style="padding: 2px 8px;" title="Set Alarm">🔔</button>
            </header>
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: ${progressPercent}%;"></div>
            </div>
            <div class="article-body">${tasksHTML}</div>
        `;
        routineDisplayEl.appendChild(article);
    });
}

export function updatePlanSwitcherUI(planSwitcherEl, saarthiData) {
    planSwitcherEl.innerHTML = '';
    const planNames = Object.keys(saarthiData.plans);
    planSwitcherEl.hidden = planNames.length === 0;
    if (planNames.length === 0) return;
    
    planNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        option.selected = name === saarthiData.active_plan_name;
        planSwitcherEl.appendChild(option);
    });
}

export function renderScheduleUI(scheduleContainerEl, saarthiData) {
    const planNames = Object.keys(saarthiData.plans);
    for (let i = 0; i < 7; i++) {
        const selectEl = scheduleContainerEl.querySelector(`[data-day="${i}"]`);
        if (!selectEl) continue;
        selectEl.innerHTML = '<option value="">-- No Plan --</option>';
        planNames.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            if (saarthiData.schedule && saarthiData.schedule[i] === name) {
                option.selected = true;
            }
            selectEl.appendChild(option);
        });
    }
}

export function renderWeeklyChart(history) {
    const labels = []; const data = [];
    for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000);
        labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
        data.push(history[date.toLocaleDateString('en-CA')] || 0);
    }
    const ctx = document.getElementById('weekly-chart').getContext('2d');
    if (weeklyChart) weeklyChart.destroy();
    weeklyChart = new window.Chart(ctx, { type: 'bar', data: { labels, datasets: [{ label: 'Tasks Completed', data, backgroundColor: 'rgba(59, 130, 246, 0.5)', borderColor: 'rgba(59, 130, 246, 1)', borderWidth: 1 }] }, options: { scales: { y: { beginAtZero: true, ticks: { color: 'var(--pico-color)' } }, x: { ticks: { color: 'var(--pico-color)' } } }, plugins: { legend: { labels: { color: 'var(--pico-color)' } } } } });
}

export function renderCategoryDonutChart(routineData) {
    const categoryCounts = {}; let tasksWithoutCategory = 0;
    if (routineData) {
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
    }
    if (tasksWithoutCategory > 0) categoryCounts['uncategorized'] = tasksWithoutCategory;
    const labels = Object.keys(categoryCounts); const data = Object.values(categoryCounts);
    const ctx = document.getElementById('category-chart').getContext('2d');
    if (categoryChart) categoryChart.destroy();
    categoryChart = new window.Chart(ctx, { type: 'doughnut', data: { labels, datasets: [{ label: 'Pending Tasks', data, backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(239, 68, 68, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(16, 185, 129, 0.7)', 'rgba(139, 92, 246, 0.7)'], borderColor: 'var(--pico-card-background-color)', borderWidth: 2 }] }, options: { responsive: true, plugins: { legend: { position: 'top', labels: { color: 'var(--pico-color)' } } } } });
}

export function setAlarm(section) {
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

export function renderCalendar(date, calendarDaysEl, monthYearHeaderEl, scheduledTasks = {}) {
    calendarDaysEl.innerHTML = '';
    const month = date.getMonth();
    const year = date.getFullYear();

    monthYearHeaderEl.textContent = date.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Add blank days for the start of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDaysEl.innerHTML += `<div class="calendar-day other-month"></div>`;
    }

    // Add days of the current month
    for (let i = 1; i <= daysInMonth; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';
        
        const dayNumber = document.createElement('span');
        dayNumber.textContent = i;
        dayEl.appendChild(dayNumber);

        // --- NEW: Check for and display scheduled tasks ---
        const thisDate = new Date(year, month, i + 1);
        const dateString = thisDate.toISOString().slice(0, 10); // Format to YYYY-MM-DD

        if (scheduledTasks[dateString]) {
            const tasksList = document.createElement('ul');
            tasksList.className = 'calendar-tasks';
            scheduledTasks[dateString].forEach(task => {
                const taskItem = document.createElement('li');
                taskItem.textContent = task.text;
                if (task.starred) taskItem.textContent = '⭐ ' + taskItem.textContent;
                tasksList.appendChild(taskItem);
            });
            dayEl.appendChild(tasksList);
        }
        // --- END NEW LOGIC ---
        
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayEl.classList.add('today');
        }
        
        calendarDaysEl.appendChild(dayEl);
    }
}