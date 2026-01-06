import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const auth = getAuth();

function bindAuthEvents() {
    document.getElementById('loginFormElement').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById('signupFormElement').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('signupUsername').value;
        const password = document.getElementById('signupPassword').value;
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            alert(error.message);
        }
    });

    document.getElementById('showSignup').addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForm('signup');
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        toggleAuthForm('login');
    });

    document.getElementById('logoutBtn').addEventListener('click', async () => {
        await signOut(auth);
    });

    document.getElementById('settingsBtn').addEventListener('click', () => {

        function toggleAuthForm(type) {
            if (type === 'signup') {
                document.getElementById('loginForm').classList.add('d-none');
                document.getElementById('signupForm').classList.remove('d-none');
            } else {
                document.getElementById('signupForm').classList.add('d-none');
                document.getElementById('loginForm').classList.remove('d-none');
            }
        }

        function showAuth() {
            document.getElementById('authContainer').classList.remove('d-none');
            document.getElementById('mainApp').classList.add('d-none');
        }

        function showMainApp(user) {
            document.getElementById('authContainer').classList.add('d-none');
            document.getElementById('mainApp').classList.remove('d-none');
            document.getElementById('currentUser').textContent = user.email;
        }

        document.addEventListener('DOMContentLoaded', () => {
            bindAuthEvents();
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    showMainApp(user);
                } else {
                    showAuth();
                }
            });
        });
    }

    showAuth() {
        document.getElementById('authContainer').classList.remove('d-none');
        document.getElementById('mainApp').classList.add('d-none');
    }

    showSettings() {
        document.getElementById('newUsername').value = this.currentUser;
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        new bootstrap.Modal(document.getElementById('settingsModal')).show();
    }

    saveSettings() {
        const newUsername = document.getElementById('newUsername').value.trim();
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!currentPassword) {
            alert('Please enter your current password');
            return;
        }

        if (this.users[this.currentUser].password !== currentPassword) {
            alert('Current password is incorrect');
            return;
        }

        if (newUsername && newUsername !== this.currentUser) {
            if (this.users[newUsername]) {
                alert('Username already exists');
                return;
            }
            this.users[newUsername] = this.users[this.currentUser];
            delete this.users[this.currentUser];
            this.currentUser = newUsername;
            localStorage.setItem('currentUser', newUsername);
        }

        if (newPassword) {
            if (newPassword !== confirmPassword) {
                alert('New passwords do not match');
                return;
            }
            if (newPassword.length < 1) {
                alert('Password cannot be empty');
                return;
            }
            this.users[this.currentUser].password = newPassword;
        }

        this.saveUsers();
        document.getElementById('currentUser').textContent = this.currentUser;
        bootstrap.Modal.getInstance(document.getElementById('settingsModal')).hide();
        alert('Settings updated successfully');
    }

    showCalendar() {
        document.getElementById('calendarView').classList.remove('d-none');
        document.getElementById('mainView').classList.add('d-none');
        if (window.examTracker) {
            examTracker.renderCalendar();
        }
    }

    hideCalendar() {
        document.getElementById('calendarView').classList.add('d-none');
        document.getElementById('mainView').classList.remove('d-none');
    }

    changeMonth(direction) {
        if (window.examTracker) {
            examTracker.currentDate.setMonth(examTracker.currentDate.getMonth() + direction);
            examTracker.renderCalendar();
        }
    }

    showAdmin() {
        this.renderUsersList();
        new bootstrap.Modal(document.getElementById('adminModal')).show();
    }

    renderUsersList() {
        const tbody = document.getElementById('usersList');
        tbody.innerHTML = Object.keys(this.users)
            .filter(username => username !== 'admin')
            .map(username => {
                const user = this.users[username];
                const examCount = user.exams ? user.exams.length : 0;
                return `
                    <tr>
                        <td>${username}</td>
                        <td>${examCount}</td>
                        <td>
                            <button class="btn btn-sm btn-warning me-1" onclick="authManager.resetPassword('${username}')">
                                <i class="bi bi-key"></i> Reset
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="authManager.deleteUser('${username}')">
                                <i class="bi bi-trash"></i> Delete
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
    }

    resetPassword(username) {
        if (confirm(`Reset password for ${username}?`)) {
            const newPassword = 'password123';
            this.users[username].password = newPassword;
            this.saveUsers();
            alert(`Password reset to: ${newPassword}`);
        }
    }

    deleteUser(username) {
        if (confirm(`Delete user ${username} and all their data?`)) {
            delete this.users[username];
            this.saveUsers();
            this.renderUsersList();
            alert(`User ${username} deleted successfully`);
        }
    }

    showMainApp() {
        document.getElementById('authContainer').classList.add('d-none');
        document.getElementById('mainApp').classList.remove('d-none');
        document.getElementById('currentUser').textContent = this.currentUser;
        
        if (this.users[this.currentUser]?.isAdmin) {
            document.getElementById('adminBtn').classList.remove('d-none');
        } else {
            document.getElementById('adminBtn').classList.add('d-none');
        }
        
        if (!window.examTracker) {
            window.examTracker = new ExamTracker();
        } else {
            examTracker.loadUserData();
        }
    }
}

class ExamTracker {
    constructor() {
        this.currentSort = 'days';
        this.currentFilter = 'all';
        this.selectMode = false;
        this.selectedExams = new Set();
        this.editingExam = null;
        this.expandedGroups = new Set();
        this.currentDate = new Date();
        this.countdownTimer = null;
        this.loadUserData();
        this.init();
    }

    loadUserData() {
        const currentUser = localStorage.getItem('currentUser');
        const userData = authManager.users[currentUser] || {};
        this.exams = userData.exams || [];
        this.groups = userData.groups || [];
    }

    saveUserData() {
        const currentUser = localStorage.getItem('currentUser');
        if (authManager.users[currentUser]) {
            authManager.users[currentUser].exams = this.exams;
            authManager.users[currentUser].groups = this.groups;
            authManager.saveUsers();
        }
    }

    init() {
        this.bindEvents();
        this.render();
    }

    bindEvents() {
        document.getElementById('examForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addExam();
        });

        document.getElementById('sortByDays').addEventListener('click', () => {
            this.setSortMode('days');
        });

        document.getElementById('sortByPriority').addEventListener('click', () => {
            this.setSortMode('priority');
        });

        document.getElementById('showAll').addEventListener('click', () => {
            this.setFilter('all');
        });

        document.getElementById('showPending').addEventListener('click', () => {
            this.setFilter('pending');
        });

        document.getElementById('showCompleted').addEventListener('click', () => {
            this.setFilter('completed');
        });

        document.getElementById('selectModeBtn').addEventListener('click', () => {
            this.toggleSelectMode();
        });

        document.getElementById('createGroupBtn').addEventListener('click', () => {
            this.createGroup();
        });

        document.getElementById('cancelSelectBtn').addEventListener('click', () => {
            this.toggleSelectMode();
        });

        document.getElementById('saveEditBtn').addEventListener('click', () => {
            this.saveEdit();
        });

        document.getElementById('calendarBtn').addEventListener('click', () => {
            authManager.showCalendar();
        });

        document.getElementById('closeCalendarBtn').addEventListener('click', () => {
            authManager.hideCalendar();
        });

        document.getElementById('prevMonth').addEventListener('click', () => {
            authManager.changeMonth(-1);
        });

        document.getElementById('nextMonth').addEventListener('click', () => {
            authManager.changeMonth(1);
        });
    }

    addExam() {
        const name = document.getElementById('examName').value.trim();
        const date = document.getElementById('examDate').value;
        const time = document.getElementById('examTime').value;
        const location = document.getElementById('examLocation').value.trim();
        const priority = document.getElementById('examPriority').value;
        const notes = document.getElementById('examNotes').value.trim();

        if (!name || !date) return;

        const exam = {
            id: Date.now(),
            name,
            date,
            time,
            location,
            priority,
            notes,
            completed: false,
            createdAt: new Date().toISOString()
        };

        this.exams.push(exam);
        this.saveToStorage();
        this.render();
        document.getElementById('examForm').reset();
    }

    toggleComplete(id) {
        const exam = this.exams.find(e => e.id === id);
        if (exam) {
            exam.completed = !exam.completed;
            this.saveToStorage();
            this.render();
            this.renderGroups();
        }
    }

    deleteExam(id) {
        this.exams = this.exams.filter(e => e.id !== id);
        this.groups.forEach(group => {
            group.examIds = group.examIds.filter(examId => examId !== id);
        });
        this.saveToStorage();
        this.render();
    }

    getDaysRemaining(examDate) {
        const today = new Date();
        const exam = new Date(examDate);
        const diffTime = exam - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    getDaysRemainingClass(days) {
        if (days < 0) return 'overdue';
        if (days <= 3) return 'urgent';
        if (days <= 7) return 'soon';
        return 'normal';
    }

    getDaysRemainingText(days) {
        if (days < 0) return `${Math.abs(days)} days overdue`;
        if (days === 0) return 'Today';
        if (days === 1) return 'Tomorrow';
        return `${days} days left`;
    }

    getDetailedCountdown(examDate, examTime) {
        const now = new Date();
        const examDateTime = new Date(examDate + (examTime ? `T${examTime}` : 'T23:59:59'));
        const diff = examDateTime - now;
        
        if (diff <= 0) {
            return 'Exam time!';
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m ${seconds}s`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else {
            return `${minutes}m ${seconds}s`;
        }
    }

    startCountdownTimer() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
        }
        
        this.countdownTimer = setInterval(() => {
            this.updateCountdowns();
        }, 1000);
    }

    updateCountdowns() {
        document.querySelectorAll('.live-countdown').forEach(element => {
            const examDate = element.dataset.date;
            const examTime = element.dataset.time;
            const countdown = this.getDetailedCountdown(examDate, examTime);
            element.textContent = countdown;
        });
    }

    getDetailedCountdown(examDate, examTime) {
        const now = new Date();
        const examDateTime = new Date(examDate + (examTime ? `T${examTime}` : 'T23:59:59'));
        const diff = examDateTime - now;
        
        if (diff <= 0) {
            return 'Exam time!';
        }
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m ${seconds}s`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds}s`;
        } else {
            return `${minutes}m ${seconds}s`;
        }
    }

    startCountdownTimer() {
        if (this.countdownTimer) {
            clearInterval(this.countdownTimer);
        }
        
        this.countdownTimer = setInterval(() => {
            this.updateCountdowns();
        }, 1000);
    }

    updateCountdowns() {
        document.querySelectorAll('.live-countdown').forEach(element => {
            const examDate = element.dataset.date;
            const examTime = element.dataset.time;
            const countdown = this.getDetailedCountdown(examDate, examTime);
            element.textContent = countdown;
        });
    }

    setSortMode(mode) {
        this.currentSort = mode;
        document.querySelectorAll('.sort-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`sortBy${mode.charAt(0).toUpperCase() + mode.slice(1)}`).classList.add('active');
        this.render();
    }

    setFilter(filter) {
        this.currentFilter = filter;
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`show${filter.charAt(0).toUpperCase() + filter.slice(1)}`).classList.add('active');
        this.render();
    }

    sortExams(exams) {
        if (this.currentSort === 'days') {
            return exams.sort((a, b) => {
                const daysA = this.getDaysRemaining(a.date);
                const daysB = this.getDaysRemaining(b.date);
                return daysA - daysB;
            });
        } else {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            return exams.sort((a, b) => {
                const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
                if (priorityDiff !== 0) return priorityDiff;
                return this.getDaysRemaining(a.date) - this.getDaysRemaining(b.date);
            });
        }
    }

    filterExams(exams) {
        if (this.currentFilter === 'pending') {
            return exams.filter(exam => !exam.completed);
        } else if (this.currentFilter === 'completed') {
            return exams.filter(exam => exam.completed);
        }
        return exams;
    }

    toggleSelectMode() {
        this.selectMode = !this.selectMode;
        this.selectedExams.clear();
        
        const selectBtn = document.getElementById('selectModeBtn');
        const groupActions = document.getElementById('groupActions');
        
        if (this.selectMode) {
            selectBtn.textContent = 'Exit Select';
            selectBtn.classList.remove('btn-outline-info');
            selectBtn.classList.add('btn-info');
            groupActions.classList.remove('d-none');
        } else {
            selectBtn.textContent = 'Select Mode';
            selectBtn.classList.remove('btn-info');
            selectBtn.classList.add('btn-outline-info');
            groupActions.classList.add('d-none');
        }
        
        this.render();
    }

    createGroup() {
        const groupName = document.getElementById('groupName').value.trim();
        if (!groupName || this.selectedExams.size === 0) {
            alert('Please enter a group name and select exams');
            return;
        }

        const group = {
            id: Date.now(),
            name: groupName,
            examIds: Array.from(this.selectedExams),
            createdAt: new Date().toISOString()
        };

        this.groups.push(group);
        this.saveToStorage();
        this.toggleSelectMode();
        document.getElementById('groupName').value = '';
        this.renderGroups();
    }

    editExam(id) {
        const exam = this.exams.find(e => e.id === id);
        if (!exam) return;

        this.editingExam = exam;
        
        document.getElementById('editExamName').value = exam.name;
        document.getElementById('editExamDate').value = exam.date;
        document.getElementById('editExamTime').value = exam.time || '';
        document.getElementById('editExamLocation').value = exam.location || '';
        document.getElementById('editExamPriority').value = exam.priority;
        document.getElementById('editExamNotes').value = exam.notes || '';
        
        new bootstrap.Modal(document.getElementById('editModal')).show();
    }

    saveEdit() {
        if (!this.editingExam) return;

        this.editingExam.name = document.getElementById('editExamName').value.trim();
        this.editingExam.date = document.getElementById('editExamDate').value;
        this.editingExam.time = document.getElementById('editExamTime').value;
        this.editingExam.location = document.getElementById('editExamLocation').value.trim();
        this.editingExam.priority = document.getElementById('editExamPriority').value;
        this.editingExam.notes = document.getElementById('editExamNotes').value.trim();

        this.saveToStorage();
        this.render();
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        this.editingExam = null;
    }

    deleteGroup(groupId) {
        this.groups = this.groups.filter(g => g.id !== groupId);
        this.saveToStorage();
        this.renderGroups();
    }

    toggleGroup(groupId) {
        if (this.expandedGroups.has(groupId)) {
            this.expandedGroups.delete(groupId);
        } else {
            this.expandedGroups.add(groupId);
        }
        this.renderGroups();
    }

    renderGroups() {
        const container = document.getElementById('groupsList');
        
        if (this.groups.length === 0) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <div class="card mb-4">
                <div class="card-header bg-info text-white">
                    <h5 class="mb-0"><i class="bi bi-collection"></i> Exam Groups</h5>
                </div>
                <div class="card-body">
                    ${this.groups.map(group => {
                        const groupExams = this.exams.filter(exam => group.examIds.includes(exam.id));
                        const isExpanded = this.expandedGroups.has(group.id);
                        return `
                            <div class="mb-3">
                                <div class="group-header d-flex justify-content-between align-items-center p-3" style="cursor: pointer;" onclick="examTracker.toggleGroup(${group.id})">
                                    <div>
                                        <i class="bi ${isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} text-primary"></i>
                                        <strong class="ms-2 fs-6">${group.name}</strong>
                                        <span class="badge bg-secondary ms-2">${groupExams.length} exams</span>
                                    </div>
                                    <button class="btn btn-sm btn-outline-danger" onclick="event.stopPropagation(); examTracker.deleteGroup(${group.id});">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                </div>
                                ${isExpanded ? `
                                    <div class="mt-2">
                                        ${this.renderGroupExams(groupExams)}
                                    </div>
                                ` : ''}
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    }

    renderGroupExams(groupExams) {
        return groupExams.map(exam => {
            const days = this.getDaysRemaining(exam.date);
            const daysClass = this.getDaysRemainingClass(days);
            const daysText = this.getDaysRemainingText(days);

            return `
                <div class="card mb-2 exam-item ${exam.completed ? 'completed' : ''}">
                    <div class="card-body py-3">
                        <div class="row align-items-start">
                            <div class="col-md-5">
                                <h6 class="exam-name mb-2 fw-bold">${exam.name}</h6>
                                <div class="text-muted small">
                                    <div class="mb-1"><i class="bi bi-calendar me-1"></i> ${new Date(exam.date).toLocaleDateString()}${exam.time ? ` at ${exam.time}` : ''}</div>
                                    ${exam.location ? `<div class="mb-1"><i class="bi bi-geo-alt me-1"></i> ${exam.location}</div>` : ''}
                                    ${exam.notes ? `<div class="mt-1"><i class="bi bi-sticky me-1"></i> ${exam.notes}</div>` : ''}
                                </div>
                            </div>
                            <div class="col-md-2 text-center">
                                <span class="days-remaining ${daysClass}">
                                    ${daysText}
                                </span>
                            </div>
                            <div class="col-md-2 text-center">
                                <span class="priority ${exam.priority}">
                                    ${exam.priority}
                                </span>
                            </div>
                            <div class="col-md-3 text-end">
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="examTracker.editExam(${exam.id})">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button class="btn btn-sm ${exam.completed ? 'btn-warning' : 'btn-success'} me-1" onclick="examTracker.toggleComplete(${exam.id})">
                                    <i class="bi ${exam.completed ? 'bi-arrow-counterclockwise' : 'bi-check'}"></i>
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="examTracker.deleteExam(${exam.id})">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    getUngroupedExams() {
        const groupedExamIds = new Set();
        this.groups.forEach(group => {
            group.examIds.forEach(id => groupedExamIds.add(id));
        });
        return this.exams.filter(exam => !groupedExamIds.has(exam.id));
    }

    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        document.getElementById('currentMonth').textContent = 
            new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const calendar = document.getElementById('calendar');
        calendar.innerHTML = `
            <div class="calendar-grid">
                <div class="text-center fw-bold p-2">Sun</div>
                <div class="text-center fw-bold p-2">Mon</div>
                <div class="text-center fw-bold p-2">Tue</div>
                <div class="text-center fw-bold p-2">Wed</div>
                <div class="text-center fw-bold p-2">Thu</div>
                <div class="text-center fw-bold p-2">Fri</div>
                <div class="text-center fw-bold p-2">Sat</div>
                ${this.generateCalendarDays(startDate, year, month)}
            </div>
        `;
    }

    generateCalendarDays(startDate, year, month) {
        let html = '';
        const today = new Date();
        const currentDate = new Date(startDate);
        
        for (let i = 0; i < 42; i++) {
            const dayExams = this.getExamsForDate(currentDate);
            const isCurrentMonth = currentDate.getMonth() === month;
            const isToday = currentDate.toDateString() === today.toDateString();
            
            html += `
                <div class="calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday ? 'today' : ''}">
                    <div class="fw-bold">${currentDate.getDate()}</div>
                    ${dayExams.map(exam => `
                        <div class="calendar-exam ${exam.priority}" title="${exam.name}${exam.time ? ' at ' + exam.time : ''}">
                            ${exam.name.substring(0, 15)}${exam.name.length > 15 ? '...' : ''}
                        </div>
                    `).join('')}
                </div>
            `;
            
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        return html;
    }

    getExamsForDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.exams.filter(exam => exam.date === dateStr && !exam.completed);
    }

    render() {
        this.renderGroups();
        const container = document.getElementById('examsList');
        let filteredExams = this.filterExams(this.getUngroupedExams());
        let sortedExams = this.sortExams(filteredExams);

        if (sortedExams.length === 0) {
            container.innerHTML = `
                <div class="card">
                    <div class="card-body empty-state">
                        <h3>No exams found</h3>
                        <p>Add your first exam to get started!</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = sortedExams.map(exam => {
            const days = this.getDaysRemaining(exam.date);
            const daysClass = this.getDaysRemainingClass(days);
            const daysText = this.getDaysRemainingText(days);

            return `
                <div class="card mb-3 exam-item ${exam.completed ? 'completed' : ''} fade-in">
                    <div class="card-body">
                        <div class="row align-items-start">
                            ${this.selectMode ? `<div class="col-auto"><input type="checkbox" class="form-check-input exam-checkbox" data-id="${exam.id}" ${this.selectedExams.has(exam.id) ? 'checked' : ''}></div>` : ''}
                            <div class="${this.selectMode ? 'col-md-4' : 'col-md-5'}">
                                <h5 class="exam-name mb-2 fw-bold">${exam.name}</h5>
                                <div class="text-muted small">
                                    <div class="mb-1"><i class="bi bi-calendar me-1"></i> ${new Date(exam.date).toLocaleDateString()}${exam.time ? ` at ${exam.time}` : ''}</div>
                                    ${exam.location ? `<div class="mb-1"><i class="bi bi-geo-alt me-1"></i> ${exam.location}</div>` : ''}
                                    ${exam.notes ? `<div class="mt-1"><i class="bi bi-sticky me-1"></i> ${exam.notes}</div>` : ''}
                                </div>
                            </div>
                            <div class="col-md-2 text-center">
                                <div class="days-remaining ${daysClass} mb-1">
                                    ${daysText}
                                </div>
                                <div class="live-countdown small text-muted" data-date="${exam.date}" data-time="${exam.time || ''}">
                                    ${this.getDetailedCountdown(exam.date, exam.time)}
                                </div>
                            </div>
                            <div class="col-md-2 text-center">
                                <span class="priority ${exam.priority}">
                                    ${exam.priority}
                                </span>
                            </div>
                            <div class="col-md-3 text-end">
                                ${!this.selectMode ? `
                                    <button class="btn btn-sm btn-outline-primary me-1" onclick="examTracker.editExam(${exam.id})">
                                        <i class="bi bi-pencil"></i>
                                    </button>
                                    <button class="btn btn-sm ${exam.completed ? 'btn-warning' : 'btn-success'} me-1" onclick="examTracker.toggleComplete(${exam.id})">
                                        <i class="bi ${exam.completed ? 'bi-arrow-counterclockwise' : 'bi-check'}"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="examTracker.deleteExam(${exam.id})">
                                        <i class="bi bi-trash"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (this.selectMode) {
            setTimeout(() => {
                document.querySelectorAll('.exam-checkbox').forEach(checkbox => {
                    checkbox.addEventListener('change', (e) => {
                        const examId = parseInt(e.target.dataset.id);
                        if (e.target.checked) {
                            this.selectedExams.add(examId);
                        } else {
                            this.selectedExams.delete(examId);
                        }
                    });
                });
            }, 0);
        }
        
        // Start countdown timer
        this.startCountdownTimer();
    }

    saveToStorage() {
        this.saveUserData();
    }
}

// Initialize the app
const authManager = new AuthManager();