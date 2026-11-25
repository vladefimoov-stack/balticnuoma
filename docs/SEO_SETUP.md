# SEO, Google и cookies — что сделать владельцу

Сайт уже отдаёт поисковикам всё нужное — делать ничего не нужно, только подключить Google:

| Что                   | Где                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Карта сайта           | https://www.balticnuoma.lt/sitemap.xml — все страницы LT + EN и каждый опубликованный авто |
| robots.txt            | https://www.balticnuoma.lt/robots.txt — закрыты `/admin` и `/api` (кроме картинок превью)  |
| Канонические ссылки   | у каждой страницы `canonical` + `hreflang` (lt / en / x-default)                           |
| Картинки для соцсетей | фирменная карточка сайта и отдельная карточка каждого авто (фото, название, цена «nuo»)    |
| Разметка для Google   | `AutoRental` (адрес, телефон, часы работы), `Car` + цена за сутки, «хлебные крошки»        |

Тексты, цены, контакты и часы работы берутся из админки — после сохранения всё обновляется само
(сайт — через минуту, карта сайта и превью — в течение 5 минут).

## 1. Google Search Console (обязательно, ~10 минут)

Search Console показывает, по каким запросам находят сайт, и сообщает об ошибках.

**Способ A — через DNS (рекомендуем, подтверждает сразу весь домен):**

1. Откройте https://search.google.com/search-console → **Add property** → слева **Domain** →
   впишите `balticnuoma.lt` → **Continue**.
2. Google покажет запись вида `google-site-verification=…` — скопируйте её.
3. В IV.lt → ваш домен → **DNS zona** добавьте запись: тип **TXT**, имя — пусто (или `@`),
   значение — скопированная строка. Сохраните. Остальные записи (Vercel, Resend) не трогайте.
4. Вернитесь в Search Console → **Verify**. Если сразу не прошло — подождите 10–30 минут и повторите.

**Способ B — через мета-тег (если DNS трогать не хотите):**

1. Search Console → **Add property** → справа **URL prefix** → `https://www.balticnuoma.lt` →
   **HTML tag**. Из тега `<meta name="google-site-verification" content="ABC…">` скопируйте только `ABC…`.
2. Vercel → проект → **Settings → Environment Variables** → добавьте `GOOGLE_SITE_VERIFICATION` = `ABC…`
   (Production) → **Deployments → Redeploy**.
3. Search Console → **Verify**.

**После подтверждения:** Search Console → **Sitemaps** → впишите `sitemap.xml` → **Submit**.
Первые данные появятся через несколько дней.

## 2. Google Business Profile (очень желательно)

Карточка компании в Картах и в поиске «automobilių nuoma Klaipėda» даёт больше звонков, чем сам сайт.
https://business.google.com → добавьте компанию: категория **Car rental agency** (Automobilių nuomos
agentūra), адрес Birutės g. 21, Klaipėda, телефон, часы работы, сайт `https://www.balticnuoma.lt`,
фото автомобилей и офиса. Google подтвердит адрес (письмо / видео / звонок).

## 3. Аналитика (по желанию)

Сайт умеет подключать **Google Analytics 4** — только после согласия посетителя в cookie-баннере.

1. https://analytics.google.com → создайте ресурс для `www.balticnuoma.lt` → **Web stream** →
   скопируйте **Measurement ID** вида `G-XXXXXXX`.
2. Vercel → Environment Variables → `NEXT_PUBLIC_GA_MEASUREMENT_ID` = `G-XXXXXXX` → **Redeploy**.

После этого в cookie-баннере появится пункт «Analitika», а в политике cookies — строка про `_ga`.
Без этой переменной аналитики нет, и баннер спрашивает только про карту Google.

## 4. Cookie-баннер — как устроен

- До выбора посетителя загружаются только необходимые cookies (язык, сам выбор, вход в админку).
- Карта Google в контактах грузится **только после согласия** («Žemėlapis») или по кнопке
  «Rodyti žemėlapį» на самой карте. Без согласия рядом есть ссылка «Atidaryti Google Maps».
- Кнопки «Tik būtini» и «Priimti visus» одинаковые — так требует практика ЕС.
- Изменить выбор: ссылка **«Slapukų nustatymai»** внизу сайта или кнопка на странице «Slapukų politika».
- Выбор хранится 12 месяцев, потом баннер спросит снова.

## 5. Юридические страницы

`/salygos`, `/privatumo-politika`, `/slapukai` (и EN-версии) — **черновики**, составленные по образцу
литовских компаний по аренде авто. Перед запуском рекламы их должен проверить юрист.

- Реквизиты (юр. название, įmonės kodas, PVM kodas, юр. адрес, email по вопросам данных)
  заполняются в админке: **Nustatymai → Įmonės rekvizitai**. Пока поле пустое, в текстах
  стоит оранжевый плейсхолдер вроде `[įmonės kodas]`, а в футере поле не показывается.
- Сам текст правит разработчик: `content/legal/*.lt.tsx` / `*.en.tsx`
  (после правок — поменять дату `LEGAL_UPDATED` в `lib/legal/context.ts`).

## Проверка

- Превью ссылки: https://www.opengraph.xyz/ или Facebook Sharing Debugger → вставьте адрес страницы.
- Разметка: https://search.google.com/test/rich-results → адрес главной или страницы авто.
