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
  var exams = window.EXAMS || [];
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
        var on = group.name === openGroup ? ' aria-current="true"' : "";
        return '<div class="arm" style="--a:' + angle + 'deg;--branch:' + group.color + '">' +
          '<span class="ray"></span>' +
          '<button type="button" class="petal" data-group="' + esc(group.name) + '"' + on + ">" + esc(group.name) + "</button></div>";
      }).join("") +
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
    var chips = group.ids.map(function (id) {
      var on = id === current ? ' aria-current="true"' : "";
      return '<button type="button" class="node" data-id="' + esc(id) + '"' + on + ">" + esc(shortName[id] || id) + "</button>";
    }).join("");
    sheet.hidden = false;
    coverBtn.hidden = !current;
    progress.textContent = data.name + " · " + group.name;
    coverBtn.textContent = covered ? "그림 보기" : "그림 가리기";
    sheet.innerHTML = '<div class="nest"><p class="nest-name" style="--branch:' + group.color + '">' + esc(group.name) +
      '</p><div class="nest-row">' + chips + "</div>" + (current ? bloom(current) : "") + "</div>";
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

  function renderPath() {
    learnEl.innerHTML = '<ol class="path">' + lessons.map(function (lesson) {
      var log = learnLog[lesson.id];
      var done = log && log.done;
      return '<li><button type="button" class="step' + (done ? " done" : "") + '" data-lesson="' + esc(lesson.id) + '">' +
        "<small>" + esc(lesson.chapter) + "</small>" + esc(lesson.title) + "</button></li>";
    }).join("") + "</ol>";
  }

  function renderDrill() {
    var lesson = lessonById(lessonId);
    if (!lesson) return renderPath();
    var item = lesson.items[step];
    if (!item) {
      learnEl.innerHTML = '<div class="drill"><p class="kicker">' + esc(lesson.chapter) + "</p><h2>이 칸을 마쳤다</h2>" +
        "<p>" + esc(String(learnLog[lesson.id].correct)) + " / " + lesson.items.length + " 맞았다.</p>" +
        '<button type="button" id="lesson-back">길로 돌아가기</button></div>';
      return;
    }
    learnEl.innerHTML = '<div class="drill"><p class="kicker">' + esc(lesson.chapter) + " · " + (step + 1) + " / " + lesson.items.length +
      '</p><h2>' + esc(item.q) + '</h2><div class="choices">' +
      item.choices.map(function (choice, index) {
        return '<button type="button" class="choice" data-choice="' + index + '">' + esc(choice) + "</button>";
      }).join("") + "</div>" +
      (locked ? '<p class="why">' + esc(item.why) + '</p><button type="button" id="next-step">계속</button>' : "") +
      '<button type="button" id="lesson-back" class="text-btn">그만두기</button></div>';
  }

  function renderLearn() {
    progress.textContent = "학습";
    readBtn.hidden = true;
    coverBtn.hidden = true;
    chaptersEl.hidden = true;
    if (lessonId) renderDrill();
    else renderPath();
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
    var live = exam.questions.map(function (item, index) {
      var chosen = picks[index];
      return '<fieldset class="exam-q' + (graded ? (chosen === item.answer ? " is-right" : " is-wrong") : "") + '"><legend>' +
        (index + 1) + ". (" + item.points + "점)</legend><p>" + esc(item.q) + "</p>" +
        item.choices.map(function (choice, choiceIndex) {
          var mark = graded && choiceIndex === item.answer ? " is-key" : "";
          var bad = graded && chosen === choiceIndex && chosen !== item.answer ? " is-bad" : "";
          return '<label class="exam-choice' + mark + bad + '"><input type="radio" name="q' + index + '" value="' + choiceIndex + '"' +
            (chosen === choiceIndex ? " checked" : "") + (graded ? " disabled" : "") + "> " + esc(choice) + "</label>";
        }).join("") +
        (graded ? '<p class="why">' + esc(item.why) + "</p>" : "") + "</fieldset>";
    }).join("");
    var score = 0;
    if (graded) exam.questions.forEach(function (item, index) { if (picks[index] === item.answer) score += item.points; });
    examEl.innerHTML = '<div id="exam-live" class="no-print"><div class="rounds">' + rounds + "</div>" +
      "<h2>" + esc(exam.title) + " · " + esc(exam.focus) + "</h2>" +
      '<p class="exam-note">학교 원안과 같은 범위로 만든 회차이다. 만점 ' + totalPoints(exam) + "점.</p>" +
      (graded ? '<p class="score">' + score + " / " + totalPoints(exam) + "점</p>" : "") +
      "<form id=\"exam-form\">" + live + "</form>" +
      '<div class="exam-actions"><button type="button" id="grade-exam">채점</button>' +
      '<button type="button" id="reset-exam">다시 풀기</button>' +
      '<button type="button" id="print-exam">문제 인쇄</button>' +
      '<button type="button" id="print-omr">답안지 인쇄</button>' +
      '<button type="button" id="print-key"' + (graded ? "" : " disabled") + ">정답 인쇄</button></div></div>" +
      paperHtml(exam) + omrHtml(exam) + keyHtml(exam);
  }

  function choiceMark(index) {
    return ["①", "②", "③", "④", "⑤"][index] || String(index + 1);
  }

  function paperHtml(exam) {
    return '<article id="paper"><header class="print-head"><p>Recall Folio ' + esc(exam.title) + "</p><p>이름 __________</p></header><h2>" +
      esc(exam.focus) + "</h2><ol>" + exam.questions.map(function (item) {
        return "<li><p>(" + item.points + "점) " + esc(item.q) + "</p><ol>" +
          item.choices.map(function (choice) { return "<li>" + esc(choice) + "</li>"; }).join("") + "</ol></li>";
      }).join("") + "</ol></article>";
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
    document.body.classList.toggle("is-prose", name === "map" && readMode === "prose");
    document.body.classList.toggle("is-scroll", name !== "map" || readMode === "prose" || !!openGroup);
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
      return exam.questions.length === 10 && exam.questions.every(function (item) {
        return item.answer >= 0 && item.answer < item.choices.length && item.why;
      });
    });
    var learnOk = lessons.length >= 6 && lessons.every(function (lesson) {
      return lesson.items.every(function (item) { return item.answer >= 0 && item.answer < item.choices.length; });
    });
    var checks = [
      ["학교 서술 유지", schoolOk, "한성부·최영·서인"],
      ["맵이 가로로 길지 않음", compact, flower ? Math.round(flower.getBoundingClientRect().width) + "px" : "없음"],
      ["줄글은 한 편", storyOk, "story"],
      ["자료가 비지 않음", sheets.length >= 24, String(sheets.length)],
      ["모의 5회 정답 범위", examOk, String(exams.length)],
      ["학습 문항 정답 범위", learnOk, String(lessons.length)],
      ["중심이 하나", tab !== "map" || readMode === "prose" || document.querySelectorAll(".flower .core").length === 1, "core"]
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
      lessonId = lessonButton.getAttribute("data-lesson");
      step = 0;
      locked = false;
      learnLog[lessonId] = { correct: 0, done: false };
      renderDrill();
      return;
    }
    if (event.target.id === "lesson-back") {
      lessonId = "";
      locked = false;
      renderPath();
      return;
    }
    if (event.target.id === "next-step") {
      var lesson = lessonById(lessonId);
      step += 1;
      locked = false;
      if (lesson && step >= lesson.items.length) {
        learnLog[lesson.id] = learnLog[lesson.id] || { correct: 0, done: true };
        learnLog[lesson.id].done = true;
        localStorage.setItem("recall-learn", JSON.stringify(learnLog));
      }
      renderDrill();
      return;
    }
    var choice = event.target.closest("[data-choice]");
    if (!choice || locked) return;
    var lesson = lessonById(lessonId);
    var item = lesson.items[step];
    var picked = Number(choice.getAttribute("data-choice"));
    locked = true;
    learnLog[lesson.id] = learnLog[lesson.id] || { correct: 0, done: false };
    if (picked === item.answer) learnLog[lesson.id].correct += 1;
    localStorage.setItem("recall-learn", JSON.stringify(learnLog));
    renderDrill();
    Array.prototype.forEach.call(learnEl.querySelectorAll(".choice"), function (button) {
      var index = Number(button.getAttribute("data-choice"));
      button.disabled = true;
      if (index === item.answer) button.classList.add("is-right");
      if (index === picked && picked !== item.answer) button.classList.add("is-wrong");
    });
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

  applyTheme(root.getAttribute("data-theme") || "light");
  show("map");
})();
