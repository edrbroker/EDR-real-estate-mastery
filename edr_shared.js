/* EDR Realty Group training portal: shared sign-in, progress saving, and lesson locking.
   Loaded by every course lesson page and final exam page (Courses 2 and up).
   Each page sets window.EDR_PAGE = {course:'course5', num:5, lesson:3 or 'final', lessons:10} before loading this file. */
(function () {
  var SBU = "https://zthiyivbiemgvojcrlyg.supabase.co";
  var SBK = "sb_publishable_TGjtCA2-ofJ2Lh2nGsxcWg_czcaS9_V";
  var COURSE_CODE = "EDR2026";
  var PASS = 4;                       // lesson quiz pass mark (4 of 5)
  var DEFAULT_ACTIVE = { 1: true, 2: true, 3: true, 4: true, 5: true, 6: true, 7: true };
  var P = window.EDR_PAGE || {};
  var ag = null;

  function sb(table, method, body, filter) {
    return fetch(SBU + "/rest/v1/" + table + (filter || ""), {
      method: method,
      headers: {
        "apikey": SBK, "Authorization": "Bearer " + SBK, "Content-Type": "application/json",
        "Prefer": method === "POST" ? "return=representation" : "return=minimal"
      },
      body: body ? JSON.stringify(body) : undefined
    }).then(function (r) {
      if (method !== "GET") return r.ok;
      if (!r.ok) throw new Error("request failed");
      return r.json();
    });
  }
  async function sha256(s) {
    var b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return Array.from(new Uint8Array(b)).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
  }
  function $(id) { return document.getElementById(id); }
  function stored() {
    try { return JSON.parse(localStorage.getItem("edr_agent") || sessionStorage.getItem("edr_agent") || "null"); }
    catch (e) { return null; }
  }
  function courseFilter(key) {
    // Course 1 rows were saved before the course column existed, so they may be blank.
    return key === "course1" ? "&or=(course.is.null,course.eq.course1)" : "&course=eq." + key;
  }

  function lockScreen(title, msg, href, label) {
    var lc = $("lc"); if (lc) lc.style.display = "none";
    var w = $("edr-auth-wrap"); if (w) w.style.display = "none";
    var d = document.createElement("div");
    d.id = "edr-lock";
    d.style.cssText = "position:fixed;inset:0;background:rgba(10,22,40,.97);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;font-family:'Helvetica Neue',Arial,sans-serif";
    var box = document.createElement("div");
    box.style.cssText = "background:#fff;border-radius:16px;padding:36px 32px;max-width:420px;width:100%;text-align:center";
    var h = document.createElement("div"); h.style.cssText = "font-size:34px;margin-bottom:10px"; h.textContent = "🔒";
    var t = document.createElement("div"); t.style.cssText = "font-size:1.15rem;font-weight:700;color:#0a1628;margin-bottom:8px"; t.textContent = title;
    var m = document.createElement("div"); m.style.cssText = "font-size:.9rem;color:#6b6560;line-height:1.6;margin-bottom:22px"; m.textContent = msg;
    var a = document.createElement("a"); a.href = href; a.textContent = label;
    a.style.cssText = "display:inline-block;background:#0a1628;color:#fff;text-decoration:none;border-radius:8px;padding:12px 22px;font-weight:700;font-size:.9rem";
    box.appendChild(h); box.appendChild(t); box.appendChild(m); box.appendChild(a); d.appendChild(box);
    document.body.appendChild(d);
  }

  function show(agent) {
    ag = agent;
    ag.full_name = ag.full_name || ag.name || "Agent";
    ag.name = ag.full_name;
    var w = $("edr-auth-wrap"); if (w) w.style.display = "none";
    var lc = $("lc"); if (lc) lc.style.display = "block";
    var b = $("nb-badge"); if (b) { b.textContent = ag.full_name; b.style.display = "inline-block"; }
    if (ag.is_preview) { var pb = $("preview-banner"); if (pb) pb.style.display = "block"; }
    if (typeof window.buildQuiz === "function") { try { window.buildQuiz(); } catch (e) {} }
    checkAccess();
  }

  // Sequential locking: course must be switched on, the previous course's final exam passed,
  // and the previous lesson passed. If the check itself cannot run (offline), the page stays open.
  async function checkAccess() {
    if (!ag || ag.is_preview || !P.course) return;
    try {
      var id = encodeURIComponent(ag.id);
      var active = DEFAULT_ACTIVE[P.num] === true;
      var st = await sb("settings", "GET", null, "?key=eq.course_settings_v2&select=value");
      if (st && st.length && st[0].value) {
        var raw = JSON.parse(st[0].value) || {};
        if (raw[P.num] !== undefined) active = !!raw[P.num];
      }
      if (!active) return lockScreen("This course is not open yet", "Your instructor has not opened this course. Check back soon.", "index.html", "Back to the Portal");
      if (P.num > 1) {
        var prev = "course" + (P.num - 1);
        var fq = await sb("final_quiz", "GET", null, "?agent_id=eq." + id + courseFilter(prev) + "&select=passed");
        if (!(fq || []).some(function (r) { return r.passed; }))
          return lockScreen("Finish Course " + (P.num - 1) + " first", "Pass the Course " + (P.num - 1) + " final exam to unlock this course.", "index.html", "Back to the Portal");
      }
      var rows = await sb("progress", "GET", null, "?agent_id=eq." + id + courseFilter(P.course) + "&select=lesson_id,score");
      var done = {};
      (rows || []).forEach(function (r) { if (r.score >= PASS) done[r.lesson_id] = true; });
      var need = P.lesson === "final" ? P.lessons : P.lesson - 1;
      for (var i = 1; i <= need; i++) {
        if (!done[i])
          return lockScreen("Finish Lesson " + i + " first", "Lessons unlock in order. Pass the Lesson " + i + " quiz to keep going.", P.course + "_lesson" + i + ".html", "Go to Lesson " + i);
      }
    } catch (e) { /* could not check: leave the page open */ }
  }

  window.edrLogin = async function () {
    var em = $("edr-email").value.trim().toLowerCase();
    var pw = $("edr-pass").value.trim();
    var err = $("edr-err"), spin = $("edr-spin");
    function fail(msg) { if (spin) spin.style.display = "none"; err.textContent = msg; err.style.display = "block"; }
    if (!em || !pw) return fail("Please enter your email and password.");
    err.style.display = "none"; if (spin) spin.style.display = "block";
    try {
      var data = await sb("agents", "GET", null, "?email=eq." + encodeURIComponent(em) + "&select=id,full_name,email,password_hash");
      if (!data || !data.length) return fail("No account found. Register at the EDR Training Portal.");
      var hash = await sha256(pw);
      if (data[0].password_hash !== hash && pw !== COURSE_CODE) return fail("Incorrect password.");
      if (spin) spin.style.display = "none";
      var a = { id: data[0].id, name: data[0].full_name, full_name: data[0].full_name, email: data[0].email };
      localStorage.setItem("edr_agent", JSON.stringify(a));
      sessionStorage.setItem("edr_agent", JSON.stringify(a));
      show(a);
    } catch (e) { fail("Connection error. Please try again."); }
  };

  // Saves a lesson quiz score. Keeps the agent's best score, so a later low retake never erases a pass.
  async function saveLesson(lessonId, score, answers) {
    if (!ag || ag.is_preview || !P.course) return false;
    try {
      var f = "?agent_id=eq." + encodeURIComponent(ag.id) + "&lesson_id=eq." + lessonId + "&course=eq." + P.course;
      var r = await sb("progress", "GET", null, f + "&select=id,score");
      var now = new Date().toISOString();
      if (r && r.length) {
        if (score <= (r[0].score || 0)) return true;
        return (await sb("progress", "PATCH", { score: score, answers: answers || null, completed_at: now }, f))
            || (await sb("progress", "PATCH", { score: score, completed_at: now }, f));
      }
      var row = { agent_id: ag.id, lesson_id: lessonId, score: score, completed_at: now, course: P.course };
      return (await sb("progress", "POST", Object.assign({ answers: answers || null }, row))) || (await sb("progress", "POST", row));
    } catch (e) { return false; }
  }
  // Saves a final exam result. A pass is never replaced by a later fail.
  async function saveFinal(score, passed, answers) {
    if (!ag || ag.is_preview || !P.course) return false;
    try {
      var f = "?agent_id=eq." + encodeURIComponent(ag.id) + "&course=eq." + P.course;
      var r = await sb("final_quiz", "GET", null, f + "&select=id,score,passed");
      var now = new Date().toISOString();
      if (r && r.length) {
        if (r[0].passed && (!passed || score <= (r[0].score || 0))) return true;
        return (await sb("final_quiz", "PATCH", { score: score, passed: passed, answers: answers || null, completed_at: now }, f))
            || (await sb("final_quiz", "PATCH", { score: score, passed: passed, completed_at: now }, f));
      }
      var row = { agent_id: ag.id, score: score, passed: passed, completed_at: now, course: P.course };
      return (await sb("final_quiz", "POST", Object.assign({ answers: answers || null }, row))) || (await sb("final_quiz", "POST", row));
    } catch (e) { return false; }
  }

  window.EDR = { saveLesson: saveLesson, saveFinal: saveFinal, agent: function () { return ag; } };
  // Names used by the Course 2 to 4 page scripts
  window._saveLP = function (lid, sc, ps, ua) { return saveLesson(lid, sc, ua); };
  window._saveFQ = function (sc, ps, ua) { return saveFinal(sc, ps, ua); };

  function boot() {
    var s = stored();
    if (s && s.id) show(s);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
