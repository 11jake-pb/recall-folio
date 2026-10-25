(function () {
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");
  var coverBtn = document.getElementById("cover-toggle");
  var progress = document.getElementById("progress");
  var nav = document.getElementById("nav");
  var sheet = document.getElementById("sheet");
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var sheets = Array.isArray(window.SHEETS) ? window.SHEETS : [];
  var groups = [
    { name: "건국", ids: ["wihwado", "four-no", "choi", "founding"] },
    { name: "왕권", ids: ["taejong", "sejong", "sejo", "seongjong"] },
    { name: "제도", ids: ["central", "samsa", "local", "military", "school", "exam"] },
    { name: "대외", ids: ["diplomacy"] },
    { name: "사림", ids: ["hungu", "sarim", "sahwa-early", "eulsa", "lineage", "seowon", "faction"] },
    { name: "사회", ids: ["culture", "status"] }
  ];
  var order = [];
  var byId = {};
  var current = 0;
  var covered = false;

  sheets.forEach(function (item) { byId[item.id] = item; });
  groups.forEach(function (group) {
    group.ids.forEach(function (id) {
      if (byId[id]) order.push(id);
    });
  });

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

  function paintCover() {
    var card = sheet.querySelector(".card");
    if (card) card.classList.toggle("is-covered", covered);
    coverBtn.textContent = covered ? "핵심 보기" : "핵심 가리기";
    coverBtn.setAttribute("aria-expanded", covered ? "false" : "true");
  }

  function render() {
    var activeId = order[current];
    progress.textContent = order.length ? (current + 1) + " / " + order.length : "0 / 0";

    nav.innerHTML = groups.map(function (group) {
      var nodes = group.ids.filter(function (id) { return byId[id]; }).map(function (id) {
        var item = byId[id];
        var on = id === activeId ? ' aria-current="true"' : "";
        return '<button type="button" class="node" data-id="' + esc(id) + '"' + on + ">" + esc(item.title) + "</button>";
      }).join("");
      return '<div class="branch"><p>' + esc(group.name) + "</p><div class=\"nodes\">" + nodes + "</div></div>";
    }).join("");

    var item = byId[activeId];
    if (!item) {
      sheet.innerHTML = '<p class="empty">자료가 없습니다.</p>';
      return;
    }
    var points = (item.points || []).map(function (point) {
      return "<li>" + esc(point) + "</li>";
    }).join("");
    sheet.innerHTML = '<article class="card">' +
      '<p class="unit">' + esc(item.unit) + "</p>" +
      "<h2>" + esc(item.title) + "</h2>" +
      '<p class="summary">' + esc(item.summary) + "</p>" +
      "<ol>" + points + "</ol></article>";
    paintCover();
  }

  toggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("recall-theme", next);
    applyTheme(next);
  });

  coverBtn.addEventListener("click", function () {
    covered = !covered;
    paintCover();
  });

  nav.addEventListener("click", function (event) {
    var node = event.target.closest(".node");
    if (!node) return;
    var index = order.indexOf(node.getAttribute("data-id"));
    if (index < 0) return;
    current = index;
    render();
  });

  applyTheme(root.getAttribute("data-theme") || "light");
  render();
})();
