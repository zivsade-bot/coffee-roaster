// Coffee Roaster Tracker - Main JavaScript
// Version 2.1 - Edit Roasts Feature

// Global state for edit mode
let editingRoastId = null;
let isDuplicating = false;
let duplicateSourceDate = null;

// Default beans list
const defaultBeans = [
    'Brazil Santos',
    'Burundi',
    'Colombia Supremo',
    'Costa Rica Tarrazu',
    'Espresso Blend',
    'Ethiopia Yirgacheffe',
    'Guatemala Antigua',
    'House Blend',
    'Java',
    'Kenya AA',
    'Rwanda',
    'Sumatra Mandheling',
    'Tanzania Peaberry',
    'Yemen Mocha'
];

// ==================== STORAGE UTILITIES ====================

// Safe localStorage wrapper with error handling
const Storage = {
    get: function(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    },
    
    set: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                alert('⚠️ Storage is full! Please export your data and clear some history.');
            } else {
                console.error('Storage set error:', e);
                alert('Failed to save data. Please try again.');
            }
            return false;
        }
    },
    
    remove: function(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    }
};

// Simple HTML escape to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== BEAN MANAGEMENT ====================

// Load beans list from storage or use defaults
function loadBeansList() {
    let beans = Storage.get('beansList', null);
    if (!beans || beans.length === 0) {
        beans = [...defaultBeans];
        Storage.set('beansList', beans);
    }
    return beans.sort((a, b) => a.localeCompare(b));
}

// Save beans list to storage (automatically sorts)
function saveBeansList(beans) {
    const sortedBeans = beans.sort((a, b) => a.localeCompare(b));
    return Storage.set('beansList', sortedBeans);
}

// Update select dropdown with current beans
function updateBeansDatalist() {
    const beans = loadBeansList();
    const select = document.getElementById('beanNameSelect');
    select.innerHTML = '<option value="">-- Select Bean --</option>' +
        beans.map(bean => `<option value="${escapeHtml(bean)}">${escapeHtml(bean)}</option>`).join('') +
        '<option value="__OTHER__">✏️ Other (Custom)...</option>';
}

// Handle bean selection
function handleBeanSelection() {
    const select = document.getElementById('beanNameSelect');
    const customInput = document.getElementById('beanNameCustom');
    
    if (select.value === '__OTHER__') {
        customInput.style.display = 'block';
        customInput.focus();
    } else {
        customInput.style.display = 'none';
        customInput.value = '';
    }
}

// Get selected bean name
function getSelectedBeanName() {
    const select = document.getElementById('beanNameSelect');
    const customInput = document.getElementById('beanNameCustom');
    
    if (select.value === '__OTHER__') {
        return customInput.value.trim();
    } else {
        return select.value;
    }
}

// Open bean manager modal
function openBeanManager() {
    document.getElementById('beanManagerModal').classList.add('active');
    loadBeanManager();
}

// Close bean manager modal
function closeBeanManager() {
    document.getElementById('beanManagerModal').classList.remove('active');
    document.getElementById('newBeanInput').value = '';
    updateBeansDatalist();
}

// Load beans in manager
function loadBeanManager() {
    const beans = loadBeansList();
    const container = document.getElementById('beanListContainer');
    
    if (beans.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">No beans in list</p>';
        return;
    }

    container.innerHTML = beans.map(bean => `
        <div class="bean-list-item">
            <span>${escapeHtml(bean)}</span>
            <button class="small-btn btn-delete-small" onclick="deleteBean('${escapeHtml(bean).replace(/'/g, "\\'")}')">Delete</button>
        </div>
    `).join('');
}

// Add new bean
function addBean() {
    const input = document.getElementById('newBeanInput');
    const newBean = input.value.trim();
    
    if (!newBean) {
        alert('Please enter a bean name');
        return;
    }

    const beans = loadBeansList();
    
    if (beans.includes(newBean)) {
        alert('This bean already exists in the list');
        return;
    }

    beans.push(newBean);
    if (saveBeansList(beans)) {
        updateBeansDatalist();
        loadBeanManager();
        input.value = '';
    }
}

// Delete bean
function deleteBean(beanName) {
    if (!confirm(`Delete "${beanName}" from the list?`)) {
        return;
    }

    let beans = loadBeansList();
    beans = beans.filter(b => b !== beanName);
    if (saveBeansList(beans)) {
        updateBeansDatalist();
        loadBeanManager();
    }
}

// ==================== TIME UTILITIES ====================

// Validate time format MM:SS
function validateTimeFormat(input) {
    const value = input.value;
    if (!value) return;
    
    // Remove non-digits and colons
    let cleaned = value.replace(/[^\d:]/g, '');
    
    // Auto-format as user types
    if (cleaned.length === 2 && !cleaned.includes(':')) {
        cleaned = cleaned + ':';
    }
    
    // Limit to MM:SS format
    const parts = cleaned.split(':');
    if (parts.length > 2) {
        cleaned = parts[0] + ':' + parts[1];
    }
    
    // Validate minutes and seconds
    if (parts[0] && parseInt(parts[0]) > 99) {
        parts[0] = '99';
    }
    if (parts[1] && parseInt(parts[1]) > 59) {
        parts[1] = '59';
    }
    
    cleaned = parts.join(':');
    input.value = cleaned;
}

