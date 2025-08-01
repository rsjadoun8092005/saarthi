document.addEventListener('DOMContentLoaded', () => {
    // --- Get all the HTML elements we need ---
    const generatorView = document.getElementById('generator-view');
    const checklistView = document.getElementById('checklist-view');
    const generatorForm = document.getElementById('generator-form');
    const timetableInput = document.getElementById('timetable-input');
    const goalsInput = document.getElementById('goals-input');
    const routineDisplay = document.getElementById('routine-display');
    const todayDateEl = document.getElementById('today-date');
    const resetButton = document.getElementById('reset-button');
    const enableNotificationsButton = document.getElementById('enable-notifications-button'); // NEW

    // --- App's main data variable ---
    let routineData = null;
    let notificationsEnabled = false; // NEW: Track notification status

    // --- PARSING AND RENDERING FUNCTIONS (No changes here) ---
    function parseInputs(timetableText, goalsText) {
        let routine = [];
        const timetableSections = timetableText.split('---').map(s => s.trim()).filter(Boolean);
        const parsedTimetable = timetableSections.map((section, index) => {
            const lines = section.split('\n').map(l => l.trim());
            const header = lines.shift();
            const tasks = lines.map(line => ({ text: line.replace('[ ]', '').trim(), completed: false })).filter(task => task.text);
            return { id: `t${index}`, header: header, tasks: tasks };
        });
        routine = routine.concat(parsedTimetable);
        const goalsLines = goalsText.split('\n').map(l => l.trim()).filter(Boolean);
        if (goalsLines.length > 0) {
            const goalsTasks = goalsLines.map(line => ({ text: line.replace('[ ]', '').trim(), completed: false }));
            routine.push({ id: 'g1', header: "🎯 Today's Goals", tasks: goalsTasks });
        }
        return routine;
    }

    function renderRoutine() {
        routineDisplay.innerHTML = '';
        if (!routineData) return;
        routineData.forEach(section => {
            const article = document.createElement('article');
            let tasksHTML = section.tasks.map((task, taskIndex) => `
                <label>
                    <input type="checkbox" data-section-id="${section.id}" data-task-index="${taskIndex}" ${task.completed ? 'checked' : ''}>
                    ${task.text}
                </label>
            `).join('');
            // NEW: Add alarm button to each header
            article.innerHTML = `
                <header style="display: flex; justify-content: space-between; align-items: center;">
                    <strong>${section.header}</strong>
                    <button class="outline" data-alarm-section-id="${section.id}" style="padding: 2px 8px;" aria-label="Set Alarm">🔔</button>
                </header>
                ${tasksHTML}
            `;
            routineDisplay.appendChild(article);
        });
    }

    // --- LOCAL STORAGE FUNCTIONS (No changes here) ---
    function saveState() {
        localStorage.setItem('saarthi_plan', JSON.stringify(routineData));
        localStorage.setItem('saarthi_plan_date', new Date().toLocaleDateString('en-CA'));
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

    // --- NEW: ALARM FUNCTIONS ---
    function requestNotificationPermission() {
        if (!('Notification' in window)) {
            alert('This browser does not support desktop notifications.');
            return;
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
        console.log("Attempting to set alarm for:", section.header); // DEBUG LOG

        if (!notificationsEnabled) {
            alert('Please enable notifications first by clicking the button at the top.');
            console.error("Alarm failed: Notifications not enabled."); // DEBUG LOG
            return;
        }

        const timeMatch = section.header.match(/(\d{1,2}:\d{2})\s*(AM|PM)?/i);
        if (!timeMatch) {
            alert('Could not find a valid time (e.g., 4:00 or 5:30 PM) in this section header to set an alarm.');
            console.error("Alarm failed: Could not parse time from header."); // DEBUG LOG
            return;
        }

        let [_, timeStr, ampm] = timeMatch;
        let [hours, minutes] = timeStr.split(':').map(Number);
        if (ampm && /pm/i.test(ampm) && hours < 12) hours += 12;
        if (ampm && /am/i.test(ampm) && hours === 12) hours = 0;

        const now = new Date();
        const alarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);

        console.log("Current time:", now); // DEBUG LOG
        console.log("Alarm time calculated:", alarmTime); // DEBUG LOG

        if (alarmTime < now) {
            alert(`This time (${timeStr}) has already passed today. Alarm not set.`);
            console.warn("Alarm failed: Time is in the past."); // DEBUG LOG
            return;
        }

        const timeToAlarm = alarmTime.getTime() - now.getTime();
        console.log(`Scheduling notification in ${timeToAlarm} milliseconds.`); // DEBUG LOG

        setTimeout(() => {
            console.log("Firing notification NOW!"); // DEBUG LOG
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
        routineData = parseInputs(timetableInput.value, goalsInput.value);
        saveState();
        initialLoad();
    });

    routineDisplay.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const sectionId = e.target.dataset.sectionId;
            const taskIndex = parseInt(e.target.dataset.taskIndex, 10);
            const section = routineData.find(s => s.id === sectionId);
            if (section && section.tasks[taskIndex]) {
                section.tasks[taskIndex].completed = e.target.checked;
                saveState();
            }
        }
    });

    // NEW: Add listener for alarm buttons
    routineDisplay.addEventListener('click', (e) => {
        if (e.target.dataset.alarmSectionId) {
            const sectionId = e.target.dataset.alarmSectionId;
            const section = routineData.find(s => s.id === sectionId);
            if (section) {
                setAlarm(section);
            }
        }
    });

    resetButton.addEventListener('click', () => {
        if (confirm('Are you sure you want to erase this plan and start over?')) {
            localStorage.removeItem('saarthi_plan');
            localStorage.removeItem('saarthi_plan_date');
            routineData = null;
            initialLoad();
        }
    });

    // NEW: Add listener for main notifications button
    enableNotificationsButton.addEventListener('click', requestNotificationPermission);

    // --- Run the initial function ---
    initialLoad();
});