let role = "principal";
let otp = "";
let pendingUser = null;
let loggedIn = false;
let currentTeacherKey = null;
let failedLoginAttempts = 0;

const STORAGE_KEY = "studentAdmitProState";

const users = {
  principal: {
    username: "principal@school.com",
    password: "principal123",
    name: "Principal",
    role: "principal"
  },
  teachers: {
    T1: { username: "anitha@school.com", password: "anitha123", name: "Mrs. Anitha", role: "teacher", key: "T1" },
    T2: { username: "selvam@school.com", password: "selvam123", name: "Mr. Selvam", role: "teacher", key: "T2" },
    T3: { username: "priya@school.com", password: "priya123", name: "Mrs. Priya", role: "teacher", key: "T3" },
    T4: { username: "kumar@school.com", password: "kumar123", name: "Mr. Kumar", role: "teacher", key: "T4" },
    T5: { username: "deepa@school.com", password: "deepa123", name: "Mrs. Deepa", role: "teacher", key: "T5" },
    T6: { username: "rajesh@school.com", password: "rajesh123", name: "Mr. Rajesh", role: "teacher", key: "T6" }
  },
students:{
 S1:{
   username: "student1@school.com",
   password: "student123",
   name: "Arjun Kumar",
   role:"student"
 }
}
};
const teacherNameMap = {
  T1: "Mrs. Anitha",
  T2: "Mr. Selvam",
  T3: "Mrs. Priya",
  T4: "Mr. Kumar",
  T5: "Mrs. Deepa",
  T6: "Mr. Rajesh"
};

const students = [
  "Arjun Kumar","Vikram","Ajay R","Suresh Kumar S","Vinayag Mahadev S",
  "Karthik R","Vishal N","Vijay C","Iswarya S","Sanjay R",
  "Harish Kumar G","Praveen Raj G","Naveen K","Gokul S","Ramesh V",
  "Bala Murugan G","Dinesh K","Sathish R","Aswanth S","Ganesh Kumar R",
  "Lokesh R","Nithish V","Ajay Kumar G","Swetha M","Siva Kumar B",
  "Prakash R","Ravi Teja S","Siddharth N","Varun S","Mohan Raj T",
  "Nitin R" ,"Kamalesh R","Prathiba S","Sumathi R","Sowmiya S","Harini M","Ajith Kumar s",
  "Jayasri K","Lavanya M","Dhanush K","Kutty K","velu S","Surya S","Kowsalya B","Dinesh R",
  "Suba K","Diya k","Madhu A"
];

function emptyState(){
  const assigned = {};
  Object.keys(teacherNameMap).forEach(t => assigned[t] = []);
  return { assigned, autoAssigned: false };
}

function safeLoadState(){
  try{
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return emptyState();

    const parsed = JSON.parse(saved);

    if (!parsed || !parsed.assigned) return emptyState();

    Object.keys(teacherNames).forEach(t => {
      if (!Array.isArray(parsed.assigned[t])) parsed.assigned[t] = [];

      //  FIX: normalize old status
      parsed.assigned[t] = parsed.assigned[t].map(s => ({
        ...s,
        status: s.status || ""
      }));
    });

    if (typeof parsed.autoAssigned !== "boolean") parsed.autoAssigned = false;

    return parsed;

  }catch(e){
    localStorage.removeItem(STORAGE_KEY);
    return emptyState();
  }
}

let state = emptyState();

function saveState(){
  try{
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }catch(e){}
}

function resetSession(){
  role = "principal";
  otp = "";
  pendingUser = null;
  loggedIn = false;
  currentTeacherKey = null;
  failedLoginAttempts = 0;
  renderLogin();
}

function applyTheme(){
  document.body.className = role;
}

function setRole(r){
  console.log("Selected Role =",r);
  role = r;

  pendingUser = null;
  currentTeacherKey = null;
  otp = "";
  failedLoginAttempts = 0;

  document.body.className = role;

  renderLogin();
}

function findUserByUsername(username){
  if (username === users.principal.username) return users.principal;
  for (const key in users.teachers) {
    if (users.teachers[key].username === username) return users.teachers[key];
  }
  for (const key in users.students)
  {
    if (users.students[key].username === username) return users.students[key];
  }
  return null;
}

function logoHTML(){
  return `<div class="logo"><div class="logoMark"></div></div>`;
}

