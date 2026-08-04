/* ============================================
   Yance · 个人主页 — 共享脚本 v3
   滚动进度 · 导航交互 · 3D 倾斜 · 光效跟随
   数字计数 · 荣誉入场 · 滚动出现 · Service Worker
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
    for (var ri = 0; ri < revealEls.length; ri++) revealEls[ri].classList.add('in');
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    for (var rj = 0; rj < revealEls.length; rj++) io.observe(revealEls[rj]);
  }

  /* —— 3D 卡片倾斜 + 光效跟随 —— */
  if (!reduced && window.matchMedia('(hover: hover)').matches) {
    var tiltEls = document.querySelectorAll('.gate, .card, .research-item, .score-card');
    tiltEls.forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'translateY(-6px) perspective(800px) rotateX(' + (-y * 4) + 'deg) rotateY(' + (x * 4) + 'deg)';
        /* 光效跟随 */
        el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        el.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* —— 研究卡片点击波纹 —— */
  var researchItems = document.querySelectorAll('.research-item');
  researchItems.forEach(function (el) {
    el.addEventListener('click', function (e) {
      var r = el.getBoundingClientRect();
      var ripple = document.createElement('span');
      ripple.className = 'research-ripple';
      var size = Math.max(r.width, r.height) * 0.6;
      ripple.style.width = size + 'px';
      ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - r.left) + 'px';
      ripple.style.top = (e.clientY - r.top) + 'px';
      el.appendChild(ripple);
      setTimeout(function () { ripple.remove(); }, 600);
    });
  });

  /* —— 荣誉卡片逐张入场 —— */
  var honorCards = document.querySelectorAll('.honor-card');
  if (honorCards.length) {
    if (reduced || !('IntersectionObserver' in window)) {
      for (var hc = 0; hc < honorCards.length; hc++) honorCards[hc].classList.add('in');
    } else {
      var honorIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            var delay = Array.from(honorCards).indexOf(el) % 8;
            setTimeout(function () { el.classList.add('in'); }, delay * 70);
            honorIO.unobserve(el);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
      for (var hj = 0; hj < honorCards.length; hj++) honorIO.observe(honorCards[hj]);
    }
  }

  /* —— 数字计数动画 —— */
  var countEls = document.querySelectorAll('[data-count]');
  if (countEls.length) {
    var animateCount = function (el) {
      var raw = el.getAttribute('data-count');
      var target = parseFloat(raw);
      var dur = 1200;
      var start = performance.now();
      var isFloat = raw.indexOf('.') !== -1;
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
      for (var ci = 0; ci < countEls.length; ci++) countEls[ci].textContent = countEls[ci].getAttribute('data-count');
    } else {
      var countIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCount(entry.target);
            countIO.unobserve(entry.target);
          }
        });
      }, { threshold: 0.5 });
      for (var cj = 0; cj < countEls.length; cj++) countIO.observe(countEls[cj]);
    }
  }

  /* —— Service Worker 注册 —— */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js').catch(function () {});
    });
  }
})();
