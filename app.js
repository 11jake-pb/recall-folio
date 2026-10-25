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
    { name: "건국", side: "left", color: "#8a3d2f", para: "P", paraName: "과제", ids: ["wihwado", "four-no", "choi", "founding"] },
    { name: "왕권", side: "left", color: "#2f5d50", para: "P", paraName: "과제", ids: ["taejong", "sejong", "sejo", "seongjong"] },
    { name: "제도", side: "left", color: "#3d4f7c", para: "A", paraName: "체제", ids: ["central", "samsa", "local", "military", "school", "exam"] },
    { name: "대외", side: "right", color: "#8a5a2f", para: "A", paraName: "체제", ids: ["diplomacy"] },
    { name: "사림", side: "right", color: "#6b3d6e", para: "R", paraName: "자료", ids: ["hungu", "sarim", "sahwa-early", "eulsa", "lineage", "seowon", "faction"] },
    { name: "사회", side: "right", color: "#3d6a4a", para: "A", paraName: "체제", ids: ["culture", "status"] }
  ];
  var itemPara = {
    culture: ["R", "자료"]
  };
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
  var scale = 1;
  var panX = 0;
  var panY = 0;
  var suppressClick = false;
  var SCALE_MIN = 0.75;
  var SCALE_MAX = 1.35;

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

  function paraOf(id) {
    if (itemPara[id]) return itemPara[id];
    var group = groupOf(id);
    return group ? [group.para, group.paraName] : ["R", "자료"];
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

  function bloom(id) {
    var item = byId[id];
    var para = paraOf(id);
    return '<article class="bloom' + (covered ? " is-covered" : "") + '">' +
      '<p class="kicker">' + esc(para[0]) + " " + esc(para[1]) + "</p>" +
      "<h2>" + esc(item.title) + "</h2>" +
      picture(item) +
      '<p class="keep">' + esc(item.summary) + "</p></article>";
  }

  function nodeButton(id) {
    var on = id === activeId();
    return '<button type="button" class="node" data-id="' + esc(id) + '"' +
      (on ? ' aria-current="true"' : "") + ">" + esc(shortName[id] || id) + "</button>";
  }

  function nodeWrap(id) {
    var open = id === activeId();
    return '<div class="node-wrap' + (open ? " is-open" : "") + '">' +
      nodeButton(id) + (open ? bloom(id) : "") + "</div>";
  }

  function branchBloom(group) {
    return '<div class="branch-bloom">' + group.ids.filter(function (id) { return byId[id]; }).map(bloom).join("") + "</div>";
  }

  function boiButton(group) {
    var open = group.name === openGroup ? ' aria-current="true"' : "";
    return '<button type="button" class="boi" data-group="' + esc(group.name) + '"' + open +
      ' title="' + esc(group.paraName) + '"><i class="para">' + esc(group.para) + "</i>" +
      esc(group.name) + "</button>";
  }

  function limb(group) {
    var showAll = openGroup === group.name && current < 0;
    var nodes = '<div class="nodes">' + group.ids.filter(function (id) { return byId[id]; }).map(function (id) {
      return nodeWrap(id);
    }).join("") + "</div>";
    var stem = '<span class="stem" aria-hidden="true"></span>';
    var boi = boiButton(group);
    var inner = group.side === "left" ? nodes + stem + boi : boi + stem + nodes;
    if (showAll) inner += branchBloom(group);
    return '<div class="limb' + (openGroup === group.name ? " is-open" : "") + '" style="--branch:' + group.color + '">' + inner + "</div>";
  }

  function hub() {
    return '<div class="hub"><p class="core">조선 전기<small>P · A · R</small></p></div>';
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function clampPan() {
    var lens = document.getElementById("lens");
    if (!lens) return;
    var extra = 0;
    var open = document.querySelector(".branch-bloom, .node-wrap.is-open .bloom");
    if (open) extra = open.offsetHeight * scale * 0.6;
    var limitX = Math.max(lens.clientWidth * 0.42, 160);
    var limitY = Math.max(lens.clientHeight * 0.42, extra, 160);
    panX = clamp(panX, -limitX, limitX);
    panY = clamp(panY, -limitY, limitY);
  }

  function applyTransform() {
    var world = document.getElementById("world");
    var readout = document.getElementById("zoom-readout");
    if (world) world.style.transform = "translate(" + panX.toFixed(1) + "px," + panY.toFixed(1) + "px) scale(" + scale.toFixed(3) + ")";
    if (readout) readout.textContent = Math.round(scale * 100) + "%";
  }

  function zoomAt(clientX, clientY, next) {
    var world = document.getElementById("world");
    if (!world) return;
    next = clamp(next, SCALE_MIN, SCALE_MAX);
    var rect = world.getBoundingClientRect();
    var vx = clientX - (rect.left + rect.width / 2);
    var vy = clientY - (rect.top + rect.height / 2);
    var ratio = next / scale;
    panX += vx * (1 - ratio);
    panY += vy * (1 - ratio);
    scale = next;
    clampPan();
    applyTransform();
  }

  function revealOpen() {
    var lens = document.getElementById("lens");
    var open = document.querySelector(".branch-bloom, .node-wrap.is-open .bloom, .stack-limb.is-open");
    if (!lens || !open) return;
    var lr = lens.getBoundingClientRect();
    var br = open.getBoundingClientRect();
    var dx = 0;
    var dy = 0;
    if (br.height > lr.height - 16) dy = lr.top + 8 - br.top;
    else if (br.top < lr.top + 8) dy = lr.top + 8 - br.top;
    else if (br.bottom > lr.bottom - 8) dy = lr.bottom - 8 - br.bottom;
    if (br.left < lr.left + 8) dx = lr.left + 8 - br.left;
    else if (br.right > lr.right - 8) dx = lr.right - 8 - br.right;
    if (!dx && !dy) return;
    panX += dx;
    panY += dy;
    clampPan();
    applyTransform();
  }

  function bindLens(lens) {
    var drag = null;
    lens.addEventListener("pointerdown", function (event) {
      if (event.target.closest("button, .bloom, .zoom-bar")) return;
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, px: panX, py: panY, moved: false };
      lens.setPointerCapture(event.pointerId);
      lens.classList.add("is-grabbing");
    });
    lens.addEventListener("pointermove", function (event) {
      if (!drag || event.pointerId !== drag.id) return;
      var dx = event.clientX - drag.x;
      var dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      panX = drag.px + dx;
      panY = drag.py + dy;
      clampPan();
      applyTransform();
    });
    function endDrag(event) {
      if (!drag || event.pointerId !== drag.id) return;
      lens.classList.remove("is-grabbing");
      if (drag.moved) suppressClick = true;
      drag = null;
    }
    lens.addEventListener("pointerup", endDrag);
    lens.addEventListener("pointercancel", endDrag);
    lens.addEventListener("wheel", function (event) {
      event.preventDefault();
      var dy = event.deltaY;
      if (event.deltaMode === 1) dy *= 16;
      var step = clamp(dy, -80, 80);
      zoomAt(event.clientX, event.clientY, scale * Math.exp(-step * 0.0022));
    }, { passive: false });
    document.getElementById("zoom-in").addEventListener("click", function () {
      var rect = lens.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, scale * 1.12);
    });
    document.getElementById("zoom-out").addEventListener("click", function () {
      var rect = lens.getBoundingClientRect();
      zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, scale / 1.12);
    });
  }

  function ensureFrame() {
    if (document.getElementById("lens")) return;
    mind.innerHTML = '<div class="lens" id="lens"><div class="world" id="world"></div>' +
      '<div class="zoom-bar"><button type="button" id="zoom-out">축소</button>' +
      '<span id="zoom-readout">100%</span><button type="button" id="zoom-in">확대</button></div></div>';
    bindLens(document.getElementById("lens"));
  }

  function renderMap() {
    ensureFrame();
    var world = document.getElementById("world");
    var left = groups.filter(function (group) { return group.side === "left"; });
    var right = groups.filter(function (group) { return group.side === "right"; });
    if (narrow()) {
      world.className = "world is-narrow";
      world.innerHTML = '<div class="stack">' + hub() + groups.map(function (group) {
        var showAll = openGroup === group.name && current < 0;
        var nodes = group.ids.filter(function (id) { return byId[id]; }).map(function (id) {
          return nodeWrap(id);
        }).join("");
        var open = openGroup === group.name;
        return '<section class="stack-limb' + (open ? " is-open" : "") + '" style="--branch:' + group.color + '">' +
          boiButton(group) +
          (open ? '<div class="nodes">' + nodes + "</div>" + (showAll ? branchBloom(group) : "") : "") +
          "</section>";
      }).join("") + "</div>";
    } else {
      world.className = "world";
      world.innerHTML = '<div class="wing left">' + left.map(limb).join("") + "</div>" +
        hub() +
        '<div class="wing right">' + right.map(limb).join("") + "</div>";
    }
    applyTransform();
    placeBlooms();
    window.requestAnimationFrame(revealOpen);
  }

  function placeBlooms() {
    var core = document.querySelector(".core");
    if (!core) return;
    var coreBox = core.getBoundingClientRect();
    var mid = coreBox.top + coreBox.height / 2;
    Array.prototype.forEach.call(document.querySelectorAll(".branch-bloom, .node-wrap.is-open .bloom"), function (el) {
      var anchor = el.closest(".limb") || el.closest(".node-wrap") || el;
      el.classList.toggle("is-up", anchor.getBoundingClientRect().top < mid);
    });
  }

  function renderChrome() {
    var open = current >= 0 || !!openGroup;
    sheet.hidden = true;
    sheet.innerHTML = "";
    coverBtn.hidden = !open;
    if (current >= 0) progress.textContent = (current + 1) + " / " + order.length;
    else if (openGroup) progress.textContent = openGroup;
    else progress.textContent = "맵";
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
        var para = paraOf(id);
        return '<article class="prose-block" id="p-' + esc(id) + '" data-id="' + esc(id) + '">' +
          '<p class="unit">' + esc(para[0]) + " " + esc(para[1]) + " · " + esc(group.name) + "</p>" +
          "<h2>" + esc(item.title) + "</h2>" +
          "<p>" + esc(visual.prose || item.summary) + "</p></article>";
      }).join("");
    }).join("");
  }

  function headerLine() {
    var bar = document.querySelector(".top");
    return (bar ? bar.offsetHeight : 0) + 8;
  }

  function visibleProseId() {
    var line = headerLine();
    var best = "";
    var bestDist = Infinity;
    Array.prototype.forEach.call(sheet.querySelectorAll(".prose-block"), function (block) {
      var dist = Math.abs(block.getBoundingClientRect().top - line);
      if (dist < bestDist) {
        bestDist = dist;
        best = block.getAttribute("data-id");
      }
    });
    return best;
  }

  function proseFocusId() {
    if (current >= 0) return activeId();
    var group = groups.filter(function (item) { return item.name === openGroup; })[0];
    return group ? group.ids[0] : "";
  }

  function render() {
    var prose = readMode === "prose";
    var focusId = prose ? proseFocusId() : "";
    document.body.classList.toggle("is-prose", prose);
    mind.hidden = prose;
    readBtn.textContent = prose ? "그림" : "줄글";
    readBtn.setAttribute("aria-pressed", prose ? "true" : "false");
    if (prose) renderProse();
    else {
      renderMap();
      renderChrome();
    }
    if (prose && focusId) {
      var target = document.getElementById("p-" + focusId);
      if (target) {
        var delta = target.getBoundingClientRect().top - headerLine();
        window.scrollTo(0, Math.max(0, window.scrollY + delta));
      }
    } else {
      window.scrollTo(0, 0);
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
    Array.prototype.forEach.call(document.querySelectorAll(".node, .boi, .core"), function (el) {
      if (el.scrollWidth > el.clientWidth + 2) clipped = true;
    });
    var selected = byId[activeId()];
    var openLimb = document.querySelector(".limb.is-open, .stack-limb.is-open");
    var titleOk = true;
    if (!prose && selected) {
      var heading = document.querySelector(".bloom h2");
      titleOk = !!(heading && heading.textContent === selected.title);
    } else if (!prose && openGroup) {
      var group = groups.filter(function (item) { return item.name === openGroup; })[0];
      var text = openLimb ? openLimb.textContent : "";
      titleOk = !!group && group.ids.every(function (id) { return text.indexOf(byId[id].title) >= 0; });
    }
    var proseCount = document.querySelectorAll(".prose-block").length;
    var proseText = sheet.textContent || "";
    var schoolOk = proseText.indexOf("수도 경비") >= 0 && proseText.indexOf("서인은 이이") >= 0 && proseText.indexOf("원은 아직 멸망하지") >= 0;
    var lens = document.getElementById("lens");
    var leftWing = document.querySelector(".wing.left");
    var rightWing = document.querySelector(".wing.right");
    var spreadOk = true;
    if (lens && leftWing && rightWing) {
      var lr = lens.getBoundingClientRect();
      var a = leftWing.getBoundingClientRect();
      var b = rightWing.getBoundingClientRect();
      spreadOk = a.left - lr.left < 40 && lr.right - b.right < 40;
    }
    var checks = prose ? [
      ["모드와 화면이 같음", mind.hidden === true, readMode],
      ["줄글 24단락", proseCount === 24, String(proseCount)],
      ["맵은 숨음", getComputedStyle(mind).display === "none", "mind"],
      ["학교 서술 유지", schoolOk, "한성부·최영·서인"],
      ["문장으로 읽힘", sheet.querySelectorAll(".prose-block p").length >= 24, "paragraph"]
    ] : [
      ["모드와 화면이 같음", mind.hidden === false && !document.body.classList.contains("is-prose"), readMode],
      ["화면이 세로로 늘지 않음", pageFits, document.documentElement.scrollHeight + " / " + window.innerHeight],
      ["중심이 가운데 하나", document.querySelectorAll(".core").length === 1, "core " + document.querySelectorAll(".core").length],
      ["자료 24장", order.length === 24, String(order.length)],
      ["그림은 맵 위", sheet.hidden === true && document.querySelectorAll(".card").length === 0, "sheet"],
      ["제목이 선택과 같음", titleOk, selected ? selected.title : (openGroup || "선택 없음")],
      ["확대 축소 범위", scale >= SCALE_MIN && scale <= SCALE_MAX, Math.round(scale * 100) + "%"],
      ["좌우를 채움", spreadOk || narrow(), narrow() ? "좁은 화면" : "desktop"],
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
    if (readMode === "prose") {
      var seen = visibleProseId();
      if (seen) current = Math.max(0, order.indexOf(seen));
      readMode = "picture";
    } else {
      readMode = "prose";
    }
    localStorage.setItem("recall-read", readMode);
    render();
  });

  coverBtn.addEventListener("click", function () {
    covered = !covered;
    Array.prototype.forEach.call(document.querySelectorAll(".bloom"), function (el) {
      el.classList.toggle("is-covered", covered);
    });
    coverBtn.textContent = covered ? "그림 보기" : "그림 가리기";
    coverBtn.setAttribute("aria-expanded", covered ? "false" : "true");
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
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    var node = event.target.closest(".node");
    if (node) {
      select(node.getAttribute("data-id"));
      return;
    }
    var boi = event.target.closest(".boi");
    if (!boi) return;
    var name = boi.getAttribute("data-group");
    if (openGroup === name && current < 0) openGroup = "";
    else {
      openGroup = name;
      current = -1;
    }
    render();
  });

  var wasNarrow = narrow();
  window.addEventListener("resize", function () {
    if (readMode === "prose") return;
    if (narrow() !== wasNarrow) {
      wasNarrow = narrow();
      renderMap();
    }
    runQa();
  });

  applyTheme(root.getAttribute("data-theme") || "light");
  render();
})();
