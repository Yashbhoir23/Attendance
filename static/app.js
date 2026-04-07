/* ═══════════════════════════════════════════════════
   AttendEase – Application Logic
   localStorage persistence, mirrors the Python
   terminal app features: add, present/absent,
   bulk-add, insights, remove, reset.
   ═══════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── Constants ── */
  var STORE_KEY = "attendease_v2";

  /* ── DOM Cache ── */
  var $ = function (id) { return document.getElementById(id); };

  var el = {
    form:           $("add-subject-form"),
    input:          $("subject-input"),
    grid:           $("subjects-grid"),
    empty:          $("empty-state"),
    dashboard:      $("dashboard"),
    dashPct:        $("dash-pct"),
    dashTotal:      $("dash-total"),
    dashAttended:   $("dash-attended"),
    dashMissed:     $("dash-missed"),
    dashBarFill:    $("dash-bar-fill"),
    dashInsight:    $("dash-insight"),
    resetBtn:       $("reset-all-btn"),
    toasts:         $("toast-container"),
    /* Bulk modal */
    bulkOverlay:    $("bulk-modal-overlay"),
    bulkForm:       $("bulk-form"),
    bulkSubject:    $("bulk-modal-subject"),
    bulkTotal:      $("bulk-total"),
    bulkAttended:   $("bulk-attended"),
    bulkError:      $("bulk-error"),
    bulkCancel:     $("bulk-cancel"),
    /* Confirm modal */
    confirmOverlay: $("confirm-modal-overlay"),
    confirmTitle:   $("confirm-title"),
    confirmMsg:     $("confirm-message"),
    confirmCancel:  $("confirm-cancel"),
    confirmOk:      $("confirm-ok")
  };

  /* ══════════════════════════════════════════════════
     Data Layer (localStorage)
     ══════════════════════════════════════════════════ */

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) { return JSON.parse(raw); }
    } catch (_) { /* corrupt – reset */ }
    return { subjects: {} };
  }

  function save() {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  }

  var data = load();

  /* ══════════════════════════════════════════════════
     Helpers
     ══════════════════════════════════════════════════ */

  function escHtml(s) {
    var d = document.createElement("div");
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  }

  function titleCase(s) {
    return s.replace(/\w\S*/g, function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    });
  }

  function pctClass(p) {
    if (p >= 75) return "safe";
    if (p >= 60) return "warn";
    return "danger";
  }

  /**
   * Mirrors the Python terminal insight logic:
   *  ≥75 %  → "You can miss X more lecture(s) and stay ≥75%."
   *  <75 %  → "Attend X consecutive lectures to reach 75%."
   *  no data → "No lectures recorded yet."
   */
  function insight(attended, total) {
    if (total === 0) {
      return { text: "No lectures recorded yet.", cls: "" };
    }
    var p = (attended / total) * 100;
    if (p >= 75) {
      var canMiss = Math.floor((attended - 0.75 * total) / 0.75);
      if (canMiss < 0) { canMiss = 0; }
      return {
        text: "You can miss " + canMiss + " more lecture" + (canMiss !== 1 ? "s" : "") + " and stay ≥75%.",
        cls: "safe"
      };
    }
    var need = Math.ceil((0.75 * total - attended) / 0.25);
    if (need < 0) { need = 0; }
    return {
      text: "Attend " + need + " consecutive lecture" + (need !== 1 ? "s" : "") + " to reach 75%.",
      cls: "danger"
    };
  }

  /* ══════════════════════════════════════════════════
     Toast
     ══════════════════════════════════════════════════ */

  function toast(msg, type) {
    type = type || "success";
    var t = document.createElement("div");
    t.className = "toast toast-" + type;
    var icons = { success: "✓", error: "✗", info: "ℹ" };
    t.textContent = (icons[type] || "") + "  " + msg;
    el.toasts.appendChild(t);
    setTimeout(function () {
      t.classList.add("exit");
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
    }, 2400);
  }

  /* ══════════════════════════════════════════════════
     Confirm Modal (promise-based)
     ══════════════════════════════════════════════════ */

  var confirmResolve = null;

  function confirm(title, message, btnLabel) {
    el.confirmTitle.textContent = title;
    el.confirmMsg.textContent = message;
    el.confirmOk.textContent = btnLabel || "Delete";
    el.confirmOverlay.classList.add("open");
    return new Promise(function (res) { confirmResolve = res; });
  }

  function closeConfirm(val) {
    el.confirmOverlay.classList.remove("open");
    if (confirmResolve) { confirmResolve(val); confirmResolve = null; }
  }

  el.confirmCancel.addEventListener("click", function () { closeConfirm(false); });
  el.confirmOk.addEventListener("click", function ()     { closeConfirm(true); });
  el.confirmOverlay.addEventListener("click", function (e) {
    if (e.target === el.confirmOverlay) { closeConfirm(false); }
  });

  /* ══════════════════════════════════════════════════
     Bulk-Add Modal
     ══════════════════════════════════════════════════ */

  var bulkTarget = null;

  function openBulkModal(name) {
    bulkTarget = name;
    el.bulkSubject.textContent = name;
    el.bulkTotal.value = "";
    el.bulkAttended.value = "";
    el.bulkError.textContent = "";
    el.bulkOverlay.classList.add("open");
    setTimeout(function () { el.bulkTotal.focus(); }, 100);
  }

  function closeBulkModal() {
    el.bulkOverlay.classList.remove("open");
    bulkTarget = null;
  }

  el.bulkCancel.addEventListener("click", closeBulkModal);
  el.bulkOverlay.addEventListener("click", function (e) {
    if (e.target === el.bulkOverlay) { closeBulkModal(); }
  });

  el.bulkForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var t = parseInt(el.bulkTotal.value, 10);
    var a = parseInt(el.bulkAttended.value, 10);

    /* Validation – matches Python terminal logic */
    if (isNaN(t) || isNaN(a)) {
      el.bulkError.textContent = "Please enter valid numbers.";
      return;
    }
    if (t <= 0) {
      el.bulkError.textContent = "Total must be at least 1.";
      return;
    }
    if (a < 0) {
      el.bulkError.textContent = "Attended cannot be negative.";
      return;
    }
    if (a > t) {
      el.bulkError.textContent = "Attended cannot exceed total lectures.";
      return;
    }

    if (!bulkTarget || !data.subjects[bulkTarget]) { closeBulkModal(); return; }

    data.subjects[bulkTarget].total += t;
    data.subjects[bulkTarget].attended += a;
    save();
    closeBulkModal();
    updateCard(bulkTarget);
    renderDashboard();
    toast("Added " + t + " lectures (" + a + " present, " + (t - a) + " absent) to " + bulkTarget);
  });

  /* ══════════════════════════════════════════════════
     Rendering
     ══════════════════════════════════════════════════ */

  function renderAll() {
    renderDashboard();
    renderGrid();
    toggleEmpty();
  }

  function toggleEmpty() {
    var has = Object.keys(data.subjects).length > 0;
    el.empty.style.display = has ? "none" : "block";
    el.dashboard.style.display = has ? "block" : "none";
  }

  /* ── Dashboard ── */
  function renderDashboard() {
    var keys = Object.keys(data.subjects);
    var tAll = 0, aAll = 0;
    for (var i = 0; i < keys.length; i++) {
      tAll += data.subjects[keys[i]].total;
      aAll += data.subjects[keys[i]].attended;
    }
    var p = tAll > 0 ? (aAll / tAll) * 100 : 0;
    var cls = pctClass(p);

    el.dashPct.textContent = p.toFixed(1) + "%";
    el.dashPct.className = "dash-value pct-" + cls;
    el.dashTotal.textContent = tAll;
    el.dashAttended.textContent = aAll;
    el.dashMissed.textContent = tAll - aAll;
    el.dashBarFill.style.width = p.toFixed(1) + "%";

    var ins = insight(aAll, tAll);
    el.dashInsight.textContent = ins.text;
    el.dashInsight.className = "dash-insight " + ins.cls;
  }

  /* ── Grid ── */
  function renderGrid() {
    el.grid.innerHTML = "";
    var keys = Object.keys(data.subjects);
    for (var i = 0; i < keys.length; i++) {
      el.grid.appendChild(buildCard(keys[i], i));
    }
  }

  /* ── Build a single card ── */
  function buildCard(name, idx) {
    var s = data.subjects[name];
    var t = s.total, a = s.attended, m = t - a;
    var p = t > 0 ? (a / t) * 100 : 0;
    var cls = pctClass(p);
    var ins = insight(a, t);

    var card = document.createElement("div");
    card.className = "subject-card " + cls;
    card.setAttribute("data-name", name);
    if (idx !== undefined) { card.style.animationDelay = (idx * 0.04) + "s"; }

    card.innerHTML =
      '<div class="card-top">' +
        '<h3 class="card-name">' + escHtml(name) + '</h3>' +
        '<div class="card-actions">' +
          '<button class="btn-icon btn-icon-danger" data-act="delete" title="Remove">' +
            '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="card-stats">' +
        '<div class="cs"><span class="cs-label">Present</span><span class="cs-val green" data-f="attended">' + a + '</span></div>' +
        '<div class="cs"><span class="cs-label">Absent</span><span class="cs-val red" data-f="missed">' + m + '</span></div>' +
        '<div class="cs"><span class="cs-label">Total</span><span class="cs-val" data-f="total">' + t + '</span></div>' +
        '<div class="card-pct"><span class="pct-num ' + cls + '" data-f="pct">' + p.toFixed(1) + '%</span></div>' +
      '</div>' +
      '<div class="card-bar"><div class="card-bar-fill ' + cls + '" data-f="bar" style="width:' + p.toFixed(1) + '%"></div></div>' +
      '<div class="card-tip ' + ins.cls + '" data-f="tip">' + ins.text + '</div>' +
      '<div class="card-btns">' +
        '<button class="btn-p" data-act="present">✓ Present</button>' +
        '<button class="btn-a" data-act="absent">✗ Absent</button>' +
        '<button class="btn-b" data-act="bulk">+ Bulk</button>' +
      '</div>';

    /* Delegate clicks */
    card.addEventListener("click", function (e) {
      var btn = e.target.closest("[data-act]");
      if (!btn) return;
      var act = btn.getAttribute("data-act");
      if (act === "present")  { ripple(btn, e); markPresent(name); }
      else if (act === "absent") { ripple(btn, e); markAbsent(name); }
      else if (act === "bulk")   { openBulkModal(name); }
      else if (act === "delete") { removeSubject(name); }
    });

    return card;
  }

  /* ── Update card in-place (no full re-render) ── */
  function updateCard(name) {
    var card = el.grid.querySelector('[data-name="' + name + '"]');
    if (!card) { renderGrid(); toggleEmpty(); return; }

    var s = data.subjects[name];
    if (!s) return;
    var t = s.total, a = s.attended, m = t - a;
    var p = t > 0 ? (a / t) * 100 : 0;
    var cls = pctClass(p);
    var ins = insight(a, t);

    /* Update class on card for top-bar color */
    card.className = "subject-card " + cls;

    /* Stat values */
    card.querySelector('[data-f="attended"]').textContent = a;
    card.querySelector('[data-f="missed"]').textContent = m;
    card.querySelector('[data-f="total"]').textContent = t;

    /* Percentage */
    var pctEl = card.querySelector('[data-f="pct"]');
    pctEl.textContent = p.toFixed(1) + "%";
    pctEl.className = "pct-num " + cls;

    /* Progress bar */
    var bar = card.querySelector('[data-f="bar"]');
    bar.style.width = p.toFixed(1) + "%";
    bar.className = "card-bar-fill " + cls;

    /* Insight */
    var tipEl = card.querySelector('[data-f="tip"]');
    tipEl.textContent = ins.text;
    tipEl.className = "card-tip " + ins.cls;
  }

  /* ══════════════════════════════════════════════════
     Actions
     ══════════════════════════════════════════════════ */

  /* Add subject */
  function addSubject(rawName) {
    rawName = rawName.trim();
    if (!rawName) { toast("Please enter a subject name.", "error"); return; }

    var name = titleCase(rawName);
    if (data.subjects[name]) { toast('"' + name + '" already exists.', "error"); return; }

    data.subjects[name] = { total: 0, attended: 0 };
    save();
    renderAll();
    toast('Added "' + name + '"');
    el.input.value = "";
    el.input.focus();
  }

  /* Mark present */
  function markPresent(name) {
    if (!data.subjects[name]) return;
    data.subjects[name].total += 1;
    data.subjects[name].attended += 1;
    save();
    updateCard(name);
    renderDashboard();

    var s = data.subjects[name];
    var p = ((s.attended / s.total) * 100).toFixed(1);
    toast("Present — " + name + " is now at " + p + "%", "success");
  }

  /* Mark absent */
  function markAbsent(name) {
    if (!data.subjects[name]) return;
    data.subjects[name].total += 1;
    save();
    updateCard(name);
    renderDashboard();

    var s = data.subjects[name];
    var p = ((s.attended / s.total) * 100).toFixed(1);
    toast("Absent — " + name + " is now at " + p + "%", "info");
  }

  /* Remove subject */
  function removeSubject(name) {
    confirm("Remove Subject", 'Delete "' + name + '" and all its attendance data?', "Remove").then(function (ok) {
      if (!ok) return;
      var card = el.grid.querySelector('[data-name="' + name + '"]');
      if (card) {
        card.classList.add("removing");
        setTimeout(function () {
          delete data.subjects[name];
          save();
          renderAll();
          toast('Removed "' + name + '"', "info");
        }, 300);
      } else {
        delete data.subjects[name];
        save();
        renderAll();
        toast('Removed "' + name + '"', "info");
      }
    });
  }

  /* Reset all */
  function resetAll() {
    if (Object.keys(data.subjects).length === 0) {
      toast("Nothing to reset.", "info");
      return;
    }
    confirm("Reset All Data", "This will permanently delete ALL subjects and attendance records.", "Reset All").then(function (ok) {
      if (!ok) return;
      data.subjects = {};
      save();
      renderAll();
      toast("All data has been reset.", "info");
    });
  }

  /* Ripple effect */
  function ripple(btn, e) {
    var rect = btn.getBoundingClientRect();
    var r = document.createElement("span");
    r.className = "ripple-circle";
    var sz = Math.max(rect.width, rect.height);
    r.style.width = r.style.height = sz + "px";
    r.style.left = (e.clientX - rect.left - sz / 2) + "px";
    r.style.top = (e.clientY - rect.top - sz / 2) + "px";
    btn.appendChild(r);
    setTimeout(function () { if (r.parentNode) r.parentNode.removeChild(r); }, 500);
  }

  /* ══════════════════════════════════════════════════
     Event Listeners
     ══════════════════════════════════════════════════ */

  el.form.addEventListener("submit", function (e) {
    e.preventDefault();
    addSubject(el.input.value);
  });

  el.resetBtn.addEventListener("click", resetAll);

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    if (el.confirmOverlay.classList.contains("open")) { closeConfirm(false); }
    if (el.bulkOverlay.classList.contains("open"))    { closeBulkModal(); }
  });

  /* ── Boot ── */
  renderAll();

})();
