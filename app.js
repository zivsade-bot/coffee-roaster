// Coffee Roaster Tracker - Main JavaScript
// Version 2.0 - Capacitor Ready

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

    const roast = {
        id: Date.now(),
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
    roasts.push(roast);
    
    if (Storage.set('roasts', roasts)) {
        alert('✅ Roast saved successfully!');
        clearForm();
        switchTab('history');
        loadRoastHistory();
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
}

// Load roast history (FIXED - no array mutation)
function loadRoastHistory() {
    const roasts = Storage.get('roasts', []);
    const listContainer = document.getElementById('roastList');
    
    if (roasts.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#999; padding:20px;">No saved roasts</p>';
        return;
    }

    // Create a copy and reverse it to show newest first (FIXED)
    const sortedRoasts = [...roasts].reverse();
    
    listContainer.innerHTML = sortedRoasts.map(roast => {
        let displayDate;
        if (roast.date && roast.date.length === 10) {
            displayDate = new Date(roast.date + 'T00:00:00').toLocaleDateString('en-US');
        } else {
            displayDate = new Date(roast.date).toLocaleDateString('en-US');
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
                    <button class="delete-btn" onclick="deleteRoast(${roast.id})">Delete</button>
                </div>
                <div class="roast-details">
                    ${detailsHtml}
                </div>
            </div>
        `;
    }).join('');
}

// Delete roast
function deleteRoast(id) {
    if (confirm('Are you sure you want to delete this roast?')) {
        let roasts = Storage.get('roasts', []);
        roasts = roasts.filter(r => r.id !== id);
        if (Storage.set('roasts', roasts)) {
            loadRoastHistory();
        }
    }
}

// Clear all data
function clearAllData() {
    if (confirm('Are you sure you want to delete all history? This action cannot be undone!')) {
        if (Storage.remove('roasts')) {
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
            'Saved Date': r.timestamp ? new Date(r.timestamp).toLocaleDateString('en-US') : new Date(r.date).toLocaleDateString('en-US'),
            'Saved Time': r.timestamp ? new Date(r.timestamp).toLocaleTimeString('en-US') : new Date(r.date).toLocaleTimeString('en-US'),
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
    
    console.log('☕ Coffee Roaster Tracker initialized successfully!');
});