function renderLogin(){
  applyTheme();

  document.body.className = role;

  app.innerHTML = `
    <div class="wrap">
      <div class="login panel">
        <div class="brand">
          ${logoHTML()}
          <div class="title">
            <h1>StudentAdmitPro</h1>
          </div>
        </div>
        <div id="status" class="status"></div>

        <div class="roleSwitch">
          <button type="button" class="role ${role === "principal" ? "active" : ""}" onclick="setRole('principal')">Principal</button>
          <button type="button" class="role ${role === "teacher" ? "active" : ""}" onclick="setRole('teacher')">Teacher</button>
          <button type="button" class="role ${role === "student" ?  "active": ""}" onclick="setRole('student')">Student</button>    
          </div>

        <input id="username" class="field" placeholder="Email / User ID" autocomplete="username" />
        <input id="password" class="field" type="password" placeholder="Password" autocomplete="current-password" />

        <button type="button" class="primaryBtn" onclick="handlePasswordLogin()">Login</button>
        <button type="button" class="secondaryBtn" id="otpBtn" onclick="showOTPFallback()" style="display:none;">Forgot Password? Login with OTP</button>

        <div id="otpBox" class="hidden">
          <button type="button" class="secondaryBtn" onclick="sendOTP()">Send OTP</button>
          <input id="otpInput" class="field" placeholder="Enter OTP" inputmode="numeric" />
          <button type="button" class="primaryBtn" onclick="verifyOTP()">Verify OTP</button>
        </div>

      </div>
    </div>
  `;
}

function openOTPFromAttempts(message){
  const otpBox = document.getElementById("otpBox");
  const otpBtn = document.getElementById("otpBtn");
  const status = document.getElementById("status");

  if (otpBtn) {
    otpBtn.style.display = "block";
    otpBtn.disabled = false;
    otpBtn.style.pointerEvents = "auto";
  }

  if (otpBox) {
    otpBox.classList.remove("hidden");
    otpBox.style.display = "block"; //  IMPORTANT FIX
  }

  if (status) {
    status.innerHTML = message || "OTP enabled after 3 attempts.";
  }
}

function enableOTPButtons(){
  const box = document.getElementById("otpBox");

  if (!box) return;

  const buttons = box.querySelectorAll("button");

  buttons.forEach(btn => {
    btn.disabled = false;
    btn.style.pointerEvents = "auto";
    btn.style.opacity = "1";
  });
}

function handlePasswordLogin(){
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const status = document.getElementById("status");
  const otpBtn = document.getElementById("otpBtn");

  const user = findUserByUsername(username);

  // ❌ USER NOT FOUND
  if (!user) {
    failedLoginAttempts++;
    status.innerHTML = `Wrong user ID. Attempts left: ${Math.max(0, 3 - failedLoginAttempts)}`;

    if (failedLoginAttempts >= 3) openOTPFromAttempts();
    return;
  }

  // ❌ ROLE CHECK
  if (role !== user.role) {
    failedLoginAttempts++;
    status.innerHTML = `Select correct role (${user.role})`;

    if (failedLoginAttempts >= 3) openOTPFromAttempts();
    return;
  }

  // ❌ PASSWORD CHECK
  if (password !== user.password) {
    failedLoginAttempts++;
    pendingUser = user;

    status.innerHTML = `Wrong password. Attempts left: ${Math.max(0, 3 - failedLoginAttempts)}`;

    if (failedLoginAttempts >= 3) openOTPFromAttempts();
    return;
  }

  // ✅ SUCCESS
  failedLoginAttempts = 0;
  pendingUser = user;
  currentTeacherKey = user.key || null;
  loggedIn = true;

  renderDashboard();
}

function autoAssign(){

  const keys = Object.keys(state.assigned);

  if (!keys.length) {
    console.error("No teachers available for assignment");
    return;
  }

  // reset old assignments
  keys.forEach(k => {
    state.assigned[k] = [];
  });

  students.forEach((s, i) => {

    const key = keys[i % keys.length];

    if (!state.assigned[key]) {
      state.assigned[key] = [];
    }

    state.assigned[key].push({
      name: s,
      status: "null"
    });
  });

  state.autoAssigned = true;
  saveState();
  renderDashboard();
}

function resetAssignment(){
  state.assigned = {};
  Object.keys(teacherNames).forEach(k => {
    state.assigned[k] = [];
  });

  state.autoAssigned = false;
  saveState();
}

function updateStatus(teacherKey, index, newStatus){
  if (!state.assigned[teacherKey] || !state.assigned[teacherKey][index]) return;
  state.assigned[teacherKey][index].status = newStatus;
  saveState();
  renderDashboard();
}

function getTeacherScore(teacherKey){

  const list = state.assigned[teacherKey] || [];

  let score = 0;

  list.forEach(s => {

    if (s.status === "confirm") score += 10;

    else if (s.status === "visit") score += 5;

    else if (s.status === "interest") score += 3;

    else if (s.status === "notvisit") score += 1;

  });

  return score;
}

