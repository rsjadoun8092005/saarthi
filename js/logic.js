/* ===============================================================
   LOGIC MODULE
   - Handles data parsing, saving, loading, and calculations.
   =============================================================== */

export function loadData(DEFAULT_DATA) {
    const data = JSON.parse(localStorage.getItem('saarthi_data')) || { ...DEFAULT_DATA };
    
    // Auto-select the scheduled plan for today if it exists
    const todayDay = new Date().getDay();
    const scheduledPlan = data.schedule ? data.schedule[todayDay] : null;
    if (scheduledPlan && data.plans[scheduledPlan]) {
        data.active_plan_name = scheduledPlan;
    } 
    // Fallback to the first available plan if the active one is invalid
    else if (!data.active_plan_name || !data.plans[data.active_plan_name]) {
        data.active_plan_name = Object.keys(data.plans)[0] || null;
    }
    return data;
}

export function saveData(saarthiData) {
    localStorage.setItem('saarthi_data', JSON.stringify(saarthiData));
}

export function parseInputs(timetableText, goalsText) {
    // This pure function parses the text and returns a data structure
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

export function generateTodayViewData(saarthiData) {
    const today = new Date();
    const todayDay = today.getDay(); // 0=Sun, 1=Mon...
    const todayDateString = today.toISOString().slice(0, 10); // YYYY-MM-DD

    let mergedRoutine = [];
    
    // 1. Get the scheduled daily plan for today
    const scheduledPlanName = saarthiData.schedule ? saarthiData.schedule[todayDay] : null;
    if (scheduledPlanName && saarthiData.plans[scheduledPlanName]?.data) {
        // Use a deep copy to avoid modifying the original template
        const planTemplate = JSON.parse(JSON.stringify(saarthiData.plans[scheduledPlanName].data));
        mergedRoutine.push(...planTemplate);
    }

    // 2. Get any one-off tasks scheduled for today from the calendar
    const scheduledTasks = saarthiData.scheduledTasks ? saarthiData.scheduledTasks[todayDateString] : null;
    if (scheduledTasks && scheduledTasks.length > 0) {
        mergedRoutine.push({
            id: "scheduled-today",
            header: "🗓️ Scheduled for Today",
            tasks: scheduledTasks
        });
    }

    return mergedRoutine;
}

export function updateStreak(saarthiData) {
    const activePlan = saarthiData.plans[saarthiData.active_plan_name];
    if (!activePlan?.data) return { text: '', data: saarthiData };
    
    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');
    const anyTaskCompletedToday = activePlan.data.some(s => s.tasks.some(t => t.completed || (t.subtasks && t.subtasks.some(st => st.completed))));

    if (anyTaskCompletedToday) {
        if (saarthiData.streak.last_date !== today) {
            if (saarthiData.streak.last_date === yesterday) { saarthiData.streak.count++; } else { saarthiData.streak.count = 1; }
            saarthiData.streak.last_date = today;
        }
    } else {
        if (saarthiData.streak.last_date === today) {
            saarthiData.streak.count--;
            saarthiData.streak.last_date = saarthiData.streak.count > 0 ? yesterday : null;
        }
    }
    
    const streakText = saarthiData.streak.count > 0 ? `🔥 ${saarthiData.streak.count} Day Streak!` : '';
    return { text: streakText, data: saarthiData };
}

export function updateHistory(saarthiData) {
    const activePlan = saarthiData.plans[saarthiData.active_plan_name];
    if (!activePlan?.data) return saarthiData;
    
    const today = new Date().toLocaleDateString('en-CA');
    const completedCount = activePlan.data.reduce((count, section) => {
        const main = section.tasks.filter(t => t.completed).length;
        const sub = section.tasks.reduce((sc, t) => sc + (t.subtasks ? t.subtasks.filter(st => st.completed).length : 0), 0);
        return count + main + sub;
    }, 0);
    
    if(!saarthiData.history) saarthiData.history = {};
    saarthiData.history[today] = completedCount;
    return saarthiData;
}

export function exportData(saarthiData) {
    const jsonString = JSON.stringify(saarthiData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saarthi-backup-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function importData(file, callback) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const importedData = JSON.parse(event.target.result);
            // Basic validation to ensure it's our data structure
            if (importedData && importedData.plans && importedData.history) {
                callback(importedData);
            } else {
                alert("Error: Invalid or corrupted backup file.");
            }
        } catch (error) {
            alert("Error reading backup file. Make sure it's a valid JSON file.");
            console.error("Import error:", error);
        }
    };
    reader.readAsText(file);
}

