(function () {
  var root = document.documentElement;
  var toggle = document.getElementById("theme-toggle");
  var coverAll = document.getElementById("cover-toggle");
  var progress = document.getElementById("progress");
  var nav = document.getElementById("nav");
  var sheet = document.getElementById("sheet");
  var themeMeta = document.querySelector('meta[name="theme-color"]');
  var sheets = Array.isArray(window.SHEETS) ? window.SHEETS : [];
  var current = 0;

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

  function cards() {
    return sheet.querySelectorAll(".card");
  }

  function setCover(card, covered) {
    card.classList.toggle("is-covered", covered);
    var button = card.querySelector(".reveal");
    if (!button) return;
    button.textContent = covered ? "핵심 보기" : "핵심 가리기";
    button.setAttribute("aria-expanded", covered ? "false" : "true");
  }

  function refreshCoverAll() {
    var list = cards();
    var covered = list.length > 0 && Array.prototype.every.call(list, function (card) {
      return card.classList.contains("is-covered");
    });
    coverAll.textContent = covered ? "모두 보기" : "모두 가리기";
  }

  function showProgress(index) {
    var list = cards();
    if (!list.length) return;
    current = Math.max(0, Math.min(index, list.length - 1));
    progress.textContent = (current + 1) + " / " + list.length;
    var links = nav.querySelectorAll("a");
    Array.prototype.forEach.call(links, function (link, linkIndex) {
      if (linkIndex === current) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    var link = links[current];
    if (link && nav.scrollWidth > nav.clientWidth) {
      var left = link.getBoundingClientRect().left - nav.getBoundingClientRect().left + nav.scrollLeft;
      nav.scrollTo({ left: Math.max(0, left - 12) });
    }
  }

  function render() {
    if (!sheets.length) {
      sheet.innerHTML = '<p class="empty">아직 자료가 없습니다.</p>';
      progress.textContent = "0 / 0";
      return;
    }

    nav.innerHTML = sheets.map(function (item) {
      return '<a href="#s-' + esc(item.id) + '"><span>' + esc(item.unit) + "</span>" + esc(item.title) + "</a>";
    }).join("");

    sheet.innerHTML = sheets.map(function (item) {
      var points = (item.points || []).map(function (point) {
        return "<li>" + esc(point) + "</li>";
      }).join("");
      return '<article class="card" id="s-' + esc(item.id) + '">' +
        '<p class="unit">' + esc(item.unit) + "</p>" +
        "<h2>" + esc(item.title) + "</h2>" +
        '<p class="summary">' + esc(item.summary) + "</p>" +
        '<button class="reveal" type="button" aria-expanded="true">핵심 가리기</button>' +
        "<ol>" + points + "</ol>" +
        "</article>";
    }).join("");

    showProgress(0);
    refreshCoverAll();

    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        var visible = entries.filter(function (entry) { return entry.isIntersecting; });
        if (!visible.length) return;
        visible.sort(function (a, b) { return b.intersectionRatio - a.intersectionRatio; });
        showProgress(Array.prototype.indexOf.call(cards(), visible[0].target));
      }, { rootMargin: "-30% 0px -45% 0px", threshold: [0.2, 0.6] });
      Array.prototype.forEach.call(cards(), function (card) { observer.observe(card); });
    }
  }

  toggle.addEventListener("click", function () {
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem("recall-theme", next);
    applyTheme(next);
  });

  coverAll.addEventListener("click", function () {
    var list = cards();
    var cover = !Array.prototype.every.call(list, function (card) {
      return card.classList.contains("is-covered");
    });
    Array.prototype.forEach.call(list, function (card) { setCover(card, cover); });
    refreshCoverAll();
  });

  sheet.addEventListener("click", function (event) {
    var button = event.target.closest(".reveal");
    if (!button) return;
    setCover(button.closest(".card"), button.getAttribute("aria-expanded") === "true");
    refreshCoverAll();
  });

  nav.addEventListener("click", function (event) {
    var link = event.target.closest("a");
    if (!link) return;
    var links = nav.querySelectorAll("a");
    showProgress(Array.prototype.indexOf.call(links, link));
  });

  applyTheme(root.getAttribute("data-theme") || "light");
  render();
})();
