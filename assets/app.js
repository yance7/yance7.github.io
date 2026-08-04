/* ============================================
   Yance · 个人主页 — 共享脚本 v2
   滚动进度 · 导航交互 · 3D 倾斜 · 数字计数
   荣誉双排序 · 滚动出现 · Service Worker
   ============================================ */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* —— 年份 —— */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  /* —— 滚动进度条 —— */
  var progress = document.querySelector('.scroll-progress');
  if (progress) {
    var updateProgress = function () {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var p = max > 0 ? (h.scrollTop / max) * 100 : 0;
      progress.style.width = p + '%';
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress, { passive: true });
  }

  /* —— 导航滚动状态 —— */
  var nav = document.querySelector('.nav');
  if (nav) {
    var updateNav = function () {
      if (window.scrollY > 8) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    updateNav();
    window.addEventListener('scroll', updateNav, { passive: true });
  }

  /* —— 滚动出现 —— */
  var revealEls = document.querySelectorAll('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* —— 3D 卡片倾斜 —— */
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    var tiltEls = document.querySelectorAll('.gate, .card, .research-item, .score-card');
    tiltEls.forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'translateY(-6px) perspective(800px) rotateX(' + (-y * 4) + 'deg) rotateY(' + (x * 4) + 'deg)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* —— 数字计数动画 —— */
  var countEls = document.querySelectorAll('[data-count]');
  if (countEls.length) {
    var animateCount = function (el) {
      var target = parseFloat(el.getAttribute('data-count'));
      var dur = 1200;
      var start = performance.now();
      var isFloat = target % 1 !== 0;
      var step = function (now) {
        var t = Math.min((now - start) / dur, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        var val = target * eased;
        el.textContent = isFloat ? val.toFixed(1) : Math.round(val);
        if (t < 1) requestAnimationFrame(step);
        else el.textContent = isFloat ? target.toFixed(1) : target;
      };
      requestAnimationFrame(step);
    };
    if (reduced) {
      countEls.forEach(function (el) { el.textContent = el.getAttribute('data-count'); });
    } else {
      var countIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      countEls.forEach(function (el) { countIO.observe(el); });
    }
  }

  /* —— 荣誉双排序 —— */
  var honorList = document.querySelector('.honor-list');
  if (honorList) {
    var rows = Array.from(honorList.querySelectorAll('.honor-row'));
    var rowData = rows.map(function (row) {
      return {
        el: row,
        date: row.getAttribute('data-date') || '',
        weight: parseInt(row.getAttribute('data-weight') || '0', 10),
        level: row.querySelector('.honor-level') ? row.querySelector('.honor-level').textContent.trim() : ''
      };
    });

    var sortBtns = document.querySelectorAll('.sort-btn');
    var yearHeads = honorList.querySelectorAll('.honor-year-head');

    /* 按时间排序（默认，按年份分组） */
    function renderTimeline() {
      honorList.innerHTML = '';
      var byYear = {};
      rowData.forEach(function (d) {
        var yr = d.date.split('.')[0];
        if (!byYear[yr]) byYear[yr] = [];
        byYear[yr].push(d);
      });
      var years = Object.keys(byYear).sort(function (a, b) { return b - a; });
      years.forEach(function (yr) {
        var head = document.createElement('h2');
        head.className = 'honor-year-head';
        head.innerHTML = yr + ' <span class="count">' + byYear[yr].length + ' 项</span>';
        honorList.appendChild(head);
        byYear[yr].sort(function (a, b) { return b.date.localeCompare(a.date); });
        byYear[yr].forEach(function (d) {
          d.el.classList.add('flip');
          honorList.appendChild(d.el);
        });
      });
    }

    /* 按份量排序（按权重分组） */
    var tierNames = {
      100: '全球金奖 · 金级',
      90: '金级 · 银奖',
      80: '一等奖 · 铜奖',
      70: '全国铜奖 · 二等奖',
      60: '优秀奖 · 三等奖',
      50: '区域优秀奖'
    };
    function getTier(w) {
      if (w >= 95) return 100;
      if (w >= 85) return 90;
      if (w >= 75) return 80;
      if (w >= 65) return 70;
      if (w >= 55) return 60;
      return 50;
    }

    function renderWeight() {
      honorList.innerHTML = '';
      var byTier = {};
      rowData.forEach(function (d) {
        var t = getTier(d.weight);
        if (!byTier[t]) byTier[t] = [];
        byTier[t].push(d);
      });
      var tiers = Object.keys(byTier).sort(function (a, b) { return b - a; });
      tiers.forEach(function (t) {
        var head = document.createElement('h2');
        head.className = 'honor-year-head';
        head.innerHTML = tierNames[t] + ' <span class="count">' + byTier[t].length + ' 项</span>';
        honorList.appendChild(head);
        byTier[t].sort(function (a, b) { return b.date.localeCompare(a.date); });
        byTier[t].forEach(function (d) {
          d.el.classList.add('flip');
          honorList.appendChild(d.el);
        });
      });
    }

    sortBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        sortBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var mode = btn.getAttribute('data-sort');
        if (mode === 'weight') renderWeight();
        else renderTimeline();
      });
    });

    /* 初始按时间线渲染 */
    renderTimeline();
  }

  /* —— Service Worker 注册 —— */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js').catch(function () {});
    });
  }
})();
