# Установка SEO-файлов GoStudy

## 1. Локальный проект

Заменить и добавить файлы из архива с сохранением путей:

- `index.html`;
- `src/app/router.jsx`;
- `src/app/App.css`;
- `src/components/Seo/SeoManager.jsx`;
- `src/components/Seo/seoConfig.js`;
- `src/utils/lazyNamed.js`;
- `public/.htaccess`;
- `public/404.php`;
- `public/robots.txt`;
- `public/sitemap.php`;
- `public/favicon/site.webmanifest`.

После замены выполнить:

```bash
npm run lint
npm run build
```

## 2. Хост

Содержимое папки `dist` загрузить в корень:

```text
/www/gostudyonline.ru/
```

При загрузке обязательно перенести скрытый файл:

```text
dist/.htaccess
```

В корне хоста должны появиться или замениться:

```text
.htaccess
404.php
index.html
robots.txt
sitemap.php
assets/
favicon/
images/
```

Каталоги `api/` и `uploads/`, а также `.env` не удалять и не заменять
содержимым сборки.

## 3. Проверка после размещения

Проверить ответы:

```text
https://gostudyonline.ru/                       → 200
https://gostudyonline.ru/agreement              → 200
https://gostudyonline.ru/account                → 200 + X-Robots-Tag: noindex
https://gostudyonline.ru/classroom/1            → 200 + X-Robots-Tag: noindex
https://gostudyonline.ru/несуществующая-страница → 404
https://gostudyonline.ru/robots.txt              → 200
https://gostudyonline.ru/sitemap.php             → 200, XML
```

Неизвестная страница должна показать фирменный экран GoStudy, но во вкладке
Network её основной запрос обязан иметь статус `404`.

## 4. Важное ограничение

Модули Apache `headers`, `expires`, `deflate` и `brotli` подключаются только
если они доступны на хостинге. Правила обёрнуты в `IfModule`, поэтому отсутствие
одного из модулей не должно вызывать ошибку `500`.