// Convert time string MM:SS to seconds
function timeToSeconds(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return 0;
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// Format seconds as MM:SS
function secondsToTime(seconds) {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Add time input validation to all time fields
function setupTimeInputs() {
    const timeInputs = document.querySelectorAll('.time-input');
    timeInputs.forEach(input => {
        input.addEventListener('input', function() {
            validateTimeFormat(this);
        });
        
        input.addEventListener('blur', function() {
            const value = this.value;
            if (value && value.split(':').length === 2) {
                const parts = value.split(':');
                this.value = `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
            }
        });
    });
}

// ==================== CALCULATIONS ====================

// Sync Final Temperature from Basic Info to Time Points
function syncFinalTemp() {
    const finalTemp = parseFloat(document.getElementById('finalTemp').value);
    if (finalTemp) {
        document.getElementById('finalTempPoint').value = finalTemp.toFixed(1);
        document.getElementById('final1Temp').value = (finalTemp - 1).toFixed(1);
        document.getElementById('final2Temp').value = (finalTemp - 2).toFixed(1);
    } else {
        document.getElementById('finalTempPoint').value = '';
        document.getElementById('final1Temp').value = '';
        document.getElementById('final2Temp').value = '';
    }
}

// Calculate Cooling Start Time = Final Time + 3 minutes
function calculateCoolingStartTime() {
    const finalTime = document.getElementById('finalTime').value;
    if (!finalTime) {
        document.getElementById('coolingStartTime').value = '';
        return;
    }

    const totalSeconds = timeToSeconds(finalTime) + (3 * 60);
    document.getElementById('coolingStartTime').value = secondsToTime(totalSeconds);
    calculateMetrics();
}

// Calculate weight loss percentage
function calculateLoss() {
    const green = parseFloat(document.getElementById('greenWeight').value) || 0;
    const roasted = parseFloat(document.getElementById('roastedWeight').value) || 0;
    
    if (green > 0 && roasted > 0) {
        const loss = ((green - roasted) / green * 100).toFixed(2);
        document.getElementById('lossPercent').textContent = loss + '%';
        return loss;
    }
    document.getElementById('lossPercent').textContent = '-';
    return null;
}

// Calculate roasting metrics
function calculateMetrics() {
    const coolingTPTime = timeToSeconds(document.getElementById('coolingTPTime').value);
    const coolingStartTime = timeToSeconds(document.getElementById('coolingStartTime').value);
    const fcsTime = timeToSeconds(document.getElementById('fcsTime').value);
    
    // Total Roast Time = Cooling TP
    if (coolingTPTime > 0) {
        document.getElementById('totalTime').textContent = secondsToTime(coolingTPTime);
    } else {
        document.getElementById('totalTime').textContent = '-';
    }
    
    // Total Time (CS) = Cooling Start time
    if (coolingStartTime > 0) {
        document.getElementById('totalTimeCS').textContent = secondsToTime(coolingStartTime);
    } else {
        document.getElementById('totalTimeCS').textContent = '-';
    }
    
    // Development Time (CS) = Cooling Start - 1Cs
    if (coolingStartTime > 0 && fcsTime > 0 && fcsTime < coolingStartTime) {
        const devTimeCS = coolingStartTime - fcsTime;
        document.getElementById('devTimeCS').textContent = secondsToTime(devTimeCS);
        
        // DTR (CS) based on Cooling Start
        const dtrCS = (devTimeCS / coolingStartTime * 100).toFixed(1);
        document.getElementById('dtrCS').textContent = dtrCS + '%';
    } else {
        document.getElementById('devTimeCS').textContent = '-';
        document.getElementById('dtrCS').textContent = '-';
    }
    
    // Development Time (CTP) = Cooling TP - 1Cs
    if (coolingTPTime > 0 && fcsTime > 0 && fcsTime < coolingTPTime) {
        const devTimeCTP = coolingTPTime - fcsTime;
        document.getElementById('devTimeCTP').textContent = secondsToTime(devTimeCTP);
        
        // DTR (CTP) based on CTP
        const dtr = (devTimeCTP / coolingTPTime * 100).toFixed(1);
        document.getElementById('dtr').textContent = dtr + '%';
    } else {
        document.getElementById('devTimeCTP').textContent = '-';
        document.getElementById('dtr').textContent = '-';
    }
}

// ==================== ROAST MANAGEMENT ====================

// Save roast to storage
function saveRoast() {
    const beanName = getSelectedBeanName();
    const roastDate = document.getElementById('roastDate').value;
    
    // Validate required fields
    if (!beanName || !document.getElementById('finalTime').value || !roastDate) {
        alert('Please fill in at least Roast Date, Bean Name and Final Time');
        return;
    }

    // Auto-add new bean to list if it doesn't exist
    const beans = loadBeansList();
    if (beanName && !beans.includes(beanName)) {
        beans.push(beanName);
        saveBeansList(beans);
        updateBeansDatalist();
    }

    const roastData = {
        date: roastDate,
        timestamp: new Date().toISOString(),
        beanName: beanName,
        envTemp: document.getElementById('envTemp').value,
        chargeTemp: document.getElementById('chargeTemp').value,
        finalTemp: document.getElementById('finalTemp').value,
        greenWeight: document.getElementById('greenWeight').value,
        roastedWeight: document.getElementById('roastedWeight').value,
        lossPercent: calculateLoss(),
        tpTime: document.getElementById('tpTime').value,
        tpTemp: document.getElementById('tpTemp').value,
        dryEndTime: document.getElementById('dryEndTime').value,
        dryEndTemp: document.getElementById('dryEndTemp').value,
        final2Time: document.getElementById('final2Time').value,
        final2Temp: document.getElementById('final2Temp').value,
        final1Time: document.getElementById('final1Time').value,
        final1Temp: document.getElementById('final1Temp').value,
        finalTime: document.getElementById('finalTime').value,
        finalTempPoint: document.getElementById('finalTempPoint').value,
        fcsTime: document.getElementById('fcsTime').value,
        fcsTemp: document.getElementById('fcsTemp').value,
        fceTime: document.getElementById('fceTime').value,
        fceTemp: document.getElementById('fceTemp').value,
        coolingStartTime: document.getElementById('coolingStartTime').value,
        coolingStartTemp: document.getElementById('coolingStartTemp').value,
        coolingTPTime: document.getElementById('coolingTPTime').value,
        coolingTPTemp: document.getElementById('coolingTPTemp').value,
        roastPlan: document.getElementById('roastPlan').value,
        roastNotes: document.getElementById('roastNotes').value,
        // Calculated fields
        totalTimeCS: document.getElementById('totalTimeCS').textContent !== '-' ? 
            document.getElementById('totalTimeCS').textContent : null,
        totalTimeCTP: document.getElementById('totalTime').textContent !== '-' ? 
            document.getElementById('totalTime').textContent : null,
        devTimeCS: document.getElementById('devTimeCS').textContent !== '-' ? 
            document.getElementById('devTimeCS').textContent : null,
        devTimeCTP: document.getElementById('devTimeCTP').textContent !== '-' ? 
            document.getElementById('devTimeCTP').textContent : null,
        dtrCS: document.getElementById('dtrCS').textContent !== '-' ? 
            document.getElementById('dtrCS').textContent : null,
        dtrCTP: document.getElementById('dtr').textContent !== '-' ? 
            document.getElementById('dtr').textContent : null
    };

    const roasts = Storage.get('roasts', []);
    
    if (editingRoastId && !isDuplicating) {
        // Update existing roast (only if in edit mode, not duplicate)
        const index = roasts.findIndex(r => r.id === editingRoastId);
        if (index !== -1) {
            // Keep original ID and creation timestamp
            roastData.id = editingRoastId;
            roastData.createdAt = roasts[index].createdAt || roasts[index].timestamp;
            roastData.timestamp = new Date().toISOString(); // Update modified timestamp
            roasts[index] = roastData;
            
            if (Storage.set('roasts', roasts)) {
                alert('✅ Roast updated successfully!');
                clearForm();
                populateBeanFilter(); // Update filter list
                switchTab('history');
                loadRoastHistory();
            }
        } else {
            alert('❌ Error: Roast not found!');
        }
    } else {
        // Create new roast (either brand new or duplicate)
        roastData.id = Date.now();
        roastData.createdAt = roastData.timestamp;
        roasts.push(roastData);
        
        const successMessage = isDuplicating ? 
            '✅ Roast duplicated and saved successfully!' : 
            '✅ Roast saved successfully!';
        
        if (Storage.set('roasts', roasts)) {
            alert(successMessage);
            clearForm();
            populateBeanFilter(); // Update filter list
            switchTab('history');
            loadRoastHistory();
        }
    }
}

// Clear form (FIXED - single function)
function clearForm() {
    // Clear all input fields except auto-calculated ones
    const inputs = document.querySelectorAll('input:not([readonly])');
    inputs.forEach(input => {
        if (input.type !== 'date') {
            input.value = '';
        }
    });
    
    // Reset bean selection
    document.getElementById('beanNameSelect').value = '';
    document.getElementById('beanNameCustom').value = '';
    document.getElementById('beanNameCustom').style.display = 'none';
    
    // Reset date to today
    setTodayDate();
    
    // Clear textareas
    document.getElementById('roastPlan').value = '';
    document.getElementById('roastNotes').value = '';
    
    // Clear auto-calculated fields
    document.getElementById('finalTempPoint').value = '';
    document.getElementById('final1Temp').value = '';
    document.getElementById('final2Temp').value = '';
    document.getElementById('coolingStartTime').value = '';
    
    // Reset calculated displays
    document.getElementById('lossPercent').textContent = '-';
    document.getElementById('totalTime').textContent = '-';
    document.getElementById('devTimeCS').textContent = '-';
    document.getElementById('devTimeCTP').textContent = '-';
    document.getElementById('dtr').textContent = '-';
    
    // Clear edit/duplicate mode
    editingRoastId = null;
    isDuplicating = false;
    duplicateSourceDate = null;
    updateEditModeUI();
}

// Duplicate existing roast for new roast
function duplicateRoast(id) {
    const roasts = Storage.get('roasts', []);
    const roast = roasts.find(r => r.id === id);
    
    if (!roast) {
        alert('❌ Roast not found!');
        return;
    }
    
    // Set duplicate mode (not edit mode!)
    isDuplicating = true;
    duplicateSourceDate = roast.date;
    editingRoastId = null; // Important: this is NOT editing
    
    // Load all fields EXCEPT date (use today's date instead)
    setTodayDate(); // Set to today
    
    document.getElementById('envTemp').value = roast.envTemp || '';
    document.getElementById('chargeTemp').value = roast.chargeTemp || '';
    document.getElementById('finalTemp').value = roast.finalTemp || '';
    document.getElementById('greenWeight').value = roast.greenWeight || '';
    document.getElementById('roastedWeight').value = roast.roastedWeight || '';
    
    // Load time/temp points
    document.getElementById('tpTime').value = roast.tpTime || '';
    document.getElementById('tpTemp').value = roast.tpTemp || '';
    document.getElementById('dryEndTime').value = roast.dryEndTime || '';
    document.getElementById('dryEndTemp').value = roast.dryEndTemp || '';
    document.getElementById('final2Time').value = roast.final2Time || '';
    document.getElementById('final2Temp').value = roast.final2Temp || '';
    document.getElementById('final1Time').value = roast.final1Time || '';
    document.getElementById('final1Temp').value = roast.final1Temp || '';
    document.getElementById('finalTime').value = roast.finalTime || '';
    document.getElementById('finalTempPoint').value = roast.finalTempPoint || '';
    document.getElementById('fcsTime').value = roast.fcsTime || '';
    document.getElementById('fcsTemp').value = roast.fcsTemp || '';
    document.getElementById('fceTime').value = roast.fceTime || '';
    document.getElementById('fceTemp').value = roast.fceTemp || '';
    document.getElementById('coolingStartTime').value = roast.coolingStartTime || '';
    document.getElementById('coolingStartTemp').value = roast.coolingStartTemp || '';
    document.getElementById('coolingTPTime').value = roast.coolingTPTime || '';
    document.getElementById('coolingTPTemp').value = roast.coolingTPTemp || '';
    
    // Load notes
    document.getElementById('roastPlan').value = roast.roastPlan || '';
    document.getElementById('roastNotes').value = roast.roastNotes || '';
    
    // Load bean name
    const beans = loadBeansList();
    if (beans.includes(roast.beanName)) {
        document.getElementById('beanNameSelect').value = roast.beanName;
        document.getElementById('beanNameCustom').style.display = 'none';
    } else {
        document.getElementById('beanNameSelect').value = 'custom';
        document.getElementById('beanNameCustom').value = roast.beanName;
        document.getElementById('beanNameCustom').style.display = 'block';
    }
    
    // Recalculate everything
    calculateLoss();
    syncFinalTemp();
    calculateCoolingStartTime();
    calculateMetrics();
    
    // Update UI to show duplicate mode
    updateEditModeUI();
    
    // Switch to edit tab
    switchTab('new');
}

// Load existing roast for editing
function loadRoastForEdit(id) {
    const roasts = Storage.get('roasts', []);
    const roast = roasts.find(r => r.id === id);
    
    if (!roast) {
        alert('❌ Roast not found!');
        return;
    }
    
    // Set edit mode
    editingRoastId = id;
    
    // Load all fields
    document.getElementById('roastDate').value = roast.date || '';
    document.getElementById('envTemp').value = roast.envTemp || '';
    document.getElementById('chargeTemp').value = roast.chargeTemp || '';
    document.getElementById('finalTemp').value = roast.finalTemp || '';
    document.getElementById('greenWeight').value = roast.greenWeight || '';
    document.getElementById('roastedWeight').value = roast.roastedWeight || '';
    
    // Load time/temp points
    document.getElementById('tpTime').value = roast.tpTime || '';
    document.getElementById('tpTemp').value = roast.tpTemp || '';
    document.getElementById('dryEndTime').value = roast.dryEndTime || '';
    document.getElementById('dryEndTemp').value = roast.dryEndTemp || '';
    document.getElementById('final2Time').value = roast.final2Time || '';
    document.getElementById('final2Temp').value = roast.final2Temp || '';
    document.getElementById('final1Time').value = roast.final1Time || '';
    document.getElementById('final1Temp').value = roast.final1Temp || '';
    document.getElementById('finalTime').value = roast.finalTime || '';
    document.getElementById('finalTempPoint').value = roast.finalTempPoint || '';
    document.getElementById('fcsTime').value = roast.fcsTime || '';
    document.getElementById('fcsTemp').value = roast.fcsTemp || '';
    document.getElementById('fceTime').value = roast.fceTime || '';
    document.getElementById('fceTemp').value = roast.fceTemp || '';
    document.getElementById('coolingStartTime').value = roast.coolingStartTime || '';
    document.getElementById('coolingStartTemp').value = roast.coolingStartTemp || '';
    document.getElementById('coolingTPTime').value = roast.coolingTPTime || '';
    document.getElementById('coolingTPTemp').value = roast.coolingTPTemp || '';
    
    // Load notes
    document.getElementById('roastPlan').value = roast.roastPlan || '';
    document.getElementById('roastNotes').value = roast.roastNotes || '';
    
    // Load bean name
    const beans = loadBeansList();
    if (beans.includes(roast.beanName)) {
        document.getElementById('beanNameSelect').value = roast.beanName;
        document.getElementById('beanNameCustom').style.display = 'none';
    } else {
        document.getElementById('beanNameSelect').value = 'custom';
        document.getElementById('beanNameCustom').value = roast.beanName;
        document.getElementById('beanNameCustom').style.display = 'block';
    }
    
    // Recalculate everything
    calculateLoss();
    syncFinalTemp();
    calculateCoolingStartTime();
    calculateMetrics();
    
    // Update UI to show edit mode
    updateEditModeUI();
    
    // Switch to edit tab
    switchTab('new');
}

// Update UI based on edit mode
function updateEditModeUI() {
    const saveBtn = document.querySelector('.btn-primary');
    const heading = document.querySelector('.card .section-title');
    
    if (editingRoastId) {
        // Edit mode
        saveBtn.textContent = '✏️ עדכן קלייה';
        saveBtn.style.background = 'linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)';
        
        // Add cancel button if it doesn't exist
        if (!document.getElementById('cancelEditBtn')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'cancelEditBtn';
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = '❌ ביטול עריכה';
            cancelBtn.style.background = '#999';
            cancelBtn.onclick = cancelEdit;
            saveBtn.parentNode.insertBefore(cancelBtn, saveBtn);
        }
        
        // Show editing indicator
        if (heading && !document.getElementById('editIndicator')) {
            const indicator = document.createElement('span');
            indicator.id = 'editIndicator';
            indicator.textContent = ' (עריכת קלייה קיימת)';
            indicator.style.color = '#FF6B35';
            indicator.style.fontSize = '14px';
            heading.appendChild(indicator);
        }
    } else if (isDuplicating) {
        // Duplicate mode
        saveBtn.textContent = '💾 שמור קלייה חדשה';
        saveBtn.style.background = 'linear-gradient(135deg, #8B6F47 0%, #6F5B3A 100%)';
        
        // Add cancel button if it doesn't exist
        if (!document.getElementById('cancelEditBtn')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.id = 'cancelEditBtn';
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = '❌ ביטול';
            cancelBtn.style.background = '#999';
            cancelBtn.onclick = cancelEdit;
            saveBtn.parentNode.insertBefore(cancelBtn, saveBtn);
        }
        
        // Show duplicating indicator
        if (heading && !document.getElementById('editIndicator')) {
            const indicator = document.createElement('span');
            indicator.id = 'editIndicator';
            const formattedDate = duplicateSourceDate ? 
                new Date(duplicateSourceDate + 'T00:00:00').toLocaleDateString('he-IL') : '';
            indicator.textContent = ` (שכפול מקלייה מ-${formattedDate})`;
            indicator.style.color = '#8B6F47';
            indicator.style.fontSize = '14px';
            heading.appendChild(indicator);
        }
    } else {
        // New roast mode
        saveBtn.textContent = '💾 שמור קלייה';
        saveBtn.style.background = 'linear-gradient(135deg, #6F4E37 0%, #8B6F47 100%)';
        
        // Remove cancel button
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) cancelBtn.remove();
        
        // Remove editing/duplicate indicator
        const indicator = document.getElementById('editIndicator');
        if (indicator) indicator.remove();
    }
}

// Cancel edit mode
function cancelEdit() {
    const message = isDuplicating ? 
        'האם אתה בטוח שברצונך לבטל את השכפול? השינויים לא יישמרו.' :
        'האם אתה בטוח שברצונך לבטל את העריכה? השינויים לא יישמרו.';
    
    if (confirm(message)) {
        clearForm();
        switchTab('history');
    }
}

// Load roast history (FIXED - no array mutation) with optional filter
function loadRoastHistory(filterBean = null) {
    const roasts = Storage.get('roasts', []);
    const listContainer = document.getElementById('roastList');
    
    if (roasts.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">No saved roasts</p>';
        updateFilterInfo(0, 0);
        return;
    }

    // Sort by date - newest first
    let sortedRoasts = [...roasts].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA; // Newest first
    });
    
    // Apply filter if specified
    if (filterBean) {
        sortedRoasts = sortedRoasts.filter(r => r.beanName === filterBean);
    }
    
    // Update filter info
    updateFilterInfo(sortedRoasts.length, roasts.length);
    
    if (sortedRoasts.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">לא נמצאו קליות מסוג זה</p>';
        return;
    }
    
    listContainer.innerHTML = sortedRoasts.map(roast => {
        // Format date
        let displayDate;
        if (roast.date && roast.date.length === 10) {
            displayDate = new Date(roast.date + 'T00:00:00').toLocaleDateString('en-GB');
        } else {
            displayDate = new Date(roast.date).toLocaleDateString('en-GB');
        }
        
        // Build compact summary
        const summaryItems = [
            { label: 'איבוד', value: `${escapeHtml(roast.lossPercent)}%` },
            { label: 'זמן', value: escapeHtml(roast.coolingTPTime || '-') },
            { label: 'טמפ הזנה', value: `${escapeHtml(roast.chargeTemp || '-')}°C` },
            { label: 'טמפ פינאל', value: `${escapeHtml(roast.finalTemp)}°C` }
        ];
        
        const summaryHtml = summaryItems.map(item => `
            <div class="roast-summary-item">
                <span class="roast-summary-label">${item.label}:</span>
                <span class="roast-summary-value">${item.value}</span>
            </div>
        `).join('');
        
        // Build full details (hidden by default)
        const detailsRows = [
            { label: 'משקל ירוק', value: `${escapeHtml(roast.greenWeight)}g` },
            { label: 'משקל קלוי', value: `${escapeHtml(roast.roastedWeight)}g` },
            { label: 'איבוד משקל', value: `${escapeHtml(roast.lossPercent)}%` },
            { label: 'טמפרטורת סביבה', value: `${escapeHtml(roast.envTemp || '-')}°C` },
            { label: 'טמפרטורת הזנה', value: `${escapeHtml(roast.chargeTemp || '-')}°C` },
            { 
                label: 'Turning Point (TP)', 
                value: roast.tpTime || roast.tpTemp ? 
                    `${escapeHtml(roast.tpTime || '-')} @ ${escapeHtml(roast.tpTemp || '-')}°C` : '-'
            },
            { 
                label: 'Dry End', 
                value: roast.dryEndTime || roast.dryEndTemp ? 
                    `${escapeHtml(roast.dryEndTime || '-')} @ ${escapeHtml(roast.dryEndTemp || '-')}°C` : '-'
            },
            { 
                label: 'Final-2', 
                value: roast.final2Time || roast.final2Temp ? 
                    `${escapeHtml(roast.final2Time || '-')} @ ${escapeHtml(roast.final2Temp || '-')}°C` : '-'
            },
            { 
                label: 'Final-1', 
                value: roast.final1Time || roast.final1Temp ? 
                    `${escapeHtml(roast.final1Time || '-')} @ ${escapeHtml(roast.final1Temp || '-')}°C` : '-'
            },
            { 
                label: 'Final', 
                value: roast.finalTime || roast.finalTempPoint ? 
                    `${escapeHtml(roast.finalTime || '-')} @ ${escapeHtml(roast.finalTempPoint || '-')}°C` : '-'
            },
            { 
                label: '1st Crack Start (1Cs)', 
                value: roast.fcsTime || roast.fcsTemp ? 
                    `${escapeHtml(roast.fcsTime || '-')} @ ${escapeHtml(roast.fcsTemp || '-')}°C` : '-'
            },
            { 
                label: '1st Crack End (1Ce)', 
                value: roast.fceTime || roast.fceTemp ? 
                    `${escapeHtml(roast.fceTime || '-')} @ ${escapeHtml(roast.fceTemp || '-')}°C` : '-'
            },
            { 
                label: 'Cooling Start', 
                value: roast.coolingStartTime || roast.coolingStartTemp ? 
                    `${escapeHtml(roast.coolingStartTime || '-')} @ ${escapeHtml(roast.coolingStartTemp || '-')}°C` : '-'
            },
            { 
                label: 'Cooling to TP', 
                value: roast.coolingTPTime || roast.coolingTPTemp ? 
                    `${escapeHtml(roast.coolingTPTime || '-')} @ ${escapeHtml(roast.coolingTPTemp || '-')}°C` : '-'
            },
            { label: 'זמן קלייה (CS)', value: escapeHtml(roast.totalTimeCS || '-') },
            { label: 'זמן קלייה כולל (CTP)', value: escapeHtml(roast.totalTimeCTP || '-') },
            { label: 'Development Time (CS)', value: escapeHtml(roast.devTimeCS || '-') },
            { label: 'Development Time (CTP)', value: escapeHtml(roast.devTimeCTP || '-') },
            { label: 'DTR (CS) %', value: escapeHtml(roast.dtrCS || '-') },
            { label: 'DTR (CTP) %', value: escapeHtml(roast.dtrCTP || '-') },
            { label: 'טמפרטורה סופית', value: `${escapeHtml(roast.finalTemp)}°C` }
        ];
        
        let detailsHtml = detailsRows.map(row => `
            <div class="roast-details-row">
                <span class="roast-details-label">${row.label}</span>
                <span class="roast-details-value">${row.value}</span>
            </div>
        `).join('');
        
        // Add notes if exist
        if (roast.roastPlan) {
            detailsHtml += `
                <div class="roast-details-row" style="flex-direction: column; align-items: flex-start;">
                    <span class="roast-details-label">תכנון:</span>
                    <div style="direction: rtl; white-space: pre-wrap; padding-top: 5px; color: #333;">${escapeHtml(roast.roastPlan)}</div>
                </div>
            `;
        }
        
        if (roast.roastNotes) {
            detailsHtml += `
                <div class="roast-details-row" style="flex-direction: column; align-items: flex-start;">
                    <span class="roast-details-label">הערות:</span>
                    <div style="direction: rtl; white-space: pre-wrap; padding-top: 5px; color: #333;">${escapeHtml(roast.roastNotes)}</div>
                </div>
            `;
        }
        
        return `
            <div class="roast-item" id="roast-${roast.id}">
                <div class="roast-header" onclick="toggleRoastDetails(${roast.id})">
                    <div>
                        <div class="roast-name">${escapeHtml(roast.beanName)}</div>
                    </div>
                    <div class="roast-date">${displayDate}</div>
                </div>
                
                <div class="roast-summary" onclick="toggleRoastDetails(${roast.id})">
                    ${summaryHtml}
                </div>
                
                <div class="roast-details">
                    ${detailsHtml}
                    <button class="close-details-btn" onclick="event.stopPropagation(); toggleRoastDetails(${roast.id})">✖️ סגור</button>
                </div>
                
                <div class="roast-actions">
                    <button class="delete-btn" style="background: #8B6F47;" onclick="event.stopPropagation(); duplicateRoast(${roast.id})" title="שכפל קלייה">🔄</button>
                    <button class="delete-btn" style="background: #D4A574;" onclick="event.stopPropagation(); loadRoastForEdit(${roast.id})" title="ערוך קלייה">✏️</button>
                    <button class="delete-btn" onclick="event.stopPropagation(); deleteRoast(${roast.id})" title="מחק קלייה">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
}

// Toggle roast details expansion
function toggleRoastDetails(roastId) {
    const roastElement = document.getElementById(`roast-${roastId}`);
    if (roastElement) {
        roastElement.classList.toggle('expanded');
    }
}

// Populate bean filter dropdown with unique bean names
function populateBeanFilter() {
    const roasts = Storage.get('roasts', []);
    const filterSelect = document.getElementById('beanFilter');
    
    if (!filterSelect) return;
    
    // Get unique bean names
    const uniqueBeans = [...new Set(roasts.map(r => r.beanName))].sort();
    
    // Clear existing options except "All"
    filterSelect.innerHTML = '<option value="">כל הפולים</option>';
    
    // Add bean options
    uniqueBeans.forEach(bean => {
        const option = document.createElement('option');
        option.value = bean;
        option.textContent = bean;
        filterSelect.appendChild(option);
    });
}

// Filter roasts by selected bean
function filterRoastsByBean() {
    const filterSelect = document.getElementById('beanFilter');
    const selectedBean = filterSelect.value;
    
    if (selectedBean) {
        loadRoastHistory(selectedBean);
    } else {
        loadRoastHistory();
    }
}

// Reset bean filter
function resetBeanFilter() {
    const filterSelect = document.getElementById('beanFilter');
    if (filterSelect) {
        filterSelect.value = '';
        loadRoastHistory();
    }
}

// Update filter info display
function updateFilterInfo(showing, total) {
    const infoElement = document.getElementById('filterInfo');
    if (!infoElement) return;
    
    if (showing === total) {
        infoElement.textContent = `מציג ${total} קליות`;
        infoElement.classList.remove('active');
    } else {
        infoElement.textContent = `מציג ${showing} מתוך ${total} קליות`;
        infoElement.classList.add('active');
    }
}

// Delete roast
function deleteRoast(id) {
    if (confirm('Are you sure you want to delete this roast?')) {
        let roasts = Storage.get('roasts', []);
        roasts = roasts.filter(r => r.id !== id);
        if (Storage.set('roasts', roasts)) {
            populateBeanFilter(); // Update filter list
            const filterSelect = document.getElementById('beanFilter');
            const currentFilter = filterSelect ? filterSelect.value : '';
            loadRoastHistory(currentFilter || null);
        }
    }
}

// Clear all data
function clearAllData() {
    if (confirm('Are you sure you want to delete all history? This action cannot be undone!')) {
        if (Storage.remove('roasts')) {
            populateBeanFilter(); // Update filter list
            loadRoastHistory();
            alert('All data has been cleared');
        }
    }
}

// ==================== EXPORT ====================

// Export to Excel
function exportToExcel() {
    const roasts = Storage.get('roasts', []);
    const beans = loadBeansList();
    const blends = Storage.get('blends', []);
    
    if (roasts.length === 0 && beans.length === 0 && blends.length === 0) {
        alert('❌ אין נתונים לייצוא');
        return;
    }

    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Roasts
    if (roasts.length > 0) {
        const roastsData = roasts.map(r => {
            let roastDate;
            if (r.date && r.date.length === 10) {
                roastDate = r.date;
            } else {
                roastDate = new Date(r.date).toISOString().split('T')[0];
            }
            
            return {
                'Roast Date': roastDate,
                'Saved Date': r.timestamp ? new Date(r.timestamp).toLocaleDateString('en-GB') : new Date(r.date).toLocaleDateString('en-GB'),
                'Saved Time': r.timestamp ? new Date(r.timestamp).toLocaleTimeString('en-GB') : new Date(r.date).toLocaleTimeString('en-GB'),
                'Bean Name': r.beanName,
                'Env Temp (°C)': r.envTemp,
                'Charge Temp (°C)': r.chargeTemp,
                'Final Temp (°C)': r.finalTemp,
                'Green Weight (g)': r.greenWeight,
                'Roasted Weight (g)': r.roastedWeight,
                'Loss (%)': r.lossPercent,
                'TP Time': r.tpTime,
                'TP Temp (°C)': r.tpTemp,
                'Dry End Time': r.dryEndTime,
                'Dry End Temp (°C)': r.dryEndTemp,
                'Final-2 Time': r.final2Time,
                'Final-2 Temp (°C)': r.final2Temp,
                'Final-1 Time': r.final1Time,
                'Final-1 Temp (°C)': r.final1Temp,
                'Final Time': r.finalTime,
                'Final Temp Point (°C)': r.finalTempPoint,
                '1Cs Time': r.fcsTime,
                '1Cs Temp (°C)': r.fcsTemp,
                '1Ce Time': r.fceTime,
                '1Ce Temp (°C)': r.fceTemp,
                'Cooling Start Time': r.coolingStartTime,
                'Cooling Start Temp (°C)': r.coolingStartTemp,
                'Cooling TP Time': r.coolingTPTime,
                'Cooling TP Temp (°C)': r.coolingTPTemp,
                'Total Time (CS)': r.totalTimeCS || '',
                'Total Time (CTP)': r.totalTimeCTP || '',
                'Dev Time (CS)': r.devTimeCS || '',
                'Dev Time (CTP)': r.devTimeCTP || '',
                'DTR (CS) %': r.dtrCS || '',
                'DTR (CTP) %': r.dtrCTP || '',
                'Roast Plan': r.roastPlan || '',
                'Roast Notes': r.roastNotes || ''
            };
        });
        
        const wsRoasts = XLSX.utils.json_to_sheet(roastsData);
        XLSX.utils.book_append_sheet(wb, wsRoasts, 'Roasts');
    }
    
    // Sheet 2: Beans
    if (beans.length > 0) {
        const beansData = beans.map((bean, index) => ({
            'No.': index + 1,
            'Bean Name': bean
        }));
        
        const wsBeans = XLSX.utils.json_to_sheet(beansData);
        XLSX.utils.book_append_sheet(wb, wsBeans, 'Beans');
    }
    
    // Sheet 3: Blends
    if (blends.length > 0) {
        const blendsData = blends.map(blend => {
            const row = {
                'Blend Name': blend.name,
                'Description': blend.description || '',
                'Total Beans': blend.beans.length
            };
            
            // Add each bean as a column
            blend.beans.forEach((bean, index) => {
                row[`Bean ${index + 1} Name`] = bean.name;
                row[`Bean ${index + 1} %`] = bean.percentage;
            });
            
            return row;
        });
        
        const wsBlends = XLSX.utils.json_to_sheet(blendsData);
        XLSX.utils.book_append_sheet(wb, wsBlends, 'Blends');
    }
    
    const fileName = `coffee_backup_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
    
    alert(`✅ ייצוא הושלם בהצלחה!\n\n📊 קליות: ${roasts.length}\n☕ פולים: ${beans.length}\n🎨 תערובות: ${blends.length}`);
}

// Import roasts from Excel
function handleImportFile(event) {
    const file = event.target.files[0];
    
    if (!file) {
        return;
    }
    
    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        alert('❌ נא לבחור קובץ Excel (.xlsx או .xls)');
        event.target.value = ''; // Reset input
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            let importedRoasts = [];
            let importedBeans = [];
            let importedBlends = [];
            let roastsCount = 0, beansCount = 0, blendsCount = 0;
            
            // Import Sheet 1: Roasts
            if (workbook.SheetNames.includes('Roasts')) {
                const worksheet = workbook.Sheets['Roasts'];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                if (jsonData.length > 0) {
                    // Validate required columns
                    const firstRow = jsonData[0];
                    const requiredColumns = ['Roast Date', 'Bean Name', 'Green Weight (g)', 'Roasted Weight (g)'];
                    const missingColumns = requiredColumns.filter(col => !(col in firstRow));
                    
                    if (missingColumns.length > 0) {
                        alert(`❌ חסרות עמודות נדרשות ב-sheet Roasts:\n${missingColumns.join(', ')}\n\nנא להשתמש בקובץ שיוצא מהאפליקציה`);
                        event.target.value = '';
                        return;
                    }
                    
                    // Convert Excel data to roasts format
                    importedRoasts = jsonData.map((row, index) => {
                        // Parse date - handle both formats
                        let roastDate;
                        if (typeof row['Roast Date'] === 'number') {
                            // Excel date number
                            const excelDate = new Date((row['Roast Date'] - 25569) * 86400 * 1000);
                            roastDate = excelDate.toISOString().split('T')[0];
                        } else {
                            roastDate = row['Roast Date'];
                        }
                        
                        return {
                            id: Date.now() + index, // Generate unique IDs
                            timestamp: new Date().toISOString(),
                            date: roastDate,
                            beanName: row['Bean Name'] || '',
                            envTemp: row['Env Temp (°C)'] || '',
                            chargeTemp: row['Charge Temp (°C)'] || '',
                            finalTemp: row['Final Temp (°C)'] || '',
                            greenWeight: row['Green Weight (g)'] || '',
                            roastedWeight: row['Roasted Weight (g)'] || '',
                            lossPercent: row['Loss (%)'] || '',
                            tpTime: row['TP Time'] || '',
                            tpTemp: row['TP Temp (°C)'] || '',
                            dryEndTime: row['Dry End Time'] || '',
                            dryEndTemp: row['Dry End Temp (°C)'] || '',
                            final2Time: row['Final-2 Time'] || '',
                            final2Temp: row['Final-2 Temp (°C)'] || '',
                            final1Time: row['Final-1 Time'] || '',
                            final1Temp: row['Final-1 Temp (°C)'] || '',
                            finalTime: row['Final Time'] || '',
                            finalTempPoint: row['Final Temp Point (°C)'] || '',
                            fcsTime: row['1Cs Time'] || '',
                            fcsTemp: row['1Cs Temp (°C)'] || '',
                            fceTime: row['1Ce Time'] || '',
                            fceTemp: row['1Ce Temp (°C)'] || '',
                            coolingStartTime: row['Cooling Start Time'] || '',
                            coolingStartTemp: row['Cooling Start Temp (°C)'] || '',
                            coolingTPTime: row['Cooling TP Time'] || '',
                            coolingTPTemp: row['Cooling TP Temp (°C)'] || '',
                            roastPlan: row['Roast Plan'] || '',
                            roastNotes: row['Roast Notes'] || '',
                            // Calculated fields
                            totalTimeCS: row['Total Time (CS)'] || '',
                            totalTimeCTP: row['Total Time (CTP)'] || '',
                            devTimeCS: row['Dev Time (CS)'] || '',
                            devTimeCTP: row['Dev Time (CTP)'] || '',
                            dtrCS: row['DTR (CS) %'] || '',
                            dtrCTP: row['DTR (CTP) %'] || '',
                            turningPointTime: row['TP Time'] || '',
                            firstCrackTime: row['1Cs Time'] || '',
                            developmentTime: calculateDevelopmentTime(row['1Cs Time'], row['Cooling TP Time'])
                        };
                    });
                    
                    roastsCount = importedRoasts.length;
                }
            }
            
            // Import Sheet 2: Beans
            if (workbook.SheetNames.includes('Beans')) {
                const worksheet = workbook.Sheets['Beans'];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                if (jsonData.length > 0) {
                    importedBeans = jsonData.map(row => row['Bean Name']).filter(name => name && name.trim() !== '');
                    beansCount = importedBeans.length;
                }
            }
            
            // Import Sheet 3: Blends
            if (workbook.SheetNames.includes('Blends')) {
                const worksheet = workbook.Sheets['Blends'];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                if (jsonData.length > 0) {
                    importedBlends = jsonData.map((row, index) => {
                        const beans = [];
                        const totalBeans = row['Total Beans'] || 0;
                        
                        // Extract beans from columns
                        for (let i = 1; i <= totalBeans; i++) {
                            const beanName = row[`Bean ${i} Name`];
                            const beanPercentage = row[`Bean ${i} %`];
                            
                            if (beanName && beanPercentage) {
                                beans.push({
                                    name: beanName,
                                    percentage: parseFloat(beanPercentage)
                                });
                            }
                        }
                        
                        return {
                            id: Date.now() + index,
                            name: row['Blend Name'] || '',
                            description: row['Description'] || '',
                            beans: beans
                        };
                    }).filter(blend => blend.name && blend.beans.length > 0);
                    
                    blendsCount = importedBlends.length;
                }
            }
            
            // Check if any data was found
            if (roastsCount === 0 && beansCount === 0 && blendsCount === 0) {
                alert('❌ לא נמצאו נתונים תקינים בקובץ');
                event.target.value = '';
                return;
            }
            
            // Show confirmation
            const confirmMessage = 
                `נמצאו בקובץ:\n` +
                `📊 קליות: ${roastsCount}\n` +
                `☕ פולים: ${beansCount}\n` +
                `🎨 תערובות: ${blendsCount}\n\n` +
                `האם לייבא?\n\n` +
                `⚠️ כל הנתונים הקיימים יימחקו`;
            
            const confirmed = confirm(confirmMessage);
            
            if (!confirmed) {
                event.target.value = '';
                return;
            }
            
            // Save to storage (replaces existing data)
            let success = true;
            
            if (roastsCount > 0) {
                success = success && Storage.set('roasts', importedRoasts);
            }
            
            if (beansCount > 0) {
                success = success && saveBeansList(importedBeans);
            }
            
            if (blendsCount > 0) {
                success = success && Storage.set('blends', importedBlends);
            }
            
            if (success) {
                alert(
                    `✅ הייבוא הושלם בהצלחה!\n\n` +
                    `📊 קליות: ${roastsCount}\n` +
                    `☕ פולים: ${beansCount}\n` +
                    `🎨 תערובות: ${blendsCount}`
                );
                
                // Refresh UI
                updateBeansDatalist();
                populateBeanFilter();
                loadRoastHistory();
                populateBlendFilter();
                loadBlends();
                populateCalcBlendSelect();
            } else {
                alert('❌ שגיאה בשמירת הנתונים');
            }
            
        } catch (error) {
            console.error('Import error:', error);
            alert(`❌ שגיאה בקריאת הקובץ:\n${error.message}\n\nנא לוודא שהקובץ תקין`);
        }
        
        // Reset file input
        event.target.value = '';
    };
    
    reader.onerror = function() {
        alert('❌ שגיאה בקריאת הקובץ');
        event.target.value = '';
    };
    
    
    reader.readAsArrayBuffer(file);
}

// Helper function to calculate development time
function calculateDevelopmentTime(firstCrackTime, coolingTPTime) {
    if (!firstCrackTime || !coolingTPTime) return '';
    
    try {
        const fc = parseTimeToSeconds(firstCrackTime);
        const cooling = parseTimeToSeconds(coolingTPTime);
        const devSeconds = cooling - fc;
        
        if (devSeconds < 0) return '';
        
        const minutes = Math.floor(devSeconds / 60);
        const seconds = devSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    } catch {
        return '';
    }
}

// Helper to parse time string to seconds
function parseTimeToSeconds(timeStr) {
    const parts = timeStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

// ==================== UI FUNCTIONS ====================

// Set today's date
function setTodayDate() {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('roastDate').value = today;
}

// Switch tabs
function switchTab(tab) {
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    
    if (tab === 'new') {
        tabs[0].classList.add('active');
        document.getElementById('newRoastTab').classList.add('active');
        // Update UI based on edit mode
        updateEditModeUI();
    } else if (tab === 'history') {
        tabs[1].classList.add('active');
        document.getElementById('historyTab').classList.add('active');
        populateBeanFilter(); // Populate filter dropdown
        loadRoastHistory();
    } else if (tab === 'blends') {
        tabs[2].classList.add('active');
        document.getElementById('blendsTab').classList.add('active');
        populateBlendFilter(); // Populate filter dropdown
        loadBlendsList();
    } else if (tab === 'calculator') {
        tabs[3].classList.add('active');
        document.getElementById('calculatorTab').classList.add('active');
        populateCalcBlendSelect(); // Populate blend dropdown
    }
}

// ==================== EVENT LISTENERS ====================

// Setup all event listeners
function setupEventListeners() {
    // Weight calculations
    document.getElementById('greenWeight').addEventListener('input', calculateLoss);
    document.getElementById('roastedWeight').addEventListener('input', calculateLoss);
    
    // Temperature sync
    document.getElementById('finalTemp').addEventListener('input', syncFinalTemp);
    
    // Time calculations
    document.getElementById('finalTime').addEventListener('input', function() {
        calculateCoolingStartTime();
        calculateMetrics();
    });
    document.getElementById('coolingTPTime').addEventListener('input', calculateMetrics);
    document.getElementById('coolingStartTime').addEventListener('input', calculateMetrics);
    document.getElementById('fcsTime').addEventListener('input', calculateMetrics);
    
    // Bean manager Enter key
    document.getElementById('newBeanInput').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addBean();
        }
    });
    
    // Modal close on click outside
    document.getElementById('beanManagerModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeBeanManager();
        }
    });
    
    // Modal close on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeBeanManager();
        }
    });
}

// ==================== TIME PICKER ====================

let currentTimeInput = null;

// Initialize time picker
function initTimePicker() {
    const minutesWheel = document.getElementById('minutesWheel');
    const secondsWheel = document.getElementById('secondsWheel');
    
    // Add padding items for proper centering
    const paddingCount = 4;
    
    // Create minutes wheel (0-30)
    for (let i = 0; i < paddingCount; i++) {
        minutesWheel.innerHTML += '<div class="time-picker-item">&nbsp;</div>';
    }
    for (let i = 0; i <= 30; i++) {
        const item = document.createElement('div');
        item.className = 'time-picker-item';
        item.textContent = i.toString().padStart(2, '0');
        item.dataset.value = i;
        minutesWheel.appendChild(item);
    }
    for (let i = 0; i < paddingCount; i++) {
        minutesWheel.innerHTML += '<div class="time-picker-item">&nbsp;</div>';
    }
    
    // Create seconds wheel (0-59) with CIRCULAR SCROLLING
    // Add more duplicates for smoother wrap-around effect
    for (let i = 30; i <= 59; i++) {
        const item = document.createElement('div');
        item.className = 'time-picker-item time-picker-duplicate';
        item.textContent = i.toString().padStart(2, '0');
        item.dataset.value = i;
        secondsWheel.appendChild(item);
    }
    
    // Main seconds (0-59)
    for (let i = 0; i <= 59; i++) {
        const item = document.createElement('div');
        item.className = 'time-picker-item';
        item.textContent = i.toString().padStart(2, '0');
        item.dataset.value = i;
        secondsWheel.appendChild(item);
    }
    
    // Add more duplicates at the end for smoother wrap-around
    for (let i = 0; i <= 29; i++) {
        const item = document.createElement('div');
        item.className = 'time-picker-item time-picker-duplicate';
        item.textContent = i.toString().padStart(2, '0');
        item.dataset.value = i;
        secondsWheel.appendChild(item);
    }
    
    // Setup scroll handlers
    setupWheelScrollHandler(minutesWheel); // Minutes
    setupWheelScrollHandler(secondsWheel); // Seconds
}

// Setup wheel scroll handler
function setupWheelScrollHandler(wheel, isCircular = false) {
    let scrollTimeout;
    let isScrolling = false;
    
    wheel.addEventListener('scroll', () => {
        // Add scrolling class to disable snap (for maximum inertia)
        if (!isScrolling) {
            wheel.classList.add('scrolling');
            isScrolling = true;
        }
        
        // Update visual feedback immediately while scrolling
        updateSelectedItems();
        
        clearTimeout(scrollTimeout);
        
        // Wait much longer before re-enabling snap
        // This allows the native momentum scrolling to work freely
        scrollTimeout = setTimeout(() => {
            // Remove scrolling class to re-enable snap
            wheel.classList.remove('scrolling');
            isScrolling = false;
            updateSelectedItems();
        }, 1200); // Much longer timeout for maximum momentum
    }, { passive: true }); // Passive for better performance
}

// Snap wheel to nearest item
function snapToCenter(wheel) {
    const items = Array.from(wheel.querySelectorAll('.time-picker-item[data-value]'));
    const wheelRect = wheel.getBoundingClientRect();
    const wheelCenter = wheelRect.top + wheelRect.height / 2;
    
    let closestItem = items[0];
    let closestDistance = Infinity;
    
    items.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        const itemCenter = itemRect.top + itemRect.height / 2;
        const distance = Math.abs(wheelCenter - itemCenter);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestItem = item;
        }
    });
    
    if (closestItem) {
        closestItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Update selected items visual state
// Track last selected values for haptic feedback
const lastSelectedValues = {
    minutesWheel: null,
    secondsWheel: null
};

// Audio context for click sounds (create once)
let audioContext = null;

// Initialize audio context on first use
function getAudioContext() {
    if (!audioContext) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Audio not supported');
        }
    }
    return audioContext;
}

// Create click sound using Web Audio API
function playClickSound() {
    try {
        const context = getAudioContext();
        if (!context) return;
        
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        // Short, crisp click sound
        oscillator.frequency.value = 800; // Higher frequency for click
        oscillator.type = 'sine';
        
        // Very short duration for click effect
        gainNode.gain.setValueAtTime(0.3, context.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 0.02);
        
        oscillator.start(context.currentTime);
        oscillator.stop(context.currentTime + 0.02);
    } catch (e) {
        // Silently fail if audio error
    }
}

// Vibrate for haptic feedback (mobile devices)
function playHapticFeedback() {
    try {
        if (navigator.vibrate) {
            navigator.vibrate(10); // Very short vibration
        }
    } catch (e) {
        // Vibration might not be supported
    }
}

function updateSelectedItems() {
    const minutesWheel = document.getElementById('minutesWheel');
    const secondsWheel = document.getElementById('secondsWheel');
    
    updateWheelSelection(minutesWheel);
    updateWheelSelection(secondsWheel);
}

// Update single wheel selection
function updateWheelSelection(wheel) {
    const items = Array.from(wheel.querySelectorAll('.time-picker-item'));
    const wheelRect = wheel.getBoundingClientRect();
    const wheelCenter = wheelRect.top + wheelRect.height / 2;
    
    let centerItem = null;
    let centerValue = null;
    
    items.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        const itemCenter = itemRect.top + itemRect.height / 2;
        const distance = Math.abs(wheelCenter - itemCenter);
        
        // Remove all classes first
        item.classList.remove('selected', 'near-center');
        
        // Center item (within 20px)
        if (distance < 20) {
            item.classList.add('selected');
            // Track the item in center
            if (item.dataset.value && distance < 10) {
                centerItem = item;
                centerValue = item.dataset.value;
            }
        } 
        // Near center items (20-60px) - for smooth gradient
        else if (distance < 60) {
            item.classList.add('near-center');
        }
    });
    
    // Play click sound and haptic when value changes
    if (centerValue !== null) {
        const wheelId = wheel.id;
        if (lastSelectedValues[wheelId] !== centerValue) {
            lastSelectedValues[wheelId] = centerValue;
            playClickSound();
            playHapticFeedback();
        }
    }
}

// Get selected value from wheel
function getWheelValue(wheel) {
    const items = Array.from(wheel.querySelectorAll('.time-picker-item[data-value]'));
    const wheelRect = wheel.getBoundingClientRect();
    const wheelCenter = wheelRect.top + wheelRect.height / 2;
    
    let closestItem = items[0];
    let closestDistance = Infinity;
    
    items.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        const itemCenter = itemRect.top + itemRect.height / 2;
        const distance = Math.abs(wheelCenter - itemCenter);
        
        if (distance < closestDistance) {
            closestDistance = distance;
            closestItem = item;
        }
    });
    
    return closestItem ? parseInt(closestItem.dataset.value) : 0;
}

// Set wheel to specific value
function setWheelValue(wheel, value) {
    const items = Array.from(wheel.querySelectorAll('.time-picker-item[data-value]'));
    const targetItem = items.find(item => parseInt(item.dataset.value) === value);
    
    if (targetItem) {
        targetItem.scrollIntoView({ behavior: 'auto', block: 'center' });
        setTimeout(() => updateSelectedItems(), 100);
    }
}

// Open time picker
function openTimePicker(inputElement) {
    currentTimeInput = inputElement;
    const overlay = document.getElementById('timePickerOverlay');
    const minutesWheel = document.getElementById('minutesWheel');
    const secondsWheel = document.getElementById('secondsWheel');
    
    // Reset haptic feedback tracking
    lastSelectedValues.minutesWheel = null;
    lastSelectedValues.secondsWheel = null;
    
    // Parse current value or get smart default
    let currentValue = inputElement.value;
    
    // If field is empty, use smart default based on previous time field
    if (!currentValue) {
        currentValue = getSmartDefaultTime(inputElement.id);
    }
    
    const [minutes, seconds] = currentValue.split(':').map(v => parseInt(v) || 0);
    
    // Show overlay
    overlay.classList.add('show');
    
    // Set initial values
    setTimeout(() => {
        setWheelValue(minutesWheel, minutes);
        setWheelValue(secondsWheel, seconds);
    }, 100);
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
}

// Get smart default time based on previous time field
function getSmartDefaultTime(fieldId) {
    // Define the sequence of time fields
    const timeSequence = {
        'tpTime': null, // First field, starts at 00:00
        'dryEndTime': 'tpTime',
        'final2Time': 'dryEndTime',
        'final1Time': 'final2Time',
        'finalTime': 'final1Time',
        'fcsTime': 'finalTime',
        'fceTime': 'fcsTime',
        'coolingTPTime': 'fceTime'
    };
    
    const previousFieldId = timeSequence[fieldId];
    
    // If no previous field, start at 00:00
    if (!previousFieldId) {
        return '00:00';
    }
    
    // Get value from previous field
    const previousField = document.getElementById(previousFieldId);
    const previousValue = previousField ? previousField.value : '';
    
    // If previous field has value, use it as starting point
    if (previousValue && previousValue.match(/^\d{2}:\d{2}$/)) {
        return previousValue;
    }
    
    // Otherwise start at 00:00
    return '00:00';
}

// Close time picker
function closeTimePicker() {
    const overlay = document.getElementById('timePickerOverlay');
    overlay.classList.remove('show');
    currentTimeInput = null;
    
    // Restore body scroll
    document.body.style.overflow = '';
}

// Confirm time selection
function confirmTimePicker() {
    if (!currentTimeInput) return;
    
    const minutesWheel = document.getElementById('minutesWheel');
    const secondsWheel = document.getElementById('secondsWheel');
    
    const minutes = getWheelValue(minutesWheel);
    const seconds = getWheelValue(secondsWheel);
    
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    currentTimeInput.value = timeString;
    
    // Trigger change event for calculations
    const event = new Event('input', { bubbles: true });
    currentTimeInput.dispatchEvent(event);
    
    closeTimePicker();
}

// Setup time input click handlers
function setupTimeInputClickHandlers() {
    const timeInputs = document.querySelectorAll('.time-input:not([readonly])');
    
    timeInputs.forEach(input => {
        input.addEventListener('click', (e) => {
            e.preventDefault();
            openTimePicker(input);
        });
        
        // Prevent keyboard from showing
        input.addEventListener('focus', (e) => {
            e.target.blur();
            openTimePicker(input);
        });
    });
}

// ==================== BLENDS MANAGEMENT ====================

// Global state for blend editing
let editingBlendId = null;

// Load blends from storage
function loadBlends() {
    return Storage.get('blends', []);
}

// Save blends to storage
function saveBlends(blends) {
    return Storage.set('blends', blends);
}

// Open blend modal (for new or edit)
function openBlendModal(blendId = null) {
    const modal = document.getElementById('blendModal');
    const title = document.getElementById('blendModalTitle');
    
    if (blendId) {
        // Edit mode
        editingBlendId = blendId;
        title.textContent = '✏️ ערוך תערובת';
        loadBlendForEdit(blendId);
    } else {
        // New blend mode
        editingBlendId = null;
        title.textContent = '➕ תערובת חדשה';
        document.getElementById('blendName').value = '';
        document.getElementById('blendDescription').value = '';
        document.getElementById('blendBeanCount').value = '3';
    }
    
    updateBlendBeanFields();
    modal.classList.add('active');
}

// Close blend modal
function closeBlendModal() {
    const modal = document.getElementById('blendModal');
    modal.classList.remove('active');
    editingBlendId = null;
    
    // Clear form
    document.getElementById('blendName').value = '';
    document.getElementById('blendDescription').value = '';
    document.getElementById('blendBeanCount').value = '3';
    updateBlendBeanFields();
}

// Update bean fields based on count
function updateBlendBeanFields() {
    const count = parseInt(document.getElementById('blendBeanCount').value);
    const container = document.getElementById('blendBeansContainer');
    const beans = loadBeansList();
    
    container.innerHTML = '';
    
    for (let i = 0; i < count; i++) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'blend-bean-field';
        fieldDiv.innerHTML = `
            <div class="blend-bean-field-title">── פול ${i + 1} ──</div>
            <div class="form-group">
                <label>בחר פול</label>
                <select id="blendBean${i}" class="blend-bean-select" style="width: 100%;">
                    <option value="">-- בחר פול --</option>
                    ${beans.map(bean => `<option value="${escapeHtml(bean)}">${escapeHtml(bean)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>אחוז מהתערובת</label>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="number" id="blendPercentage${i}" class="blend-percentage-input" 
                           min="0" max="100" step="1" value="0" 
                           oninput="updateTotalPercentage()">
                    <span style="font-size: 20px; font-weight: 600;">%</span>
                </div>
            </div>
        `;
        container.appendChild(fieldDiv);
    }
    
    updateTotalPercentage();
}

// Update total percentage and validation
function updateTotalPercentage() {
    const count = parseInt(document.getElementById('blendBeanCount').value);
    let total = 0;
    
    for (let i = 0; i < count; i++) {
        const percentInput = document.getElementById(`blendPercentage${i}`);
        if (percentInput) {
            total += parseFloat(percentInput.value) || 0;
        }
    }
    
    const totalDisplay = document.getElementById('totalPercentage');
    const totalContainer = document.getElementById('blendPercentageTotal');
    const saveBtn = document.getElementById('saveBlendBtn');
    
    totalDisplay.textContent = total.toFixed(0);
    
    // Update styling based on validity
    totalContainer.classList.remove('valid', 'invalid');
    
    if (total === 100) {
        totalContainer.classList.add('valid');
        saveBtn.disabled = false;
        saveBtn.style.opacity = '1';
        saveBtn.style.cursor = 'pointer';
    } else {
        totalContainer.classList.add('invalid');
        saveBtn.disabled = true;
        saveBtn.style.opacity = '0.5';
        saveBtn.style.cursor = 'not-allowed';
        
        // Add warning message
        if (total < 100) {
            totalDisplay.textContent += ` ⚠️ חסרים ${(100 - total).toFixed(0)}%`;
        } else {
            totalDisplay.textContent += ` ⚠️ עודף ${(total - 100).toFixed(0)}%`;
        }
    }
}

// Save blend
function saveBlend() {
    const name = document.getElementById('blendName').value.trim();
    const description = document.getElementById('blendDescription').value.trim();
    const count = parseInt(document.getElementById('blendBeanCount').value);
    
    // Validate name
    if (!name) {
        alert('❌ נא להזין שם לתערובת');
        return;
    }
    
    // Collect components
    const components = [];
    let totalPercentage = 0;
    
    for (let i = 0; i < count; i++) {
        const beanSelect = document.getElementById(`blendBean${i}`);
        const percentageInput = document.getElementById(`blendPercentage${i}`);
        
        const bean = beanSelect.value;
        const percentage = parseFloat(percentageInput.value) || 0;
        
        if (bean && percentage > 0) {
            components.push({
                bean: bean,
                percentage: percentage
            });
            totalPercentage += percentage;
        }
    }
    
    // Validate components
    if (components.length === 0) {
        alert('❌ נא לבחור לפחות פול אחד');
        return;
    }
    
    // Validate total percentage
    if (totalPercentage !== 100) {
        alert(`❌ סכום האחוזים חייב להיות 100%\nכרגע: ${totalPercentage}%`);
        return;
    }
    
    // Create blend object
    const blend = {
        name: name,
        description: description,
        components: components,
        timestamp: new Date().toISOString()
    };
    
    const blends = loadBlends();
    
    if (editingBlendId) {
        // Update existing blend
        const index = blends.findIndex(b => b.id === editingBlendId);
        if (index !== -1) {
            blend.id = editingBlendId;
            blend.createdAt = blends[index].createdAt;
            blends[index] = blend;
            
            if (saveBlends(blends)) {
                // Add blend name to beans list if it's a new name
                const beans = loadBeansList();
                if (!beans.includes(name)) {
                    beans.push(name);
                    saveBeansList(beans);
                    updateBeansDatalist(); // Refresh the dropdown
                }
                
                alert('✅ התערובת עודכנה בהצלחה!');
                closeBlendModal();
                populateBlendFilter();
                populateCalcBlendSelect();
                loadBlendsList();
            }
        }
    } else {
        // Create new blend
        blend.id = Date.now();
        blend.createdAt = blend.timestamp;
        blends.push(blend);
        
        if (saveBlends(blends)) {
            // Add blend name to beans list automatically
            const beans = loadBeansList();
            if (!beans.includes(name)) {
                beans.push(name);
                saveBeansList(beans);
                updateBeansDatalist(); // Refresh the dropdown
            }
            
            alert('✅ התערובת נשמרה בהצלחה!');
            closeBlendModal();
            populateBlendFilter();
            populateCalcBlendSelect();
            loadBlendsList();
        }
    }
}

// Load blend for editing
function loadBlendForEdit(id) {
    const blends = loadBlends();
    const blend = blends.find(b => b.id === id);
    
    if (!blend) {
        alert('❌ תערובת לא נמצאה');
        return;
    }
    
    document.getElementById('blendName').value = blend.name;
    document.getElementById('blendDescription').value = blend.description || '';
    document.getElementById('blendBeanCount').value = blend.components.length;
    
    updateBlendBeanFields();
    
    // Wait for fields to be created, then fill them
    setTimeout(() => {
        blend.components.forEach((component, index) => {
            const beanSelect = document.getElementById(`blendBean${index}`);
            const percentageInput = document.getElementById(`blendPercentage${index}`);
            
            if (beanSelect) beanSelect.value = component.bean;
            if (percentageInput) percentageInput.value = component.percentage;
        });
        
        updateTotalPercentage();
    }, 100);
}

// Duplicate blend
function duplicateBlend(id) {
    const blends = loadBlends();
    const blend = blends.find(b => b.id === id);
    
    if (!blend) {
        alert('❌ תערובת לא נמצאה');
        return;
    }
    
    const newBlend = {
        ...blend,
        id: Date.now(),
        name: blend.name + ' (עותק)',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };
    
    blends.push(newBlend);
    
    if (saveBlends(blends)) {
        alert('✅ התערובת שוכפלה בהצלחה!');
        populateBlendFilter();
        populateCalcBlendSelect();
        loadBlendsList();
    }
}

// Delete blend
function deleteBlend(id) {
    if (!confirm('האם אתה בטוח שברצונך למחוק תערובת זו?')) {
        return;
    }
    
    let blends = loadBlends();
    blends = blends.filter(b => b.id !== id);
    
    if (saveBlends(blends)) {
        alert('✅ התערובת נמחקה');
        populateBlendFilter();
        populateCalcBlendSelect();
        const filterSelect = document.getElementById('blendFilter');
        const currentFilter = filterSelect ? filterSelect.value : '';
        loadBlendsList(currentFilter || null);
    }
}

// Load and display blends list with optional filter
function loadBlendsList(filterName = null) {
    const blends = loadBlends();
    const container = document.getElementById('blendsList');
    
    if (blends.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">אין תערובות שמורות עדיין<br>לחץ על "תערובת חדשה" ליצירת התערובת הראשונה! ☕</p>';
        updateBlendFilterInfo(0, 0);
        return;
    }
    
    // Sort by newest first
    let sortedBlends = [...blends].reverse();
    
    // Apply filter if specified
    if (filterName) {
        sortedBlends = sortedBlends.filter(b => b.name === filterName);
    }
    
    // Update filter info
    updateBlendFilterInfo(sortedBlends.length, blends.length);
    
    if (sortedBlends.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; padding:40px;">לא נמצאו תערובות מסוג זה</p>';
        return;
    }
    
    container.innerHTML = sortedBlends.map(blend => {
        const componentsHtml = blend.components
            .map(c => `<div class="blend-component">${escapeHtml(c.bean)} ${c.percentage}%</div>`)
            .join('');
        
        return `
            <div class="blend-item">
                <div class="blend-header">
                    <div>
                        <div class="blend-name">${escapeHtml(blend.name)}</div>
                        ${blend.description ? `<div class="blend-description">${escapeHtml(blend.description)}</div>` : ''}
                    </div>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button class="delete-btn" style="background: #8B6F47;" onclick="duplicateBlend(${blend.id})" title="שכפל תערובת">🔄</button>
                        <button class="delete-btn" style="background: #D4A574;" onclick="openBlendModal(${blend.id})" title="ערוך תערובת">✏️</button>
                        <button class="delete-btn" onclick="deleteBlend(${blend.id})" title="מחק תערובת">🗑️</button>
                    </div>
                </div>
                <div class="blend-composition">
                    ${componentsHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Populate blend filter dropdown with unique blend names
function populateBlendFilter() {
    const blends = loadBlends();
    const filterSelect = document.getElementById('blendFilter');
    
    if (!filterSelect) return;
    
    // Get unique blend names (sorted alphabetically)
    const uniqueNames = [...new Set(blends.map(b => b.name))].sort();
    
    // Clear existing options except "All"
    filterSelect.innerHTML = '<option value="">כל התערובות</option>';
    
    // Add blend options
    uniqueNames.forEach(name => {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        filterSelect.appendChild(option);
    });
}

// Filter blends by selected name
function filterBlendsByName() {
    const filterSelect = document.getElementById('blendFilter');
    const selectedName = filterSelect.value;
    
    if (selectedName) {
        loadBlendsList(selectedName);
    } else {
        loadBlendsList();
    }
}

// Reset blend filter
function resetBlendFilter() {
    const filterSelect = document.getElementById('blendFilter');
    if (filterSelect) {
        filterSelect.value = '';
        loadBlendsList();
    }
}

// Update blend filter info display
function updateBlendFilterInfo(showing, total) {
    const infoElement = document.getElementById('blendFilterInfo');
    if (!infoElement) return;
    
    if (showing === total) {
        infoElement.textContent = `מציג ${total} תערובות`;
        infoElement.classList.remove('active');
    } else {
        infoElement.textContent = `מציג ${showing} מתוך ${total} תערובות`;
        infoElement.classList.add('active');
    }
}

// ==================== CALCULATOR ====================

// Populate calculator blend dropdown
function populateCalcBlendSelect() {
    const blends = loadBlends();
    const select = document.getElementById('calcBlendSelect');
    
    if (!select) return;
    
    // Clear existing options except first
    select.innerHTML = '<option value="">-- בחר תערובת --</option>';
    
    // Add blend options (sorted alphabetically)
    const sortedBlends = [...blends].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedBlends.forEach(blend => {
        const option = document.createElement('option');
        option.value = blend.id;
        option.textContent = blend.name;
        select.appendChild(option);
    });
}

// Update blend info display when selection changes
function updateCalcBlendInfo() {
    const select = document.getElementById('calcBlendSelect');
    const blendId = parseInt(select.value);
    const infoDiv = document.getElementById('calcBlendInfo');
    const resultsDiv = document.getElementById('calcResults');
    
    // Hide results when changing blend
    resultsDiv.style.display = 'none';
    
    if (!blendId) {
        infoDiv.style.display = 'none';
        return;
    }
    
    const blends = loadBlends();
    const blend = blends.find(b => b.id === blendId);
    
    if (!blend) {
        infoDiv.style.display = 'none';
        return;
    }
    
    // Show blend info
    infoDiv.style.display = 'block';
    
    // Update blend name
    document.getElementById('calcBlendName').textContent = blend.name;
    
    // Update components
    const componentsDiv = document.getElementById('calcBlendComponents');
    componentsDiv.innerHTML = blend.components
        .map(c => `<div class="blend-component">${escapeHtml(c.bean)} ${c.percentage}%</div>`)
        .join('');
    
    // Update description
    const descDiv = document.getElementById('calcBlendDescription');
    descDiv.textContent = blend.description || '';
    descDiv.style.display = blend.description ? 'block' : 'none';
}

// Calculate amounts for selected blend
function calculateAmounts() {
    const select = document.getElementById('calcBlendSelect');
    const blendId = parseInt(select.value);
    const totalWeight = parseFloat(document.getElementById('calcTotalWeight').value);
    
    // Validate inputs
    if (!blendId) {
        alert('❌ נא לבחור תערובת');
        return;
    }
    
    if (!totalWeight || totalWeight <= 0) {
        alert('❌ נא להזין משקל כולל תקין');
        return;
    }
    
    // Get blend
    const blends = loadBlends();
    const blend = blends.find(b => b.id === blendId);
    
    if (!blend) {
        alert('❌ תערובת לא נמצאה');
        return;
    }
    
    // Calculate amounts
    const results = blend.components.map(component => {
        const amount = Math.round(totalWeight * component.percentage / 100);
        return {
            bean: component.bean,
            percentage: component.percentage,
            amount: amount
        };
    });
    
    // Calculate total (for verification)
    const calculatedTotal = results.reduce((sum, r) => sum + r.amount, 0);
    
    // Display results
    displayCalculationResults(results, calculatedTotal, totalWeight, blend.name);
}

// Display calculation results
function displayCalculationResults(results, calculatedTotal, requestedTotal, blendName) {
    const resultsDiv = document.getElementById('calcResults');
    const resultsList = document.getElementById('calcResultsList');
    
    // Build results HTML
    const resultsHtml = results.map(result => `
        <div class="calc-result-item">
            <div class="calc-result-bean">
                <div class="calc-result-bean-name">${escapeHtml(result.bean)}</div>
                <div class="calc-result-bean-percentage">${result.percentage}% מהתערובת</div>
            </div>
            <div class="calc-result-weight">${result.amount} גרם</div>
        </div>
    `).join('');
    
    // Add total
    const totalClass = calculatedTotal === requestedTotal ? 'calc-result-total' : 'calc-result-total';
    const totalHtml = `
        <div class="${totalClass}">
            סה"כ: ${calculatedTotal} גרם
            ${calculatedTotal !== requestedTotal ? ` (מבוקש: ${requestedTotal}g)` : ''}
            ✅
        </div>
    `;
    
    resultsList.innerHTML = resultsHtml + totalHtml;
    
    // Show results with animation
    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ==================== INITIALIZATION ====================

// Initialize app on page load
document.addEventListener('DOMContentLoaded', function() {
    // Setup time input validation
    setupTimeInputs();
    
    // Setup event listeners
    setupEventListeners();
    
    // Initialize beans list
    updateBeansDatalist();
    
    // Set today's date
    setTodayDate();
    
    // Load history
    loadRoastHistory();
    
    // Populate bean filter
    populateBeanFilter();
    
    // Initialize time picker
    initTimePicker();
    setupTimeInputClickHandlers();
    
    // Initialize blends list and filter
    populateBlendFilter();
    loadBlendsList();
    
    // Initialize calculator
    populateCalcBlendSelect();
    
    console.log('☕ Coffee Roaster Tracker initialized successfully!');
});
