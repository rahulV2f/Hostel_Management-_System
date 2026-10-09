
"use strict";

/* =========================================
   HOSTELHUB: HOSTEL MANAGEMENT SYSTEM
   Frontend prototype using localStorage
========================================= */

const TOTAL_ROOMS = 12;
const BEDS_PER_ROOM = 2;
const STORAGE_KEYS = {
    students: "hostelhub_students",
    complaints: "hostelhub_complaints"
};

const roomNumbers = Array.from(
    { length: TOTAL_ROOMS },
    (_, index) => String(101 + index)
);

let students = loadData(STORAGE_KEYS.students, []);
let complaints = loadData(STORAGE_KEYS.complaints, []);
let toastTimer;

// ---------- Storage ----------

function loadData(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch (error) {
        console.error("Unable to load saved data:", error);
        return fallback;
    }
}

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEYS.students, JSON.stringify(students));
        localStorage.setItem(STORAGE_KEYS.complaints, JSON.stringify(complaints));
        return true;
    } catch (error) {
        console.error("Unable to save data:", error);
        showToast("Could not save data. Check browser storage.");
        return false;
    }
}

// ---------- Safe HTML helpers ----------

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function studentName(studentId) {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : "Unknown student";
}

function roomOccupancy(room) {
    return students.filter(student => student.room === room).length;
}

function availableBeds(room) {
    return Math.max(0, BEDS_PER_ROOM - roomOccupancy(room));
}

function getOpenComplaintCount() {
    return complaints.filter(c => c.status !== "Resolved").length;
}

function getInitials(name) {
    return name.trim().split(/\s+/)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join("");
}

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

// ---------- Navigation ----------

const pageTitles = {
    dashboard: "Dashboard Overview",
    students: "Student Management",
    rooms: "Room Allocation",
    complaints: "Complaint Management"
};

function navigateTo(pageId) {
    const page = document.getElementById(pageId);
    if (!page) return;

    document.querySelectorAll(".page").forEach(section => {
        section.classList.toggle("active", section.id === pageId);
    });

    document.querySelectorAll(".nav-link").forEach(button => {
        button.classList.toggle("active", button.dataset.page === pageId);
    });

    document.getElementById("pageTitle").textContent = pageTitles[pageId];

    if (pageId === "students") renderStudents();
    if (pageId === "rooms") renderRooms();
    if (pageId === "complaints") renderComplaints();
}

document.querySelectorAll(".nav-link").forEach(button => {
    button.addEventListener("click", () => navigateTo(button.dataset.page));
});

document.querySelectorAll("[data-go]").forEach(button => {
    button.addEventListener("click", () => navigateTo(button.dataset.go));
});

// ---------- Dashboard ----------

function renderDashboard() {
    const totalBeds = TOTAL_ROOMS * BEDS_PER_ROOM;
    const occupied = students.length;
    const percent = Math.round((occupied / totalBeds) * 100);

    document.getElementById("totalStudents").textContent = students.length;
    document.getElementById("totalRooms").textContent = TOTAL_ROOMS;
    document.getElementById("occupiedBeds").textContent = occupied;
    document.getElementById("openComplaints").textContent =
        getOpenComplaintCount();

    document.getElementById("occupancyText").textContent =
        `${percent}% occupancy`;

    document.getElementById("occupancyPercent").textContent = `${percent}%`;
    document.getElementById("occupancyBar").style.width =
        `${Math.min(100, percent)}%`;

    document.getElementById("availableBeds").textContent =
        `${totalBeds - occupied} beds available`;

    document.getElementById("sidebarComplaintCount").textContent =
        getOpenComplaintCount();

    renderRecentStudents();
    renderRecentComplaints();
}

