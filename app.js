(function () {
  var root = document.documentElement;
  var brand = document.getElementById("brand");
  var toggle = document.getElementById("theme-toggle");
  var readBtn = document.getElementById("read-toggle");
  var coverBtn = document.getElementById("cover-toggle");
  var qaOpen = document.getElementById("qa-open");
  var qaClose = document.getElementById("qa-close");
  var qaPanel = document.getElementById("qa");
  var qaList = document.getElementById("qa-list");
  var gate = document.getElementById("gate");
  var gateInput = document.getElementById("gate-input");
  var progress = document.getElementById("progress");
  var mind = document.getElementById("mind");
  var sheet = document.getElementById("sheet");
  var chaptersEl = document.getElementById("chapters");
  var learnEl = document.getElementById("view-learn");
  var examEl = document.getElementById("view-exam");
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var sheets = Array.isArray(window.SHEETS) ? window.SHEETS : [];
  var visuals = window.VISUALS || {};
  var chapters = window.CHAPTERS || [];
  var stories = window.STORIES || {};
  var shortName = window.SHORT || {};
  var lessons = window.LESSONS || [];
  var exams = mixExams(window.EXAMS || []);
  var pickedIndex = -1;

  function mixExams(source) {
    var buckets = { "전기": [], "전환": [], "후기": [] };
    source.forEach(function (exam, index) {
      var part = index < 2 ? "전기" : index === 2 ? "전환" : "후기";
      exam.questions.forEach(function (q) { buckets[part].push(q); });
    });
    var rounds = [];
    for (var i = 0; i < 5; i++) {
      var questions = buckets["전기"].splice(0, 4).concat(buckets["전환"].splice(0, 2), buckets["후기"].splice(0, 4));
      questions.forEach(function (q, index) { q.part = index < 4 ? "전기" : index < 6 ? "전환" : "후기"; });
      rounds.push({ id: "r" + (i + 1), title: "제" + (i + 1) + "회", questions: questions });
    }
    return rounds;
  }
  var byId = {};
  sheets.forEach(function (item) { byId[item.id] = item; });

  var tab = "map";
  var chapterId = localStorage.getItem("recall-chapter") || "early";
  var readMode = localStorage.getItem("recall-read") === "prose" ? "prose" : "picture";
  var openGroup = "";
  var current = "";
  var covered = false;
  var qaTimer = 0;
  var taps = 0;
  var tapTimer = 0;
  var lessonId = "";
  var step = 0;
  var locked = false;
  var learnLog = {};
  var examId = exams.length ? exams[0].id : "";
  var picks = [];
  var graded = false;
  try { learnLog = JSON.parse(localStorage.getItem("recall-learn") || "{}"); } catch (err) { learnLog = {}; }
  if (sessionStorage.getItem("recall-dev") === "1") document.body.classList.add("is-dev");

  function chapter() {
    for (var i = 0; i < chapters.length; i++) if (chapters[i].id === chapterId) return chapters[i];
    return chapters[0];
  }

  function groupOf(id) {
    var list = chapters;
    for (var c = 0; c < list.length; c++) {
      var groups = list[c].groups;
      for (var g = 0; g < groups.length; g++) {
        if (groups[g].ids.indexOf(id) >= 0) return groups[g];
      }
    }
    return null;
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    var dark = theme === "dark";
    toggle.textContent = dark ? "다크" : "라이트";
    toggle.setAttribute("aria-pressed", dark ? "true" : "false");
    if (themeMeta) themeMeta.setAttribute("content", dark ? "#16181d" : "#f4f1ea");
  }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function narrow() {
    return window.matchMedia("(max-width: 800px)").matches;
  }

  function angles(count) {
    if (count <= 1) return [0];
    if (count === 4) return [-140, -50, 40, 130];
    if (count === 5) return [-150, -75, 0, 70, 145];
    var start = -145;
    var step = 290 / (count - 1);
    var list = [];
    for (var i = 0; i < count; i++) list.push(Math.round(start + step * i));
    return list;
  }

  function picture(item) {
    var visual = visuals[item.id] || {};
    var marks = visual.marks || item.points || [];
    var shape = visual.shape || item.shape || "boxes";
    var body = marks.map(function (mark, index) {
      var arrow = shape === "flow" && index ? "<i>→</i>" : "";
      if (shape === "quad") return arrow + "<span><b>" + (index + 1) + "</b>" + esc(mark) + "</span>";
      if (shape === "split") return "<p>" + esc(mark) + "</p>";
      return arrow + "<span>" + esc(mark) + "</span>";
    }).join("");
    return '<div class="pic ' + esc(shape) + '">' + body + "</div>";
  }

  function bloom(id) {
    var item = byId[id];
    if (!item) return "";
    return '<article class="bloom' + (covered ? " is-covered" : "") + '"><h2>' + esc(item.title) + "</h2>" +
      picture(item) + '<p class="keep">' + esc(item.summary) + "</p></article>";
  }

  function renderChapters() {
    chaptersEl.innerHTML = chapters.map(function (item) {
      var on = item.id === chapterId ? ' aria-pressed="true"' : "";
      return '<button type="button" data-chapter="' + esc(item.id) + '"' + on + ">" + esc(item.name) + "</button>";
    }).join("");
  }

  function renderFlower() {
    var data = chapter();
    var list = angles(data.groups.length);
    mind.hidden = false;
    mind.innerHTML = '<div class="flower" aria-label="' + esc(data.core.replace("\n", " ")) + ' 마인드맵">' +
      data.groups.map(function (group, index) {
        var angle = list[index];
        var on = group.name === openGroup;
        return '<div class="arm' + (on ? " is-open" : "") + '" style="--a:' + angle + 'deg;--branch:' + group.color + '">' +
          '<span class="ray"></span>' +
          '<button type="button" class="petal" data-group="' + esc(group.name) + '"' + (on ? ' aria-current="true"' : "") + ">" + esc(group.name) + "</button></div>";
      }).join("") +
      (openGroup ? armChips(data) : "") +
      '<p class="core">' + esc(data.core).replace(/\n/g, "<br>") + "</p></div>";
    var group = null;
    data.groups.forEach(function (item) { if (item.name === openGroup) group = item; });
    if (!group) {
      sheet.hidden = true;
      sheet.innerHTML = "";
      coverBtn.hidden = true;
      progress.textContent = data.name;
      return;
    }
    sheet.hidden = false;
    coverBtn.hidden = !current;
    progress.textContent = data.name;
    coverBtn.textContent = covered ? "그림 보기" : "그림 가리기";
    sheet.innerHTML = '<div class="nest" style="--branch:' + group.color + '"><p class="nest-name">' + esc(group.name) + "</p>" +
      '<div class="nest-row">' + chipsFor(group) + "</div>" + nestBody(group) + "</div>";
    window.requestAnimationFrame(placeArmInfo);
  }

  function chipsFor(group) {
    return group.ids.map(function (id) {
      var on = id === current ? ' aria-current="true"' : "";
      return '<button type="button" class="node" data-id="' + esc(id) + '"' + on + ">" + esc(shortName[id] || id) + "</button>";
    }).join("");
  }

  function armChips(data) {
    var group = null;
    data.groups.forEach(function (item) { if (item.name === openGroup) group = item; });
    if (!group || narrow()) return "";
    return '<div class="arm-info">' + chipsFor(group) + "</div>";
  }

  function nestBody(group) {
    if (current && byId[current]) return bloom(current);
    return '<div class="facts">' + group.ids.map(function (id) {
      var item = byId[id];
      if (!item) return "";
      return "<p><b>" + esc(shortName[id] || item.title) + "</b> " + esc(item.summary) + "</p>";
    }).join("") + "</div>";
  }

  function placeArmInfo() {
    var info = document.querySelector(".arm-info");
    var petal = document.querySelector(".petal[aria-current='true']");
    var flower = document.querySelector(".flower");
    if (!info || !petal || !flower || narrow()) return;
    flower.style.marginTop = "";
    var fr = flower.getBoundingClientRect();
    var pr = petal.getBoundingClientRect();
    var cx = fr.width / 2;
    var cy = fr.height / 2;
    var px = pr.left - fr.left + pr.width / 2;
    var py = pr.top - fr.top + pr.height / 2;
    var dx = px - cx;
    var dy = py - cy;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len;
    var uy = dy / len;
    var hw = info.offsetWidth / 2;
    var hh = info.offsetHeight / 2;
    var reach = hw * Math.abs(ux) + hh * Math.abs(uy);
    var dist = Math.max(pr.width, pr.height) / 2 + reach + 14;
    var left = px + ux * dist;
    var top = py + uy * dist;
    var absLeft = fr.left + left;
    var absTop = fr.top + top;
    var minX = hw + 8;
    var maxX = window.innerWidth - hw - 8;
    var minY = headerLine() + hh + 6;
    var maxY = window.innerHeight - hh - 8;
    if (absLeft < minX || absLeft > maxX || absTop < minY || absTop > maxY) {
      left = px - uy * (hw + pr.width / 2 + 16);
      top = py + ux * (hh + pr.height / 2 + 16);
      absLeft = Math.max(minX, Math.min(maxX, fr.left + left));
      absTop = Math.max(minY, Math.min(maxY, fr.top + top));
      left = absLeft - fr.left;
      top = absTop - fr.top;
    }
    info.style.left = left + "px";
    info.style.top = top + "px";
    var chapters = document.querySelector(".chapters");
    if (!chapters) return;
    var gap = chapters.getBoundingClientRect().bottom + 10 - info.getBoundingClientRect().top;
    flower.style.marginTop = gap > 0 ? (8 + gap) + "px" : "";
  }

  function renderStory() {
    var data = chapter();
    var parts = stories[data.id] || [];
    mind.hidden = true;
    sheet.hidden = false;
    coverBtn.hidden = true;
    progress.textContent = "줄글";
    sheet.innerHTML = '<article class="story"><h2>' + esc(data.title) + "</h2>" +
      parts.map(function (part) {
        return '<p' + (part.lead ? ' class="lead"' : "") + ' data-group="' + esc(part.group) + '">' + esc(part.text) + "</p>";
      }).join("") + "</article>";
    var target = openGroup ? sheet.querySelector('[data-group="' + openGroup + '"]') : null;
    if (target) {
      var delta = target.getBoundingClientRect().top - headerLine();
      window.scrollTo(0, Math.max(0, window.scrollY + delta));
    } else window.scrollTo(0, 0);
  }

  function headerLine() {
    var bar = document.querySelector(".top");
    return (bar ? bar.offsetHeight : 0) + 12;
  }

  function renderMap() {
    renderChapters();
    if (readMode === "prose") renderStory();
    else renderFlower();
    readBtn.hidden = false;
    chaptersEl.hidden = false;
    readBtn.textContent = readMode === "prose" ? "그림" : "줄글";
    readBtn.setAttribute("aria-pressed", readMode === "prose" ? "true" : "false");
    document.body.classList.toggle("is-prose", readMode === "prose");
  }

  function lessonById(id) {
    for (var i = 0; i < lessons.length; i++) if (lessons[i].id === id) return lessons[i];
    return null;
  }

  function lessonOpen(index) {
    if (index === 0) return true;
    var prev = learnLog[lessons[index - 1].id];
    return !!(prev && prev.done);
  }

  function learnStats() {
    var done = 0;
    var correct = 0;
    lessons.forEach(function (lesson) {
      var log = learnLog[lesson.id];
      if (log && log.done) done += 1;
      if (log) correct += log.correct || 0;
    });
    return { done: done, total: lessons.length, correct: correct, pct: lessons.length ? Math.round(done / lessons.length * 100) : 0 };
  }

  function drillHtml() {
    if (!lessonId) {
      return '<div class="drill"><h2>길에서 칸을 고르면 문제가 나온다</h2><p class="why">앞 칸을 마치면 다음 칸이 열린다.</p></div>';
    }
    var lesson = lessonById(lessonId);
    if (!lesson) return "";
    var item = lesson.items[step];
    var log = learnLog[lesson.id] || { correct: 0, done: false };
    if (!item) {
      return '<div class="drill"><p class="kicker">' + esc(lesson.chapter) + "</p><h2>" + esc(lesson.title) + " 완료</h2>" +
        "<p>" + esc(String(log.correct)) + " / " + lesson.items.length + " 맞았다.</p>" +
        '<button type="button" id="lesson-back">다른 칸</button></div>';
    }
    return '<div class="drill"><p class="kicker">' + esc(lesson.chapter) + " · " + esc(lesson.title) + " · " + (step + 1) + " / " + lesson.items.length +
      '</p><h2>' + esc(item.q) + '</h2><div class="choices">' +
      item.choices.map(function (choice, index) {
        var cls = "choice";
        if (locked && index === item.answer) cls += " is-right";
        if (locked && index === pickedIndex && pickedIndex !== item.answer) cls += " is-wrong";
        return '<button type="button" class="' + cls + '" data-choice="' + index + '"' + (locked ? " disabled" : "") + ">" + esc(choice) + "</button>";
      }).join("") + "</div>" +
      (locked ? '<p class="why">' + esc(item.why) + '</p><button type="button" id="next-step">계속</button>' : "") +
      "</div>";
  }

  function renderLearn() {
    var stats = learnStats();
    progress.textContent = stats.pct + "%";
    readBtn.hidden = true;
    coverBtn.hidden = true;
    chaptersEl.hidden = true;
    var road = ["전기", "전환", "후기"].map(function (name) {
      var items = lessons.map(function (lesson, index) {
        if (lesson.chapter !== name) return "";
        var log = learnLog[lesson.id];
        var done = !!(log && log.done);
        var open = lessonOpen(index);
        var cls = "bead" + (done ? " is-done" : "") + (lesson.id === lessonId ? " is-current" : "") + (open ? "" : " is-locked");
        return '<li><button type="button" class="' + cls + '" data-lesson="' + esc(lesson.id) + '"' + (open ? "" : " disabled") + ">" +
          '<span class="bead-mark">' + (done ? "✓" : String(index + 1)) + "</span><span>" + esc(lesson.title) + "</span>" +
          (done ? "<small>" + log.correct + "/" + lesson.items.length + "</small>" : "") + "</button></li>";
      }).join("");
      return '<section class="road-era"><h3>' + name + "</h3><ol>" + items + "</ol></section>";
    }).join("");
    learnEl.innerHTML = '<div class="achieve"><p class="achieve-num">' + stats.pct +
      '%</p><div><p class="achieve-label">' + stats.done + "칸 완료 · 맞힌 " + stats.correct + "문제</p>" +
      '<div class="achieve-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + stats.pct +
      '"><span style="width:' + stats.pct + '%"></span></div></div></div>' +
      '<div class="learn-layout"><div class="road">' + road + "</div>" + drillHtml() + "</div>";
  }

  function examById(id) {
    for (var i = 0; i < exams.length; i++) if (exams[i].id === id) return exams[i];
    return exams[0];
  }

  function totalPoints(exam) {
    return exam.questions.reduce(function (sum, item) { return sum + item.points; }, 0);
  }

  function renderExam() {
    var exam = examById(examId);
    if (!exam) return;
    if (picks.length !== exam.questions.length) picks = exam.questions.map(function () { return -1; });
    progress.textContent = exam.title;
    readBtn.hidden = true;
    coverBtn.hidden = true;
    chaptersEl.hidden = true;
    var rounds = exams.map(function (item) {
      var on = item.id === exam.id ? ' aria-pressed="true"' : "";
      return '<button type="button" data-exam="' + esc(item.id) + '"' + on + ">" + esc(item.title) + "</button>";
    }).join("");
    var score = 0;
    var max = totalPoints(exam);
    if (graded) exam.questions.forEach(function (item, index) { if (picks[index] === item.answer) score += item.points; });
    var questions = exam.questions.map(function (item, index) {
      var chosen = picks[index];
      var state = graded ? (chosen === item.answer ? " is-right" : " is-wrong") : "";
      return '<section class="q-item' + state + '"><p class="q-stem"><b>' + (index + 1) + ".</b> (" + item.points + "점) " + esc(item.q) + '</p><ol class="q-opts">' +
        item.choices.map(function (choice, choiceIndex) {
          var mark = graded && choiceIndex === item.answer ? " is-key" : "";
          var bad = graded && chosen === choiceIndex && chosen !== item.answer ? " is-bad" : "";
          return '<li class="' + mark + bad + '"><label><input type="radio" name="q' + index + '" value="' + choiceIndex + '"' +
            (chosen === choiceIndex ? " checked" : "") + (graded ? " disabled" : "") + "><span>" + choiceMark(choiceIndex) + "</span> " + esc(choice) + "</label></li>";
        }).join("") + "</ol>" +
        (graded ? '<p class="why">' + esc(item.why) + "</p>" : "") + "</section>";
    }).join("");
    examEl.innerHTML = '<div class="exam-bar no-print"><div class="rounds">' + rounds + "</div></div>" +
      '<article class="paper-sheet" id="paper"><header class="paper-head"><p>3학년 역사</p><h2>' + esc(exam.title) + "</h2>" +
      "<p>문항 " + exam.questions.length + " · 만점 " + max + '점</p><p class="paper-meta">이름 ______________　점수 ' +
      (graded ? score + " / " + max : "______") + "</p></header>" + questions + "</article>" +
      '<div class="exam-actions no-print"><button type="button" id="grade-exam">채점</button>' +
      '<button type="button" id="reset-exam">다시 풀기</button>' +
      '<button type="button" id="print-exam">문제 인쇄</button>' +
      '<button type="button" id="print-omr">답안지 인쇄</button>' +
      '<button type="button" id="print-key"' + (graded ? "" : " disabled") + ">정답 인쇄</button></div>" +
      omrHtml(exam) + keyHtml(exam);
  }

  function choiceMark(index) {
    return ["①", "②", "③", "④", "⑤"][index] || String(index + 1);
  }

  function omrHtml(exam) {
    return '<article id="omr"><header class="print-head"><p>답안지 ' + esc(exam.title) + "</p><p>이름 __________ 점수 __________</p></header><ol class=\"bubbles\">" +
      exam.questions.map(function (item) {
        var marks = item.choices.map(function (_, index) { return "<span>" + choiceMark(index) + "</span>"; }).join("");
        return "<li>" + marks + "</li>";
      }).join("") + "</ol></article>";
  }

  function keyHtml(exam) {
    return '<article id="key"><header class="print-head"><p>정답 ' + esc(exam.title) + "</p><p>만점 " + totalPoints(exam) + "점</p></header><ol>" +
      exam.questions.map(function (item) {
        return "<li><strong>" + choiceMark(item.answer) + "</strong> " + esc(item.choices[item.answer]) +
          "<p>" + esc(item.why) + "</p></li>";
      }).join("") + "</ol></article>";
  }

  function show(name) {
    tab = name;
    document.body.dataset.tab = name;
    document.getElementById("sheet-title").textContent = name === "learn" ? "학습" : name === "exam" ? "모의" : "지도";
    document.body.classList.toggle("is-prose", name === "map" && readMode === "prose");
    document.body.classList.toggle("is-scroll", name !== "map" || readMode === "prose" || !!openGroup);
    document.body.classList.toggle("has-nest", name === "map" && !!openGroup);
    mind.parentElement.hidden = name !== "map";
    learnEl.hidden = name !== "learn";
    examEl.hidden = name !== "exam";
    Array.prototype.forEach.call(document.querySelectorAll("#tabs button"), function (button) {
      button.setAttribute("aria-pressed", button.getAttribute("data-tab") === name ? "true" : "false");
    });
    if (name === "map") renderMap();
    if (name === "learn") renderLearn();
    if (name === "exam") renderExam();
    window.clearTimeout(qaTimer);
    qaTimer = window.setTimeout(runQa, 40);
  }

  function runQa() {
    var corpus = "";
    Object.keys(stories).forEach(function (key) {
      (stories[key] || []).forEach(function (part) { corpus += part.text; });
    });
    var schoolOk = corpus.indexOf("수도 경비") >= 0 && corpus.indexOf("원은 아직 멸망하지") >= 0 && corpus.indexOf("서인은 이이") >= 0;
    var flower = document.querySelector(".flower");
    var compact = !flower || flower.getBoundingClientRect().width <= 680;
    var storyOk = readMode !== "prose" || tab !== "map" || (sheet.querySelectorAll(".story p").length >= 4 && !sheet.querySelector(".prose-block"));
    var examOk = exams.length === 5 && exams.every(function (exam) {
      var parts = {};
      var answersOk = exam.questions.every(function (item) {
        parts[item.part] = true;
        return item.answer >= 0 && item.answer < item.choices.length && item.why;
      });
      return exam.questions.length === 10 && answersOk && parts["전기"] && parts["전환"] && parts["후기"];
    });
    var learnOk = lessons.length >= 6 && lessons.every(function (lesson) {
      return lesson.items.every(function (item) { return item.answer >= 0 && item.answer < item.choices.length; });
    });
    var probe = document.createElement("div");
    probe.className = "stage";
    probe.hidden = true;
    document.body.appendChild(probe);
    var hiddenOk = getComputedStyle(probe).display === "none";
    probe.remove();
    var mapLeakOk = tab === "map" || getComputedStyle(document.getElementById("view-map")).display === "none";
    var learnRoadOk = tab !== "learn" || !!(learnEl.querySelector(".road") && learnEl.querySelector(".achieve"));
    var examPaperOk = tab !== "exam" || (!!examEl.querySelector(".paper-sheet") && !examEl.querySelector(".flower") && getComputedStyle(document.getElementById("view-map")).display === "none");
    var branchOk = true;
    if (tab === "map" && readMode !== "prose" && openGroup) {
      branchOk = (narrow() || !!document.querySelector(".arm-info")) && !!document.querySelector(".nest .facts, .nest .bloom");
    }
    var checks = [
      ["학교 서술 유지", schoolOk, "한성부·최영·서인"],
      ["맵이 가로로 길지 않음", compact, flower ? Math.round(flower.getBoundingClientRect().width) + "px" : "없음"],
      ["줄글은 한 편", storyOk, "story"],
      ["자료가 비지 않음", sheets.length >= 24, String(sheets.length)],
      ["모의는 세 시기를 담고 시험지", examOk && examPaperOk, String(exams.length)],
      ["학습은 길과 성취", learnOk && learnRoadOk, String(lessons.length)],
      ["중심이 하나", tab !== "map" || readMode === "prose" || document.querySelectorAll(".flower .core").length === 1, "core"],
      ["다른 탭에 지도가 안 남음", hiddenOk && mapLeakOk, hiddenOk ? "숨김" : "새어 나옴"],
      ["가지와 아래에 정보", branchOk, openGroup || "대기"]
    ];
    var passed = checks.filter(function (item) { return item[1]; }).length;
    qaOpen.textContent = "QA " + passed + "/" + checks.length;
    qaOpen.classList.toggle("pass", passed === checks.length);
    qaOpen.classList.toggle("fail", passed !== checks.length);
    qaList.innerHTML = checks.map(function (item) {
      return '<li data-ok="' + (item[1] ? "yes" : "no") + '"><span>' + (item[1] ? "통과" : "실패") + "</span>" +
        esc(item[0]) + "<small>" + esc(item[2]) + "</small></li>";
    }).join("");
  }

  function printMode(name) {
    document.body.classList.remove("print-exam", "print-omr", "print-key");
    document.body.classList.add(name);
    window.print();
  }

  brand.addEventListener("click", function () {
    taps += 1;
    window.clearTimeout(tapTimer);
    tapTimer = window.setTimeout(function () { taps = 0; }, 1600);
    if (taps < 5) return;
    taps = 0;
    gate.hidden = false;
    gateInput.value = "";
    gateInput.focus();
  });

  gate.addEventListener("submit", function (event) {
    event.preventDefault();
    if (gateInput.value === "110809") {
      document.body.classList.add("is-dev");
      sessionStorage.setItem("recall-dev", "1");
      gate.hidden = true;
      return;
    }
    gateInput.value = "";
    gate.hidden = true;
  });

  toggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("recall-theme", next);
    applyTheme(next);
  });

  document.getElementById("tabs").addEventListener("click", function (event) {
    var button = event.target.closest("[data-tab]");
    if (!button) return;
    show(button.getAttribute("data-tab"));
  });

  chaptersEl.addEventListener("click", function (event) {
    var button = event.target.closest("[data-chapter]");
    if (!button) return;
    chapterId = button.getAttribute("data-chapter");
    localStorage.setItem("recall-chapter", chapterId);
    openGroup = "";
    current = "";
    renderMap();
    runQa();
  });

  readBtn.addEventListener("click", function () {
    readMode = readMode === "prose" ? "picture" : "prose";
    localStorage.setItem("recall-read", readMode);
    show("map");
  });

  coverBtn.addEventListener("click", function () {
    covered = !covered;
    var card = sheet.querySelector(".bloom");
    if (card) card.classList.toggle("is-covered", covered);
    coverBtn.textContent = covered ? "그림 보기" : "그림 가리기";
  });

  mind.addEventListener("click", function (event) {
    var node = event.target.closest(".node");
    if (node) {
      var id = node.getAttribute("data-id");
      current = current === id ? "" : id;
      renderFlower();
      return;
    }
    var petal = event.target.closest(".petal");
    if (!petal) return;
    var name = petal.getAttribute("data-group");
    openGroup = openGroup === name ? "" : name;
    current = "";
    renderFlower();
    document.body.classList.toggle("is-scroll", !!openGroup);
    document.body.classList.toggle("has-nest", !!openGroup);
    runQa();
  });

  sheet.addEventListener("click", function (event) {
    var node = event.target.closest(".node");
    if (!node) return;
    var id = node.getAttribute("data-id");
    current = current === id ? "" : id;
    renderFlower();
  });

  learnEl.addEventListener("click", function (event) {
    var lessonButton = event.target.closest("[data-lesson]");
    if (lessonButton) {
      if (lessonButton.disabled) return;
      var nextLesson = lessonButton.getAttribute("data-lesson");
      var active = lessonById(lessonId);
      if (nextLesson === lessonId && active && step < active.items.length) return;
      lessonId = nextLesson;
      step = 0;
      locked = false;
      pickedIndex = -1;
      learnLog[lessonId] = { correct: 0, done: false };
      renderLearn();
      return;
    }
    if (event.target.id === "lesson-back") {
      lessonId = "";
      locked = false;
      pickedIndex = -1;
      renderLearn();
      return;
    }
    if (event.target.id === "next-step") {
      var lesson = lessonById(lessonId);
      step += 1;
      locked = false;
      pickedIndex = -1;
      if (lesson && step >= lesson.items.length) {
        learnLog[lesson.id] = learnLog[lesson.id] || { correct: 0, done: true };
        learnLog[lesson.id].done = true;
        localStorage.setItem("recall-learn", JSON.stringify(learnLog));
      }
      renderLearn();
      return;
    }
    var choice = event.target.closest("[data-choice]");
    if (!choice || locked) return;
    var currentLesson = lessonById(lessonId);
    var item = currentLesson.items[step];
    pickedIndex = Number(choice.getAttribute("data-choice"));
    locked = true;
    learnLog[currentLesson.id] = learnLog[currentLesson.id] || { correct: 0, done: false };
    if (pickedIndex === item.answer) learnLog[currentLesson.id].correct += 1;
    localStorage.setItem("recall-learn", JSON.stringify(learnLog));
    renderLearn();
  });

  examEl.addEventListener("change", function (event) {
    if (graded || event.target.type !== "radio") return;
    var name = event.target.name;
    var index = Number(name.replace("q", ""));
    picks[index] = Number(event.target.value);
  });

  examEl.addEventListener("click", function (event) {
    var round = event.target.closest("[data-exam]");
    if (round) {
      examId = round.getAttribute("data-exam");
      picks = [];
      graded = false;
      renderExam();
      return;
    }
    if (event.target.id === "grade-exam") {
      graded = true;
      renderExam();
      return;
    }
    if (event.target.id === "reset-exam") {
      picks = [];
      graded = false;
      renderExam();
      return;
    }
    if (event.target.id === "print-exam") printMode("print-exam");
    if (event.target.id === "print-omr") printMode("print-omr");
    if (event.target.id === "print-key" && graded) printMode("print-key");
  });

  qaOpen.addEventListener("click", function () {
    var open = qaPanel.hidden;
    qaPanel.hidden = !open;
    qaOpen.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) runQa();
  });
  qaClose.addEventListener("click", function () {
    qaPanel.hidden = true;
    qaOpen.setAttribute("aria-expanded", "false");
  });
  window.addEventListener("afterprint", function () {
    document.body.classList.remove("print-exam", "print-omr", "print-key");
  });
  window.addEventListener("resize", function () {
    if (tab === "map" && readMode !== "prose" && openGroup) renderFlower();
  });

  applyTheme(root.getAttribute("data-theme") || "light");
  show("map");
})();
