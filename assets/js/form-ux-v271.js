/* Uredi v2.71 — resilient form UX helpers.
   Kept in a standalone file so character counters and conditional fields still work
   even if another feature bundle throws a runtime error. */
(() => {
  'use strict';

  const q = (s, r = document) => r.querySelector(s);
  const qa = (s, r = document) => Array.from(r.querySelectorAll(s));
  const countSymbols = value => Array.from(String(value ?? '')).length;

  function ensureCounter(el) {
    if (!el || !el.matches('[data-char-counter]')) return null;
    const max = Number(el.dataset.maxChars || el.getAttribute('maxlength') || 0);
    if (!Number.isFinite(max) || max <= 0) return null;

    let counter = el._urediCharCounter;
    if (!counter) {
      const next = el.nextElementSibling;
      if (next?.classList?.contains('char-counter')) counter = next;
    }
    if (!counter) {
      counter = document.createElement('div');
      counter.className = 'char-counter';
      counter.setAttribute('aria-live', 'polite');
      counter.setAttribute('aria-atomic', 'true');
      el.insertAdjacentElement('afterend', counter);
    }
    el._urediCharCounter = counter;
    if (el.matches('[data-chat-input]')) counter.classList.add('chat-char-counter');

    if (el.id) {
      counter.id ||= `${el.id}-char-counter`;
      const ids = (el.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
      if (!ids.includes(counter.id)) {
        ids.push(counter.id);
        el.setAttribute('aria-describedby', ids.join(' '));
      }
    }
    return counter;
  }

  function updateCounter(el) {
    const max = Number(el?.dataset?.maxChars || el?.getAttribute?.('maxlength') || 0);
    if (!el || !Number.isFinite(max) || max <= 0) return;

    // Count actual user-perceived Unicode code points. Spaces, punctuation and new lines
    // all count as characters as requested.
    let chars = Array.from(String(el.value ?? ''));
    if (chars.length > max) {
      chars = chars.slice(0, max);
      el.value = chars.join('');
    }
    const count = chars.length;
    const counter = ensureCounter(el);
    if (!counter) return;

    counter.textContent = `${count}/${max}`;
    counter.classList.toggle('is-near-limit', count >= Math.ceil(max * 0.9) && count < max);
    counter.classList.toggle('is-at-limit', count === max);
    counter.classList.remove('is-over-limit');
    el.classList.remove('char-limit-exceeded');
  }

  function cleanDigits(el) {
    if (!el?.matches('[data-digits-only]')) return;
    const max = Number(el.dataset.maxChars || el.getAttribute('maxlength') || 999);
    el.value = String(el.value || '').replace(/\D+/g, '').slice(0, max);
  }

  function bindCounter(el) {
    if (!el || el.dataset.counterBoundV271 === '1') {
      updateCounter(el);
      return;
    }
    el.dataset.counterBoundV271 = '1';
    const refresh = () => {
      cleanDigits(el);
      updateCounter(el);
    };
    el.addEventListener('input', refresh, true);
    el.addEventListener('change', refresh, true);
    el.addEventListener('blur', refresh, true);
    el.addEventListener('paste', () => setTimeout(refresh, 0), true);
    refresh();
  }

  function initCounters(root = document) {
    qa('[data-char-counter][data-max-chars]', root).forEach(bindCounter);
  }

  function syncOtherBrand({ focus = false } = {}) {
    const brand = q('[data-ad-brand]');
    const field = q('[data-other-brand-field]');
    const input = q('[data-other-brand-input]');
    if (!brand || !field || !input) return;

    const selectedText = brand.options?.[brand.selectedIndex]?.textContent?.trim() || '';
    const isOther = brand.value === 'Друга' || brand.value === 'Друга марка' || selectedText === 'Друга марка';

    field.hidden = !isOther;
    field.style.display = isOther ? 'block' : 'none';
    field.setAttribute('aria-hidden', isOther ? 'false' : 'true');
    input.disabled = !isOther;
    input.required = isOther;

    if (isOther) {
      input.setAttribute('data-smart-required', '');
      input.setAttribute('aria-required', 'true');
      bindCounter(input);
      if (focus) setTimeout(() => {
        try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
      }, 40);
    } else {
      input.removeAttribute('data-smart-required');
      input.removeAttribute('aria-required');
      input.value = '';
      updateCounter(input);
      input.closest('.field')?.classList.remove('field-error');
      input.closest('.field')?.querySelector('.field-error-message')?.remove();
    }
  }

  function init() {
    initCounters();
    syncOtherBrand();

    document.addEventListener('change', event => {
      if (event.target?.matches?.('[data-ad-brand]')) syncOtherBrand({ focus: true });
    }, true);
    document.addEventListener('input', event => {
      if (event.target?.matches?.('[data-ad-brand]')) syncOtherBrand({ focus: false });
    }, true);

    // If another script replaces/updates a form dynamically, attach counters to the
    // newly inserted controls without requiring a page reload.
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (!(node instanceof Element)) continue;
          if (node.matches?.('[data-char-counter][data-max-chars]')) bindCounter(node);
          initCounters(node);
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener('pageshow', () => {
      initCounters();
      syncOtherBrand();
    });
    setTimeout(() => { initCounters(); syncOtherBrand(); }, 250);
    setTimeout(() => { initCounters(); syncOtherBrand(); }, 1000);

    window.UrediFormUX = {
      refreshCounters: () => initCounters(),
      syncOtherBrand,
      countSymbols
    };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