function renderRecentStudents() {
    const tbody = document.getElementById("recentStudents");
    const recent = [...students].slice(-5).reverse();

    if (!recent.length) {
        tbody.innerHTML = emptyRow(3, "No students registered yet.");
        return;
    }

    tbody.innerHTML = recent.map(student => `
        <tr>
            <td>
                <div class="student-cell">
                    <div class="student-mini-avatar">
                        ${escapeHTML(getInitials(student.name))}
                    </div>
                    <strong>${escapeHTML(student.name)}</strong>
                </div>
            </td>
            <td>${escapeHTML(student.id)}</td>
            <td>${escapeHTML(student.room)}</td>
        </tr>
    `).join("");
}

function renderRecentComplaints() {
    const tbody = document.getElementById("recentComplaints");
    const recent = [...complaints].slice(-5).reverse();

    if (!recent.length) {
        tbody.innerHTML = emptyRow(4, "No complaints submitted yet.");
        return;
    }

    tbody.innerHTML = recent.map(complaint => `
        <tr>
            <td>${escapeHTML(complaint.title)}</td>
            <td>${escapeHTML(complaint.category)}</td>
            <td>${escapeHTML(studentName(complaint.studentId))}</td>
            <td>${statusBadge(complaint.status)}</td>
        </tr>
    `).join("");
}

function emptyRow(columns, message) {
    return `<tr><td colspan="${columns}" class="empty-state">
        ${escapeHTML(message)}
    </td></tr>`;
}

// ---------- Student Management ----------

const studentForm = document.getElementById("studentForm");

document.getElementById("showStudentForm").addEventListener("click", () => {
    populateRoomOptions();
    studentForm.classList.remove("hidden");
    studentForm.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("cancelStudent").addEventListener("click", () => {
    studentForm.reset();
    studentForm.classList.add("hidden");
});

function populateRoomOptions() {
    const select = document.getElementById("studentRoom");
    const previousValue = select.value;

    select.innerHTML = '<option value="">Select an available room</option>';

    roomNumbers.forEach(room => {
        const remaining = availableBeds(room);
        if (remaining <= 0) return;

        const option = document.createElement("option");
        option.value = room;
        option.textContent = `Room ${room} (${remaining} bed${remaining === 1 ? "" : "s"} available)`;
        select.appendChild(option);
    });

    if ([...select.options].some(option => option.value === previousValue)) {
        select.value = previousValue;
    }
}

studentForm.addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("studentName").value.trim();
    const id = document.getElementById("studentId").value.trim();
    const email = document.getElementById("studentEmail").value.trim();
    const department = document.getElementById("studentDepartment").value.trim();
    const room = document.getElementById("studentRoom").value;

    if (!name || !id || !email || !department || !room) {
        showToast("Please complete all student details.");
        return;
    }

    if (students.some(student =>
        student.id.toLowerCase() === id.toLowerCase()
    )) {
        showToast("This Student ID already exists.");
        return;
    }

    if (!roomNumbers.includes(room) || availableBeds(room) <= 0) {
        showToast("This room is full or invalid. Choose another room.");
        populateRoomOptions();
        return;
    }

    const newStudent = {
        id,
        name,
        email,
        department,
        room,
        createdAt: new Date().toISOString()
    };

    students.push(newStudent);

    if (!saveData()) {
        students.pop();
        return;
    }

    studentForm.reset();
    studentForm.classList.add("hidden");

    renderAll();
    showToast("Student registered successfully!");
});

document.getElementById("studentSearch").addEventListener("input", renderStudents);

function renderStudents() {
    const tbody = document.getElementById("studentsTable");
    const query = document.getElementById("studentSearch").value
        .trim().toLowerCase();

    const filtered = students.filter(student =>
        [student.name, student.id, student.email, student.department, student.room]
            .some(value => String(value).toLowerCase().includes(query))
    );

    document.getElementById("studentCountLabel").textContent =
        `${filtered.length} resident${filtered.length === 1 ? "" : "s"}`;

    if (!filtered.length) {
        tbody.innerHTML = emptyRow(5, "No matching students found.");
        return;
    }

    tbody.innerHTML = filtered.map(student => `
        <tr>
            <td>
                <div class="student-cell">
                    <div class="student-mini-avatar">
                        ${escapeHTML(getInitials(student.name))}
                    </div>
                    <div>
                        <strong>${escapeHTML(student.name)}</strong>
                        <small>${escapeHTML(student.email)}</small>
                    </div>
                </div>
            </td>
            <td>${escapeHTML(student.id)}</td>
            <td>${escapeHTML(student.department)}</td>
            <td>${escapeHTML(student.room)}</td>
            <td>
                <button class="danger-btn"
                    data-remove-student="${escapeHTML(student.id)}">
                    Remove
                </button>
            </td>
        </tr>
    `).join("");
}