function getTeacherProgress(teacherKey){

  const list = state.assigned[teacherKey] || [];

  if (list.length === 0) return 0;

  const confirmed = list.filter(
    s => s.status === "confirm"
  ).length;

  return Math.round(
    (confirmed / list.length) * 100
  );
}

function countByStatus() {

  const all = Object.values(state.assigned).flat();

  return {
    total: students.length,

    assigned: state.autoAssigned ? all.length : 0,

    notvisit: state.autoAssigned
      ? all.filter(s => s.status === "notvisit").length
      : 0,

    visit: all.filter(s => s.status === "visit").length,

    interest: all.filter(s => s.status === "interest").length,

    confirm: all.filter(s => s.status === "confirm").length,

    pending: 0
  };
}

function statusLabel(s){
  if (s === "notvisit") return "Call/Message Only";
  if (s === "interest") return "Warm Lead";
  if (s === "visit") return "High Priority Visit";
  if (s === "confirm") return "Admission Confirmed";
  if (s === "Pending") return "No Teacher Action Yet";
  return "Call/Message Only";
}

function renderPrincipal(){
  const c = countByStatus();

  app.innerHTML = `
    <div class="wrap">
      <div class="topbar">
        <div class="brand">
          ${logoHTML()}
          <div class="title">
            <h1>Principal Dashboard</h1>
            <p>Logged in as ${pendingUser ? pendingUser.name : "Principal"}</p>
          </div>
        </div>
        <button type="button" class="secondaryBtn" style="max-width:140px;" onclick="logout()">Logout</button>
      </div>

      <div class="stats">
        <div class="stat"><div class="label">Total Students</div><div class="value">${c.total}</div></div>
        <div class="stat"><div class="label">Assigned</div><div class="value">${c.assigned}</div></div>
        <div class="stat"><div class="label">Not Visit</div><div class="value">${c.notvisit}</div></div>
        <div class="stat"><div class="label">Visit</div><div class="value">${c.visit}</div></div>
        <div class="stat"><div class="label">Interest</div><div class="value">${c.interest}</div></div>
        <div class="stat"><div class="label">Confirm</div><div class="value">${c.confirm}</div></div>
        <div class="stat"><div class="label">Pending</div><div class="value">${c.pending}</div></div>
      </div>

      <div class="card">
        <button type="button" class="primaryBtn" onclick="autoAssign()">Auto Assign Students</button>
        <p class="smallText">Auto assign splits 30 students into 6 teachers, 5 each.</p>
      </div>
    </div>

    <div class="card">
    <h3>Admission Progress Graph</h3>
    <canvas id="admissionChart"></canvas>
    </div>

    
    <div class="card">
    <h3>Teacher Performance Graph</h3>
    <canvas id="TeacherChart"></canvas>
    </div> 
  `;
  renderAdmissionGraph();
  renderTeacherGraph();
}

function renderTeacher(){
  const myKey = currentTeacherKey;
  const myStudents = myKey && state.assigned[myKey] ? state.assigned[myKey] : [];

  app.innerHTML = `
    <div class="wrap">
      <div class="topbar">
        <div class="brand">
          ${logoHTML()}
          <div class="title">
            <h1>Teacher Dashboard</h1>
            <p>Logged in as ${pendingUser ? pendingUser.name : "Teacher"}</p>
          </div>
        </div>
        <button type="button" class="secondaryBtn" style="max-width:140px;" onclick="logout()">Logout</button>
      </div>

      <div class="stats">
        <div class="stat"><div class="label">Your Students</div><div class="value">${myStudents.length}</div></div>
        <div class="stat"><div class="label">Assigned Total</div><div class="value">${countByStatus().assigned}</div></div>
      </div>

      <div class="card">
        <h3 style="margin-top:0;">${pendingUser ? pendingUser.name : "Teacher"} Students</h3>

        ${state.autoAssigned && myStudents.length ? `
          <div class="studentList">
            ${myStudents.map((s, index) => `
              <div class="studentRow">
                <div>
                  <div class="studentName">${s.name}</div>
                  <div class="studentMeta">Status: ${statusLabel(s.status)}</div>
                </div>
                <div class="actions">
                  <button type="button" class="tagBtn notvisit" onclick="updateStatus('${myKey}', ${index}, 'notvisit')">Not Visit</button>
                  <button type="button" class="tagBtn interest" onclick="updateStatus('${myKey}', ${index}, 'interest')">Interest</button>
                  <button type="button" class="tagBtn visit" onclick="updateStatus('${myKey}', ${index}, 'visit')">Visit</button>
                  <button type="button" class="tagBtn confirm" onclick="updateStatus('${myKey}', ${index}, 'confirm')">Confirm</button>
                </div>
              </div>
            `).join("")}
          </div>
        ` : `
          <p class="smallText">Students will appear here after principal clicks Auto Assign.</p>
        `}
      </div>
    </div>
  `;
}

