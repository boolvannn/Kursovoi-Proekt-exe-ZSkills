# Лаунчер ZSkills (Python / customtkinter)

Настольный лаунчер для запуска дипломного проекта **без ручной работы с терминалом**.
Написан на **Python 3 + customtkinter** — интерфейс (`launcher_ui.py`) отделен от логики (`launcher_core.py`, `LaunchController`/`LauncherEngine`).

Возможности:
- задание **портов backend (API) и frontend (Web)** прямо в окне;
- проверка, **какие порты заняты, а какие свободны**, с показом владельца (процесс + PID);
- освобождение занятого порта одной кнопкой (завершается только процесс-владелец);
- **крупная плашка статуса** («ОСТАНОВЛЕН» / «ЗАПУЩЕН», хорошо видна);
- запуск/остановка backend и frontend, вкладки «Логи» и «База данных»;
- настройки подключения к БД с чекбоксом «Показать пароль» и резервной копией `.env` перед записью;
- открытие сайта в браузере по локальному и LAN-адресу.

---
## 1. Требования

- **Python 3.10+** и пакеты из `launcher/requirements.txt`:
  ```powershell
  pip install -r launcher/requirements.txt
  ```
  Основная зависимость: `customtkinter`.
- **Node.js 20+** и **pnpm** (или npm) — для apps/api и apps/web.
- **PostgreSQL** (порт по умолчанию `5432`).
- Установленные зависимости проекта: `apps/api/node_modules` и `apps/web/node_modules`.

Если зависимости ещё не установлены:

```powershell
cd apps/api ; pnpm install ; cd ..\..
cd apps/web ; pnpm install ; cd ..\..
```

---
## 2. Сборка лаунчера (exe)

Из корня проекта:

```powershell
.\scripts\build-launcher.ps1
```

Результат:

```text
dist\DiplomLauncher.exe
```

Сборка использует **PyInstaller** (`--onefile --noconsole`) и собирает ассеты `customtkinter` (`--collect-all customtkinter`).

Для эксплуатации положите `DiplomLauncher.exe` **в корень проекта** рядом с папкой `apps`
(лаунчер сам найдёт `apps/api` и `apps/web`, поднимаясь вверх от exe).

> Можно запускать без сборки, из исходников:
> `python launcher/launcher.py`

Вариант на **C# / WinForms** (`launcher/DiplomLauncher`) остаётся как альтернатива (собирается `scripts/build-launcher-csharp.ps1`).

---
## 3. Запуск проекта через лаунчер

1. Запустите `DiplomLauncher.exe` (или `python launcher/launcher.py`).
2. Вкладка **Запуск**:
   - укажите **Backend (API) порт** (по умолчанию `4000`);
   - укажите **Frontend (Web) порт** (по умолчанию `3000`);
   - нажмите **Проверить** — «свободен / занят»;
   - нажмите **Применить порты** — значения запишутся в `apps/api/.env`;
   - нажмите **▶ Запустить проект**.
3. Дождитесь статуса **«Проект запущен.»** и откройте сайт кнопкой
   **Открыть сайт в браузере** (`http://localhost:<web-порт>`).

Лаунчер последовательно: проверяет БД → миграции → seed администратора →
собирает backend/frontend (если нужно) → запускает сервисы.

### Важно про порт frontend

`apps/web/package.json` фиксирует `next start -p 3000`. Лаунчер запускает фронт
**напрямую** (`next start -p <порт>`), минуя этот скрипт, чтобы порт применялся.
При смене **порта API** лаунчер пересоберёт frontend (адрес API «запекается» в `next build`).

---
## 4. Порты: занято / свободно

Через лаунчер (вкладка **Порты**):
- ключевые порты (Backend API, Frontend Web, PostgreSQL) со статусом
  **свободен / занят: <процесс> (PID …)**;
- кнопка **Освободить** — завершает только процесс-владелец порта;
- таблица всех прослушиваемых портов (LISTEN): порт, PID, имя процесса.
Вкладка **Запуск** дублирует статус портов API и Web.

Через консоль Windows:

```powershell
netstat -ano | findstr LISTENING
netstat -ano | findstr :3000
tasklist /FI "PID eq 12345"
$p = (Get-NetTCPConnection -State Listen -LocalPort 3000).OwningProcess
taskkill /PID $p /T /F
```

---
## 5. Консольные команды проекта (без лаунчера)

Из папок `apps/api` / `apps/web` или `pnpm --filter <api|web> <script>`.

Backend (`apps/api`): `db:check`, `migrate:deploy`, `seed:admin`, `build`, `start`, `start:dev`.
Frontend (`apps/web`): `dev -p 3000`, `build`, `start -p 3000`.

> `NEXT_PUBLIC_*` запекаются в бандл при `build`. Сменили порт API — пересоберите фронт.

---
## 6. Настройки базы данных

Вкладка **База данных** редактирует `apps/api/.env` (`DB_HOST`, `DB_PORT`,
`DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DATABASE_URL`). Перед записью создаётся
резервная копия `apps/api/.env.backup-YYYYMMDD-HHMMSS`. Пароль скрыт по умолчанию
(чекбокс «Показать пароль») и не пишется в логи.

---
## 7. Логи

Вкладка **Логи** показывает вывод БД/миграций/seed/backend/frontend. То же
сохраняется в `launcher.log` в корне проекта. Пароли и токены маскируются.

---
## 8. Остановка проекта

Кнопка **■ Остановить проект** (или закрытие окна с подтверждением).
Все дочерние процессы завершаются вместе с лаунчером — порты освобождаются корректно.
