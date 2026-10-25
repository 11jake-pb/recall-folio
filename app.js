(function () {
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");
  var readBtn = document.getElementById("read-toggle");
  var coverBtn = document.getElementById("cover-toggle");
  var qaOpen = document.getElementById("qa-open");
  var qaClose = document.getElementById("qa-close");
  var qaPanel = document.getElementById("qa");
  var qaList = document.getElementById("qa-list");
  var progress = document.getElementById("progress");
  var mind = document.getElementById("mind");
  var sheet = document.getElementById("sheet");
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var sheets = Array.isArray(window.SHEETS) ? window.SHEETS : [];
  var visuals = window.VISUALS || {};
  var readMode = localStorage.getItem("recall-read") === "prose" ? "prose" : "picture";
  var groups = [
    { name: "건국", side: "left", color: "#8a3d2f", ids: ["wihwado", "four-no", "choi", "founding"] },
    { name: "왕권", side: "left", color: "#2f5d50", ids: ["taejong", "sejong", "sejo", "seongjong"] },
    { name: "제도", side: "left", color: "#3d4f7c", ids: ["central", "samsa", "local", "military", "school", "exam"] },
    { name: "대외", side: "right", color: "#8a5a2f", ids: ["diplomacy"] },
    { name: "사림", side: "right", color: "#6b3d6e", ids: ["hungu", "sarim", "sahwa-early", "eulsa", "lineage", "seowon", "faction"] },
    { name: "사회", side: "right", color: "#3d6a4a", ids: ["culture", "status"] }
  ];
  var shortName = {
    wihwado: "위화도", "four-no": "4불가", choi: "최영", founding: "건국",
    taejong: "태종", sejong: "세종", sejo: "세조", seongjong: "성종",
    central: "중앙", samsa: "3사", local: "지방", military: "군사", school: "교육", exam: "과거",
    diplomacy: "사대", hungu: "훈구", sarim: "사림", "sahwa-early": "사화", eulsa: "을사",
    lineage: "갈래", seowon: "서원", faction: "붕당", culture: "문화", status: "신분"
  };
  var order = [];
  var byId = {};
  var current = -1;
  var openGroup = "";
  var covered = false;
  var qaTimer = 0;

  sheets.forEach(function (item) { byId[item.id] = item; });
  groups.forEach(function (group) {
    group.ids.forEach(function (id) { if (byId[id]) order.push(id); });
  });

  function narrow() {
    return window.matchMedia("(max-width: 800px)").matches;
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

  function activeId() {
    return current >= 0 ? order[current] : "";
  }

  function groupOf(id) {
    for (var i = 0; i < groups.length; i++) {
      if (groups[i].ids.indexOf(id) >= 0) return groups[i];
    }
    return null;
  }

  function nodeButton(id) {
    var on = id === activeId();
    return '<button type="button" class="node" data-id="' + esc(id) + '"' +
      (on ? ' aria-current="true"' : "") + ">" + esc(shortName[id] || id) + "</button>";
  }

  function limb(group) {
    var nodes = '<div class="nodes">' + group.ids.filter(function (id) { return byId[id]; }).map(nodeButton).join("") + "</div>";
    var open = group.name === openGroup ? ' aria-current="true"' : "";
    var boi = '<button type="button" class="boi" data-group="' + esc(group.name) + '"' + open + ">" + esc(group.name) + "</button>";
    var stem = '<span class="stem" aria-hidden="true"></span>';
    var inner = group.side === "left" ? nodes + stem + boi : boi + stem + nodes;
    return '<div class="limb" style="--branch:' + group.color + '">' + inner + "</div>";
  }

  function renderMap() {
    var left = groups.filter(function (group) { return group.side === "left"; });
    var right = groups.filter(function (group) { return group.side === "right"; });
    if (narrow()) {
      var children = "";
      var selected = groups.filter(function (group) { return group.name === openGroup; })[0];
      if (selected) {
        children = '<div class="child-row" style="--branch:' + selected.color + '">' +
          selected.ids.filter(function (id) { return byId[id]; }).map(nodeButton).join("") + "</div>";
      }
      var bois = groups.map(function (group) {
        var open = group.name === openGroup ? ' aria-current="true"' : "";
        return '<button type="button" class="boi" style="--branch:' + group.color + '" data-group="' +
          esc(group.name) + '"' + open + ">" + esc(group.name) + "</button>";
      }).join("");
      mind.className = "mind is-narrow";
      mind.innerHTML = '<div class="boi-grid">' + bois + '</div><p class="core">조선 전기</p>' + children;
      return;
    }
    mind.className = "mind";
    mind.innerHTML = '<div class="wing left">' + left.map(limb).join("") + "</div>" +
      '<p class="core">조선 전기</p>' +
      '<div class="wing right">' + right.map(limb).join("") + "</div>";
  }

  function picture(item) {
    var visual = visuals[item.id] || {};
    var marks = visual.marks || item.points || [];
    var shape = visual.shape || "boxes";
    var body = marks.map(function (mark, index) {
      var arrow = shape === "flow" && index ? "<i>→</i>" : "";
      if (shape === "quad") return arrow + '<span><b>' + (index + 1) + "</b>" + esc(mark) + "</span>";
      if (shape === "split") return "<p>" + esc(mark) + "</p>";
      return arrow + "<span>" + esc(mark) + "</span>";
    }).join("");
    return '<div class="pic ' + esc(shape) + '">' + body + "</div>";
  }

  function renderSheet() {
    var id = activeId();
    if (!id || !byId[id]) {
      sheet.hidden = true;
      sheet.innerHTML = "";
      coverBtn.hidden = true;
      progress.textContent = "맵";
      return;
    }
    var item = byId[id];
    sheet.hidden = false;
    coverBtn.hidden = false;
    progress.textContent = (current + 1) + " / " + order.length;
    sheet.innerHTML = '<article class="card' + (covered ? " is-covered" : "") + '">' +
      '<p class="unit">' + esc(item.unit) + "</p>" +
      "<h2>" + esc(item.title) + "</h2>" +
      '<p class="summary">' + esc(item.summary) + "</p>" +
      picture(item) + "</article>";
    coverBtn.textContent = covered ? "그림 보기" : "그림 가리기";
    coverBtn.setAttribute("aria-expanded", covered ? "false" : "true");
  }

  function renderProse() {
    sheet.hidden = false;
    coverBtn.hidden = true;
    progress.textContent = "줄글";
    sheet.innerHTML = groups.map(function (group) {
      return group.ids.filter(function (id) { return byId[id]; }).map(function (id) {
        var item = byId[id];
        var visual = visuals[id] || {};
        return '<article class="prose-block">' +
          '<p class="unit">' + esc(group.name) + "</p>" +
          "<h2>" + esc(item.title) + "</h2>" +
          "<p>" + esc(visual.prose || item.summary) + "</p></article>";
      }).join("");
    }).join("");
  }

  function render() {
    var prose = readMode === "prose";
    document.body.classList.toggle("is-prose", prose);
    readBtn.textContent = prose ? "그림" : "줄글";
    readBtn.setAttribute("aria-pressed", prose ? "true" : "false");
    if (prose) renderProse();
    else {
      renderMap();
      renderSheet();
    }
    window.clearTimeout(qaTimer);
    qaTimer = window.setTimeout(runQa, 40);
  }

  function select(id) {
    var index = order.indexOf(id);
    if (index < 0) return;
    current = index;
    var group = groupOf(id);
    openGroup = group ? group.name : openGroup;
    render();
  }

  function runQa() {
    var prose = readMode === "prose";
    var pageFits = document.documentElement.scrollHeight <= window.innerHeight + 1;
    var clipped = false;
    Array.prototype.forEach.call(document.querySelectorAll(".node, .boi, .core, .child-row"), function (el) {
      if (el.scrollWidth > el.clientWidth + 2) clipped = true;
    });
    var title = sheet.querySelector("h2");
    var selected = byId[activeId()];
    var titleOk = !selected || (title && title.textContent === selected.title);
    var proseCount = document.querySelectorAll(".prose-block").length;
    var proseText = sheet.textContent || "";
    var schoolOk = proseText.indexOf("수도 경비") >= 0 && proseText.indexOf("서인은 이이") >= 0 && proseText.indexOf("원은 아직 멸망하지") >= 0;
    var checks = prose ? [
      ["줄글 24단락", proseCount === 24, String(proseCount)],
      ["맵은 숨음", mind.offsetParent === null || getComputedStyle(mind).display === "none", "mind"],
      ["학교 서술 유지", schoolOk, "한성부·최영·서인"],
      ["문장으로 읽힘", sheet.querySelectorAll(".prose-block p").length >= 24, "paragraph"]
    ] : [
      ["화면이 세로로 늘지 않음", pageFits, document.documentElement.scrollHeight + " / " + window.innerHeight],
      ["중심이 가운데 하나", document.querySelectorAll(".core").length === 1, "core " + document.querySelectorAll(".core").length],
      ["자료 24장", order.length === 24, String(order.length)],
      ["본문은 한 장 이하", document.querySelectorAll(".card").length <= 1, "card " + document.querySelectorAll(".card").length],
      ["제목이 선택과 같음", titleOk, selected ? selected.title : "선택 없음"],
      ["글자가 칸 밖으로 잘리지 않음", !clipped, clipped ? "잘림" : "없음"]
    ];
    var passed = checks.filter(function (item) { return item[1]; }).length;
    qaOpen.textContent = "QA " + passed + "/" + checks.length;
    qaOpen.classList.toggle("pass", passed === checks.length);
    qaOpen.classList.toggle("fail", passed !== checks.length);
    qaList.innerHTML = checks.map(function (item) {
      return "<li data-ok=\"" + (item[1] ? "yes" : "no") + "\"><span>" + (item[1] ? "통과" : "실패") + "</span>" +
        esc(item[0]) + "<small>" + esc(item[2]) + "</small></li>";
    }).join("");
  }

  toggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("recall-theme", next);
    applyTheme(next);
    render();
  });

  readBtn.addEventListener("click", function () {
    readMode = readMode === "prose" ? "picture" : "prose";
    localStorage.setItem("recall-read", readMode);
    render();
  });

  coverBtn.addEventListener("click", function () {
    covered = !covered;
    renderSheet();
    runQa();
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

  mind.addEventListener("click", function (event) {
    var node = event.target.closest(".node");
    if (node) {
      select(node.getAttribute("data-id"));
      return;
    }
    var boi = event.target.closest(".boi");
    if (!boi) return;
    var name = boi.getAttribute("data-group");
    openGroup = openGroup === name ? "" : name;
    if (narrow()) {
      render();
      return;
    }
    renderMap();
    runQa();
  });

  window.addEventListener("resize", function () { render(); });

  applyTheme(root.getAttribute("data-theme") || "light");
  render();
})();
