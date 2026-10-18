# ZSkills — дипломный проект (онлайн-платформа обучения)

Учебная платформа: курсы, уроки, тесты, вебинары, прогресс студентов.

**Stack:** NestJS + Prisma + PostgreSQL (backend), Next.js + Tailwind (frontend),
Python + customtkinter (десктопный лаунчер Windows).

## Структура

| Папка | Что внутри |
|---|---|
| `apps/api` | Backend — NestJS (REST, JWT-auth, Prisma/PostgreSQL) |
| `apps/web` | Frontend — Next.js (App Router, Tailwind) |
| `launcher` | Лаунчер ZSkills (Python) — инструкция в [launcher/README.md](launcher/README.md) |
| `dist` | Собранный `DiplomLauncher.exe` |
| `docs` | Архитектурные документы (MVP, auth, UI-гайд и др.) |
| `scripts` | Скрипты сборки лаунчера |

## Быстрый старт

1. **Требования:** Node.js 20+, PostgreSQL, Python 3.10+ (для лаунчера из исходников).
2. **База данных:** создайте БД и заполните `apps/api/.env` по образцу
   [`apps/api/.env.example`](apps/api/.env.example).
3. **Зависимости:**
   ```powershell
   cd apps/api;  npm install
   cd ../web;    npm install
   ```
4. **Запуск:** положите `dist/DiplomLauncher.exe` в корень проекта рядом с `apps/`
   и запустите — лаунчер сам проверит БД, накатит миграции, создаст админа,
   соберёт и запустит backend + frontend.

Либо вручную:

```powershell
cd apps/api
npm run migrate:deploy
npm run seed:admin
npm run build
npm run start          # http://localhost:4000

cd ../web
npm run build
npm run start          # http://localhost:3000
```

## Документация

- [Лаунчер Windows](launcher/README.md)
- [Архитектура MVP](docs/mvp-architecture.md)
- [Структура бэкенда](docs/backend-modules-structure.md)
- [Архитектура авторизации](docs/auth-architecture.md)
- [UI-гайд](docs/ui-style-guide.md)