function renderStudent() {

  app.innerHTML = `
    <div class="studentDashboard">

      <h2>Student Admission Form</h2>

      <input id="studentName" placeholder="Student Name">

      <input id="studentMobile" placeholder="Mobile Number">

      <input id="fatherName" placeholder="Father Name">

      <input id="motherName" placeholder="Mother Name">

      <input id="emailId" placeholder="E-mail ID">

      <input id="address" placeholder="Address Details">

      <input id="previousSchool" placeholder="Previous School">

      <button onclick="submitAdmission()">
        Submit
      </button>

      <div id="applicationResult"></div>

    </div>
  `;
}

function submitAdmission() {
   
  const applicationId = "SAP" + Date.now();

  alert("Admission Submitted Successfully\n\nApplication ID:\n" + applicationId);
}

function renderDashboard(){
  applyTheme();
  if (role === "principal") {
    renderPrincipal();
  } else if (role === "teacher") {
    renderTeacher();
  } else if (role === "student") {
    renderStudent();
  }
}

function logout(){
  resetSession();
}

window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    state = safeLoadState();
    if (loggedIn) renderDashboard();
  }
});

renderLogin();

window.setRole = setRole;
window.handlePasswordLogin = handlePasswordLogin;
window.showOTPFallback = showOTPFallback;
window.sendOTP = sendOTP;
window.verifyOTP = verifyOTP;
window.autoAssign = autoAssign;
window.updateStatus = updateStatus;
window.logout = logout;

setTimeout(() => {
  window.verifyOTP = verifyOTP;
}, 0);

function showOTPFallback(){
  const box = document.getElementById("otpBox");
  const status = document.getElementById("status");
  const otpBtn = document.getElementById("otpBtn");

  if (otpBtn) {
    otpBtn.style.display = "block";
    otpBtn.disabled = false;
  }

  if (box) {
    box.classList.remove("hidden");
    box.style.display = "block";
  }

  if (status) {
    status.innerHTML = "OTP login opened (fallback).";
  }
}

function sendOTP(){
  otp = String(Math.floor(1000 + Math.random() * 9000));
  alert("Demo OTP: " + otp);

  const status = document.getElementById("status");
  if (status) status.innerHTML = "OTP sent successfully.";
}

function verifyOTP(){
  const input = document.getElementById("otpInput").value.trim();

  if (input !== otp) {
    alert("Wrong OTP");
    return;
  }

  loggedIn = true;
  renderDashboard();
}

function renderTeacherGraph() {

  const canvas = document.getElementById("TeacherChart");

  if (!canvas) {
    console.log("TeacherChart canvas not found");
    return;
  }

  const teacherNames = Object.keys(state.assigned);

  const confirmedCounts = teacherNames.map(name => {
    return state.assigned[name].filter(
      s => s.status === "confirm"
    ).length;
  });

  // பழைய graph இருந்தால் destroy பண்ணு
  if (window.teacherChartInstance) {
    window.teacherChartInstance.destroy();
  }

  window.teacherChartInstance = new Chart(canvas, {
    type: "bar",
    data: {
      labels: teacherNames.map(t => teacherNameMap[t] || t),
      datasets: [{
        label: "Confirmed Admissions",
        data: confirmedCounts,
        backgroundColor : confirmedCounts.map(value => {
    if (value <= 1) return "#ff4d4d";
    if (value <= 3) return "#ffd633";
    return "#4CAF50";
})

      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

}

function renderAdmissionGraph() {

    const canvas = document.getElementById("admissionChart");

    if (!canvas) {
        console.log("admissionChart not found");
        return;
    }

    // பழைய graph இருந்தால் remove
    if (window.admissionChartInstance) {
        window.admissionChartInstance.destroy();
    }

    // Demo data
    const weeklyAdmissions = [2, 4, 3, 5, 7, 8, 10];

    window.admissionChartInstance = new Chart(canvas, {

        type: "line",

        data: {
            labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],

            datasets: [{
                label: "Admissions",
                data: weeklyAdmissions,

                borderColor: "#4CAF50",

                backgroundColor: "rgba(76,175,80,0.2)",

                fill: true,

                tension: 0.4
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false
        }

    });

}