document.getElementById("studentsTable").addEventListener("click", event => {
    const button = event.target.closest("[data-remove-student]");
    if (!button) return;

    const id = button.dataset.removeStudent;
    const student = students.find(s => s.id === id);
    if (!student) return;

    const linkedComplaints = complaints.filter(
        c => c.studentId === id && c.status !== "Resolved"
    );

    const warning = linkedComplaints.length
        ? ` This student has ${linkedComplaints.length} unresolved complaint(s).`
        : "";

    if (!confirm(`Remove ${student.name} from the hostel?${warning}`)) return;

    const previousStudents = [...students];
    const previousComplaints = [...complaints];

    students = students.filter(s => s.id !== id);

    // Keep complaint history, but anonymize the removed student's reference.
    complaints = complaints.map(c =>
        c.studentId === id ? { ...c, studentId: "" } : c
    );

    if (!saveData()) {
        students = previousStudents;
        complaints = previousComplaints;
        return;
    }

    renderAll();
    showToast("Student removed. Their room is now available.");
});

// ---------- Room Allocation ----------

function renderRooms() {
    const totalBeds = TOTAL_ROOMS * BEDS_PER_ROOM;
    const occupied = students.length;
    const available = totalBeds - occupied;
    const fullRooms = roomNumbers.filter(room => availableBeds(room) === 0).length;

    document.getElementById("roomSummary").innerHTML = `
        <div class="summary-box">
            <span>Total Rooms</span>
            <h3>${TOTAL_ROOMS}</h3>
        </div>
        <div class="summary-box">
            <span>Occupied Beds</span>
            <h3>${occupied}</h3>
        </div>
        <div class="summary-box">
            <span>Available Beds</span>
            <h3>${available}</h3>
        </div>
    `;

    document.getElementById("roomGrid").innerHTML = roomNumbers.map(room => {
        const residents = students.filter(student => student.room === room);
        const count = residents.length;
        const percent = Math.round((count / BEDS_PER_ROOM) * 100);
        const isFull = count >= BEDS_PER_ROOM;

        return `
            <article class="room-card">
                <div class="room-card-top">
                    <div>
                        <h3>Room ${escapeHTML(room)}</h3>
                        <p>${count} of ${BEDS_PER_ROOM} beds occupied</p>
                    </div>
                    <span class="room-badge ${isFull ? "full" : ""}">
                        ${isFull ? "Full" : `${BEDS_PER_ROOM - count} Available`}
                    </span>
                </div>

                <div class="room-progress">
                    <div style="width: ${percent}%"></div>
                </div>

                <div class="room-residents">
                    <strong>Residents</strong>
                    <p>${residents.length
                        ? residents.map(s => escapeHTML(s.name)).join(", ")
                        : "No residents assigned"}
                    </p>
                </div>
            </article>
        `;
    }).join("");
}

// ---------- Complaint Management ----------

const complaintForm = document.getElementById("complaintForm");

