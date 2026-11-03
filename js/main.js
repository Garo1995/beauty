(function () {
  'use strict';

  var body = document.body;
  var header = document.querySelector('header');
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');

  /* ---------- Header: тень при прокрутке ---------- */
  function onScroll() {
    header.classList.toggle('scrolled', window.scrollY > 20);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Мобильное меню ---------- */
  function setMenu(open) {
    body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  }

  burger.addEventListener('click', function () {
    setMenu(!body.classList.contains('menu-open'));
  });

  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) setMenu(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  window.addEventListener('resize', function () {
    if (window.innerWidth > 960) setMenu(false);
  });

  /* ---------- Плавное появление при скролле ---------- */
  var targets = document.querySelectorAll(
    'section h2, section h2 + p, .label, .hero h1, .hero h1 + p, .buttons, .hero ul, .hero .container > img,' +
    '.services li, .advantages li, .masters li, .process li, .reviews li,' +
    '.prices .container > div > div, .prices .container > div + p, .about .container > img, .about .container > div > *,' +
    '.faq details, .request .container > div > *, form, .contacts .container > div > *, .contacts .container > img,' +
    'section > .container > .btn'
  );

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if ('IntersectionObserver' in window && !reduce) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        if (entry.target.matches('.about ul')) runCounters(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    targets.forEach(function (el) {
      /* ступенчатая задержка для элементов одной сетки */
      var siblings = el.parentElement ? Array.prototype.indexOf.call(el.parentElement.children, el) : 0;
      if (el.matches('li, details')) {
        el.style.transitionDelay = Math.min(siblings, 7) * 90 + 'ms';
        /* после появления убираем задержку, чтобы hover срабатывал сразу */
        el.addEventListener('transitionend', function clear(ev) {
          if (ev.propertyName !== 'opacity') return;
          el.style.transitionDelay = '';
          el.removeEventListener('transitionend', clear);
        });
      }
      el.classList.add('reveal');
      observer.observe(el);
    });
  } else {
    var stats = document.querySelector('.about ul');
    if (stats) runCounters(stats);
  }

  /* ---------- Счётчики в блоке «О нас» ---------- */
  function runCounters(scope) {
    scope.querySelectorAll('[data-count]').forEach(function (el) {
      var end = parseInt(el.getAttribute('data-count'), 10);
      if (reduce) { el.textContent = format(end); return; }
      var duration = 1600;
      var start = null;
      el.textContent = '0';
      function step(ts) {
        if (start === null) start = ts;
        var p = Math.min((ts - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = format(Math.round(end * eased));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  function format(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

  /* ---------- Форма заявки ---------- */
  var form = document.querySelector('form');
  var phone = form.elements.phone;
  var nameField = form.elements.name;
  var agree = form.elements.agree;
  var status = form.querySelector('[role="status"]');

  /* Маска телефона: +7 (999) 123-45-67, только цифры */
  function maskPhone(raw) {
    var digits = raw.replace(/\D/g, '');
    if (digits.charAt(0) === '7' || digits.charAt(0) === '8') digits = digits.slice(1);
    digits = digits.slice(0, 10);
    if (!digits) return '';

    var out = '+7 (' + digits.slice(0, 3);
    if (digits.length > 3) out += ') ' + digits.slice(3, 6);
    if (digits.length > 6) out += '-' + digits.slice(6, 8);
    if (digits.length > 8) out += '-' + digits.slice(8, 10);
    return out;
  }

  phone.addEventListener('input', function () {
    phone.value = maskPhone(phone.value);
    phone.classList.remove('invalid');
  });

  /* Не даём вводить буквы и символы */
  phone.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length > 1) return;
    if (!/\d/.test(e.key)) e.preventDefault();
  });

  [nameField, agree].forEach(function (el) {
    el.addEventListener('input', function () { el.classList.remove('invalid'); });
    el.addEventListener('change', function () { el.classList.remove('invalid'); });
  });

  function setStatus(text, type) {
    status.textContent = text;
    status.className = type || '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var errors = [];
    if (nameField.value.trim().length < 2) { nameField.classList.add('invalid'); errors.push(nameField); }
    if (phone.value.replace(/\D/g, '').length !== 11) { phone.classList.add('invalid'); errors.push(phone); }
    if (!agree.checked) { agree.classList.add('invalid'); errors.push(agree); }

    if (errors.length) {
      setStatus('Проверьте выделенные поля: имя, телефон и согласие.', 'error');
      errors[0].focus();
      return;
    }

    var button = form.querySelector('button');
    var label = button.textContent;
    button.disabled = true;
    button.textContent = 'Отправляем…';
    setStatus('');

    /* Адрес обработчика заявок: укажите атрибут data-endpoint у <form> в index.html
       (PHP-скрипт, Telegram-бот, CRM, Formspree и т.д.). Пока он не задан, форма
       работает в демо-режиме: проверка и маска есть, но данные никуда не уходят. */
    var endpoint = form.getAttribute('data-endpoint');
    var request = endpoint
      ? fetch(endpoint, { method: 'POST', body: new FormData(form) }).then(function (r) {
          if (!r.ok) throw new Error('bad status');
        })
      : new Promise(function (resolve) { setTimeout(resolve, 600); });

    request
      .then(function () {
        form.reset();
        setStatus('Спасибо! Заявка принята. Перезвоним в течение 15 минут.', 'success');
      })
      .catch(function () {
        setStatus('Не удалось отправить заявку. Позвоните нам: +7 (495) 000-00-00.', 'error');
      })
      .then(function () {
        button.disabled = false;
        button.textContent = label;
      });
  });
})();
