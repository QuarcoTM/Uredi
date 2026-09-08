# QA v2.38

Проверена база: v2.37
HTML страници проверени: 48

## Намерени и поправени дефекти
- brand.html имаше непълен списък с категории и старо име „Печки“.
- Филтрите за състояние бяха непълни и не съвпадаха с публикуването.
- edit-ad.html: бутонът „Запази“ не правеше нищо.
- edit-ad.html: липсваше „Друга марка“ и поле за ръчно въвеждане.
- contact.html: „Изпрати“ не правеше нищо; privacy текстът беше попаднал в header-а.
- safety.html: „Изпрати сигнал“ не правеше нищо.
- report.html: privacy текстът беше попаднал в header-а.
- saved-searches.html: hidden empty-state template беше попаднал в header-а.
- about/help показваха TOP/VIP/Изкачи въпреки FREE BETA.
- admin/categories.html не съвпадаше с заключените 14 категории.
- brand landing страницата показваше само първите 8 категории.

## Автоматични проверки след поправките
- Broken local refs: 0
- Duplicate IDs: 0
- Missing alt attributes: 0
- Unlabelled controls: 0
- Misplaced header elements: 0
- Dead visible public buttons: 0
- JS syntax errors: 0
- FREE BETA paid-feature copy hits on core public pages: 0

## Остава за backend / real-device QA
- Реален Auth, RLS, DB, Storage, realtime chat и server-side validation.
- Реални email/push изпращания.
- Реални contact/report submissions.
- Тест на iPhone Safari за keyboard, momentum scroll, Back/Refresh и native share след всяка голяма backend промяна.
- Реални данни вместо demo counters/stats.
