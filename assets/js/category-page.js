(() => {
  'use strict';

  const CATEGORIES = [
    'Перални',
    'Сушилни',
    'Перални със сушилни',
    'Хладилници',
    'Фризери',
    'Съдомиялни',
    'Фурни',
    'Готварски печки',
    'Котлони',
    'Аспиратори',
    'Микровълнови',
    'Климатици',
    'Бойлери',
    'Друга бяла техника'
  ];

  const ALIASES = new Map([
    ['печки', 'Готварски печки'],
    ['готварска печка', 'Готварски печки'],
    ['готварски печки', 'Готварски печки'],
    ['пералня', 'Перални'],
    ['сушилня', 'Сушилни'],
    ['хладилник', 'Хладилници'],
    ['фризер', 'Фризери'],
    ['съдомиялна', 'Съдомиялни'],
    ['фурна', 'Фурни'],
    ['котлон', 'Котлони'],
    ['аспиратор', 'Аспиратори'],
    ['микровълнова', 'Микровълнови'],
    ['климатик', 'Климатици'],
    ['бойлер', 'Бойлери']
  ]);

  const norm = value => (value || '')
    .toString()
    .trim()
    .toLocaleLowerCase('bg-BG');

  const canonical = value => {
    const raw = (value || '').toString().trim();
    if (!raw) return '';
    const aliased = ALIASES.get(norm(raw));
    if (aliased) return aliased;
    return CATEGORIES.find(c => norm(c) === norm(raw)) || raw;
  };

  const start = () => {
    if (document.body?.dataset?.landingKind !== 'category') return;

    const params = new URLSearchParams(location.search);
    const requested = canonical(params.get('name') || params.get('category') || '');
    const category = CATEGORIES.includes(requested) ? requested : '';
    const brand = (params.get('brand') || '').trim();

    const rows = [...document.querySelectorAll('.listing-list .listing-row')];
    const categoryFilter = document.querySelector('#categoryFilter');
    const brandFilter = document.querySelector('#brandFilter');
    const title = document.querySelector('[data-landing-title]');
    const subtitle = document.querySelector('[data-landing-subtitle]');
    const breadcrumb = document.querySelector('.breadcrumb span:last-child');
    const resultCount = document.querySelector('[data-result-count]');
    const zero = document.querySelector('[data-zero-results]');
    const loadMore = document.querySelector('[data-load-more]');

    // Keep the visible heading truthful.
    if (category) {
      const heading = brand ? `${category} ${brand}` : category;
      if (title) title.textContent = heading;
      if (subtitle) {
        subtitle.textContent = `Актуални обяви за ${heading.toLocaleLowerCase('bg-BG')}.`;
      }
      if (breadcrumb) breadcrumb.textContent = category;
      document.title = `${heading} · Пазар за бяла техника`;
    }

    // Lock the category control to the URL category.
    if (category && categoryFilter) {
      const option = [...categoryFilter.options].find(o => canonical(o.value || o.textContent) === category);
      if (option) categoryFilter.value = option.value;
      categoryFilter.disabled = true;
      categoryFilter.dataset.routeLocked = '1';
      categoryFilter.setAttribute('aria-label', `Категория: ${category}`);
    }

    // Brand from the URL remains an optional second hard scope.
    if (brand && brandFilter) {
      const option = [...brandFilter.options].find(o => norm(o.value || o.textContent) === norm(brand));
      if (option) brandFilter.value = option.value;
    }

    const applyHardScope = () => {
      let hardMatches = 0;

      rows.forEach(row => {
        const rowCategory = canonical(row.dataset.category || '');
        const rowBrand = (row.dataset.brand || '').trim();

        const categoryOK = !category || rowCategory === category;
        const brandOK = !brand || norm(rowBrand) === norm(brand);
        const inScope = categoryOK && brandOK;

        if (inScope) {
          row.removeAttribute('data-category-scope-hidden');
          hardMatches += 1;
        } else {
          row.setAttribute('data-category-scope-hidden', '1');
        }
      });

      // The category page must never display an unrelated appliance.
      // For missing demo categories, show a truthful empty state.
      if (zero) {
        if (hardMatches === 0) {
          zero.style.display = 'block';
          const h = zero.querySelector('h3');
          const p = zero.querySelector('p');
          if (h) h.textContent = category
            ? `Няма тестови обяви в „${category}“`
            : 'Няма намерени обяви';
          if (p) p.textContent = category
            ? 'Категорията е отворена правилно. Реалните обяви ще се показват тук след свързването на базата данни.'
            : 'Опитай с друга категория.';
        } else {
          // Let the normal filtering engine decide whether a secondary filter creates zero results.
          const visibleInScope = rows.filter(r =>
            !r.hasAttribute('data-category-scope-hidden') &&
            getComputedStyle(r).display !== 'none'
          ).length;
          if (visibleInScope > 0) zero.style.display = 'none';
        }
      }

      if (resultCount) {
        const visibleInScope = rows.filter(r =>
          !r.hasAttribute('data-category-scope-hidden') &&
          getComputedStyle(r).display !== 'none'
        ).length;
        const n = visibleInScope || hardMatches;
        resultCount.textContent = n === 1 ? '1 обява' : `${n} обяви`;
      }

      if (loadMore && hardMatches === 0) loadMore.style.display = 'none';
    };

    // Apply immediately and again after the accumulated global app code finishes its delayed draw.
    applyHardScope();
    requestAnimationFrame(applyHardScope);
    setTimeout(applyHardScope, 50);
    setTimeout(applyHardScope, 260);
    setTimeout(applyHardScope, 550);

    // Re-assert only the hard category scope after any normal filter/sort interaction.
    document.addEventListener('input', e => {
      if (e.target.closest('.filter-panel')) requestAnimationFrame(applyHardScope);
    });
    document.addEventListener('change', e => {
      if (e.target.closest('.filter-panel')) requestAnimationFrame(applyHardScope);
    });
    document.addEventListener('click', e => {
      if (
        e.target.closest('[data-clear-filters]') ||
        e.target.closest('[data-remove-filter]') ||
        e.target.closest('[data-remove-last-filter]') ||
        e.target.closest('[data-load-more]')
      ) {
        setTimeout(applyHardScope, 0);
      }
    });

    // If older prototype code tries to unhide a row from another category, hide it again.
    const observer = new MutationObserver(mutations => {
      if (mutations.some(m =>
        m.type === 'attributes' &&
        m.target?.classList?.contains('listing-row') &&
        (m.attributeName === 'style' || m.attributeName === 'hidden')
      )) {
        rows.forEach(row => {
          const rowCategory = canonical(row.dataset.category || '');
          const rowBrand = (row.dataset.brand || '').trim();
          const inScope =
            (!category || rowCategory === category) &&
            (!brand || norm(rowBrand) === norm(brand));
          if (!inScope) row.setAttribute('data-category-scope-hidden', '1');
        });
      }
    });

    rows.forEach(row => observer.observe(row, {
      attributes: true,
      attributeFilter: ['style', 'hidden']
    }));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once:true});
  } else {
    start();
  }
})();
