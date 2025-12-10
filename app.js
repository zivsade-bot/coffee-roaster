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
    
    // Development Time (CS) = Cooling Start - 1Cs
    if (coolingStartTime > 0 && fcsTime > 0 && fcsTime < coolingStartTime) {
        const devTimeCS = coolingStartTime - fcsTime;
        document.getElementById('devTimeCS').textContent = secondsToTime(devTimeCS);
    } else {
        document.getElementById('devTimeCS').textContent = '-';
    }
    
    // Development Time (CTP) = Cooling TP - 1Cs
    if (coolingTPTime > 0 && fcsTime > 0 && fcsTime < coolingTPTime) {
        const devTimeCTP = coolingTPTime - fcsTime;
        document.getElementById('devTimeCTP').textContent = secondsToTime(devTimeCTP);
        
        // DTR based on CTP
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
        roastNotes: document.getElementById('roastNotes').value
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
        saveBtn.style.background = 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)';
        
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
            indicator.style.color = '#4CAF50';
            indicator.style.fontSize = '14px';
            heading.appendChild(indicator);
        }
    } else {
        // New roast mode
        saveBtn.textContent = '💾 שמור קלייה';
        saveBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        
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

    // Create a copy and reverse it to show newest first (FIXED)
    let sortedRoasts = [...roasts].reverse();
    
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
        let displayDate;
        if (roast.date && roast.date.length === 10) {
            displayDate = new Date(roast.date + 'T00:00:00').toLocaleDateString('en-GB');
        } else {
            displayDate = new Date(roast.date).toLocaleDateString('en-GB');
        }
        
        const saveTime = roast.timestamp ? 
            new Date(roast.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
        
        let detailsHtml = `
            Weight: ${escapeHtml(roast.greenWeight)}g → ${escapeHtml(roast.roastedWeight)}g (${escapeHtml(roast.lossPercent)}%)<br>
            Total time: ${escapeHtml(roast.coolingTPTime) || '-'}<br>
            Final temp: ${escapeHtml(roast.finalTemp)}°C
        `;
        
        if (roast.roastPlan) {
            detailsHtml += `<br><br><strong>תכנון:</strong><br><div style="direction: rtl; white-space: pre-wrap;">${escapeHtml(roast.roastPlan)}</div>`;
        }
        
        if (roast.roastNotes) {
            detailsHtml += `<br><strong>הערות:</strong><br><div style="direction: rtl; white-space: pre-wrap;">${escapeHtml(roast.roastNotes)}</div>`;
        }
        
        return `
            <div class="roast-item">
                <div class="roast-header">
                    <div>
                        <div class="roast-name">${escapeHtml(roast.beanName)}</div>
                        <div class="roast-date">${displayDate}${saveTime ? ' • Saved ' + saveTime : ''}</div>
                    </div>
                    <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                        <button class="delete-btn" style="background: #2196F3;" onclick="duplicateRoast(${roast.id})" title="שכפל קלייה">🔄</button>
                        <button class="delete-btn" style="background: #4CAF50;" onclick="loadRoastForEdit(${roast.id})" title="ערוך קלייה">✏️</button>
                        <button class="delete-btn" onclick="deleteRoast(${roast.id})" title="מחק קלייה">🗑️</button>
                    </div>
                </div>
                <div class="roast-details">
                    ${detailsHtml}
                </div>
            </div>
        `;
    }).join('');
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
    
    if (roasts.length === 0) {
        alert('No data to export');
        return;
    }

    const data = roasts.map(r => {
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
            'Roast Plan': r.roastPlan || '',
            'Roast Notes': r.roastNotes || ''
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Roasts');
    
    const fileName = `coffee_roasts_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
    } else {
        tabs[1].classList.add('active');
        document.getElementById('historyTab').classList.add('active');
        loadRoastHistory();
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
    
    // Create seconds wheel (0-59)
    for (let i = 0; i < paddingCount; i++) {
        secondsWheel.innerHTML += '<div class="time-picker-item">&nbsp;</div>';
    }
    for (let i = 0; i <= 59; i++) {
        const item = document.createElement('div');
        item.className = 'time-picker-item';
        item.textContent = i.toString().padStart(2, '0');
        item.dataset.value = i;
        secondsWheel.appendChild(item);
    }
    for (let i = 0; i < paddingCount; i++) {
        secondsWheel.innerHTML += '<div class="time-picker-item">&nbsp;</div>';
    }
    
    // Setup scroll handlers
    setupWheelScrollHandler(minutesWheel);
    setupWheelScrollHandler(secondsWheel);
}

// Setup wheel scroll handler
function setupWheelScrollHandler(wheel) {
    let scrollTimeout;
    
    wheel.addEventListener('scroll', () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            snapToCenter(wheel);
            updateSelectedItems();
        }, 50);
    });
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
    
    items.forEach(item => {
        const itemRect = item.getBoundingClientRect();
        const itemCenter = itemRect.top + itemRect.height / 2;
        const distance = Math.abs(wheelCenter - itemCenter);
        
        if (distance < 20) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
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
    
    console.log('☕ Coffee Roaster Tracker initialized successfully!');
});
