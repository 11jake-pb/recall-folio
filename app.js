(function () {
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");
  var nav = document.getElementById("nav");
  var sheet = document.getElementById("sheet");
  var title = document.getElementById("sheet-title");
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var sheets = Array.isArray(window.SHEETS) ? window.SHEETS : [];

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

  function render() {
    if (!sheets.length) {
      sheet.innerHTML = '<p class="empty">아직 자료가 없습니다.</p>';
      return;
    }

    nav.innerHTML = sheets.map(function (item, index) {
      return '<a href="#s-' + esc(item.id) + '"' + (index === 0 ? ' aria-current="true"' : "") + ">" +
        "<span>" + esc(item.unit) + "</span>" + esc(item.title) + "</a>";
    }).join("");

    sheet.innerHTML = sheets.map(function (item) {
      var points = (item.points || []).map(function (point) {
        return "<li>" + esc(point) + "</li>";
      }).join("");
      return '<article class="card" id="s-' + esc(item.id) + '">' +
        '<p class="unit">' + esc(item.unit) + "</p>" +
        "<h2>" + esc(item.title) + "</h2>" +
        '<p class="summary">' + esc(item.summary) + "</p>" +
        "<ol>" + points + "</ol>" +
        "</article>";
    }).join("");

    title.textContent = sheets[0].unit;
  }

  toggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("recall-theme", next);
    applyTheme(next);
  });

  nav.addEventListener("click", function (event) {
    var link = event.target.closest("a");
    if (!link) return;
    Array.prototype.forEach.call(nav.querySelectorAll("a"), function (item) {
      item.removeAttribute("aria-current");
    });
    link.setAttribute("aria-current", "true");
  });

  applyTheme(root.getAttribute("data-theme") || "light");
  render();
})();
