/* ============================================
   Yance · 个人主页 — 共享脚本
   导航交互 · 滚动出现 · Service Worker 注册
   ============================================ */
(function () {
  'use strict';

  /* —— 年份 —— */
  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

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
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { io.observe(el); });
  }

  /* —— Service Worker 注册（主页 + 全站生效） —— */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('service-worker.js').catch(function () {
        /* 注册失败静默处理，不影响浏览 */
      });
    });
  }
})();