document.getElementById("showComplaintForm").addEventListener("click", () => {
    populateComplaintStudents();
    complaintForm.classList.remove("hidden");
    complaintForm.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.getElementById("cancelComplaint").addEventListener("click", () => {
    complaintForm.reset();
    complaintForm.classList.add("hidden");
});

function populateComplaintStudents() {
    const select = document.getElementById("complaintStudent");
    select.innerHTML = '<option value="">Select a student</option>';

    students.forEach(student => {
        const option = document.createElement("option");
        option.value = student.id;
        option.textContent = `${student.name} (${student.id})`;
        select.appendChild(option);
    });
}

complaintForm.addEventListener("submit", event => {
    event.preventDefault();

    const title = document.getElementById("complaintTitle").value.trim();
    const studentId = document.getElementById("complaintStudent").value;
    const category = document.getElementById("complaintCategory").value;
    const priority = document.getElementById("complaintPriority").value;
    const description = document.getElementById("complaintDescription").value.trim();

    if (!title || !studentId || !category || !description) {
        showToast("Please complete all complaint details.");
        return;
    }

    if (!students.some(student => student.id === studentId)) {
        showToast("Please select a valid registered student.");
        return;
    }

    const complaint = {
        id: (crypto.randomUUID
            ? crypto.randomUUID()
            : `CMP-${Date.now()}-${Math.random().toString(16).slice(2)}`),
        title,
        studentId,
        category,
        priority,
        description,
        status: "Open",
        createdAt: new Date().toISOString()
    };

    complaints.push(complaint);

    if (!saveData()) {
        complaints.pop();
        return;
    }

    complaintForm.reset();
    complaintForm.classList.add("hidden");

    renderAll();
    showToast("Complaint submitted successfully!");
});

document.getElementById("complaintFilter").addEventListener("change", renderComplaints);

function statusBadge(status) {
    const classMap = {
        "Open": "status-open",
        "In Progress": "status-progress",
        "Resolved": "status-resolved"
    };

    return `<span class="status ${classMap[status] || "status-open"}">
        ${escapeHTML(status)}
    </span>`;
}

function renderComplaints() {
    const tbody = document.getElementById("complaintsTable");
    const filter = document.getElementById("complaintFilter").value;

    const filtered = [...complaints]
        .filter(c => filter === "All" || c.status === filter)
        .reverse();

    if (!filtered.length) {
        tbody.innerHTML = emptyRow(6, "No complaints match this filter.");
        return;
    }

    tbody.innerHTML = filtered.map(complaint => `
        <tr>
            <td>
                <strong>${escapeHTML(complaint.title)}</strong>
                <small style="display:block;margin-top:5px;color:#81869b">
                    ${escapeHTML(complaint.description)}
                </small>
            </td>
            <td>${escapeHTML(complaint.category)}</td>
            <td>${escapeHTML(studentName(complaint.studentId))}</td>
            <td>
                <span class="status ${
                    complaint.priority === "High"
                        ? "status-open"
                        : complaint.priority === "Low"
                            ? "status-resolved"
                            : "status-progress"
                }">${escapeHTML(complaint.priority)}</span>
            </td>
            <td>${statusBadge(complaint.status)}</td>
            <td>
                <select class="action-select"
                    data-complaint-status="${escapeHTML(complaint.id)}"
                    aria-label="Update complaint status">
                    <option value="Open" ${complaint.status === "Open" ? "selected" : ""}>Open</option>
                    <option value="In Progress" ${complaint.status === "In Progress" ? "selected" : ""}>In Progress</option>
                    <option value="Resolved" ${complaint.status === "Resolved" ? "selected" : ""}>Resolved</option>
                </select>
            </td>
        </tr>
    `).join("");
}

document.getElementById("complaintsTable").addEventListener("change", event => {
    const select = event.target.closest("[data-complaint-status]");
    if (!select) return;

    const complaint = complaints.find(c => c.id === select.dataset.complaintStatus);
    if (!complaint) return;

    const allowedStatuses = ["Open", "In Progress", "Resolved"];
    if (!allowedStatuses.includes(select.value)) return;

    const previousStatus = complaint.status;
    complaint.status = select.value;

    if (!saveData()) {
        complaint.status = previousStatus;
        renderComplaints();
        return;
    }

    renderAll();
    showToast("Complaint status updated.");
});

// ---------- Refresh all views ----------

function renderAll() {
    renderDashboard();
    renderStudents();
    renderRooms();
    renderComplaints();
    populateRoomOptions();
    populateComplaintStudents();
}

// Initial rendering
renderAll();
