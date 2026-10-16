# -*- coding: utf-8 -*-
"""Пользовательский интерфейс лаунчера на customtkinter."""

from __future__ import annotations

import threading
import webbrowser

import customtkinter as ctk

from launcher_core import (
    APP_NAME, AppConfig, BACKEND_KEY, DEFAULT_DB_PORT, FRONTEND_KEY,
    LaunchController, LauncherEngine, PortScanner, read_db_settings,
)

# Палитра (светлая / белая тема)
BG = "#f8fafc"
CARD = "#ffffff"
CARD_ALT = "#f1f5f9"
TEXT = "#0f172a"
MUTED = "#64748b"
ACCENT = "#3b82f6"
OK = "#10b981"
WARN = "#f59e0b"
ERR = "#ef4444"


def _hex_to_rgb(value: str):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def _rgb_to_hex(rgb) -> str:
    return "#%02x%02x%02x" % rgb


def _shade(hex_color: str, factor: float) -> str:
    r, g, b = _hex_to_rgb(hex_color)
    if factor >= 0:
        r, g, b = (int(c + (255 - c) * factor) for c in (r, g, b))
    else:
        f = 1 + factor
        r, g, b = (int(c * f) for c in (r, g, b))
    return _rgb_to_hex((max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b))))

def _contrast_text_color(bg_hex: str) -> str:
    """Возвращает '#0f172a' для светлого фона, '#ffffff' для тёмного."""
    r, g, b = _hex_to_rgb(bg_hex.lstrip("#"))
    luminance = 0.299 * r + 0.587 * g + 0.114 * b
    return TEXT if luminance > 160 else "#ffffff"

class LauncherApp(ctk.CTk):
    def __init__(self) -> None:
        super().__init__()
        ctk.set_appearance_mode("light")

        self.title(APP_NAME)
        self.geometry("1040x780")
        self.minsize(940, 660)
        self.configure(fg_color=BG)
        self.protocol("WM_DELETE_WINDOW", self.on_close)

        self._log_buffer: list[str] = []
        self._log_box = None
        self._busy = False
        self._closed = False

        self.engine = LauncherEngine(self._on_log)
        self.controller = LaunchController(self.engine)
        self.engine.initialize()

        self._build_widgets()
        self._load_ports()
        self._load_db_settings()
        self.refresh_statuses()
        self.refresh_addresses()
        self.refresh_port_state()

        # Периодическое обновление статуса — ЛЁГКОЕ (только TCP-connect), без лагов.
        self.after(1000, self._periodic_refresh)

    # ---------- общие виджеты ----------
    def _card(self, parent, title: str | None = None):
        card = ctk.CTkFrame(parent, fg_color=CARD, corner_radius=14)
        card.pack(fill="x", pady=(0, 16))
        if title:
            ctk.CTkLabel(card, text=title, font=("Segoe UI Semibold", 15),
                         text_color=TEXT).pack(anchor="w", padx=18, pady=(14, 6))
        return card

    def _row_label(self, parent, text: str):
        return ctk.CTkLabel(parent, text=text, font=("Segoe UI", 12),
                            text_color=MUTED, anchor="w")

    def _btn(self, parent, text, command, color=ACCENT, hover=None, width=None):
        kwargs = {}
        if width is not None:
            kwargs["width"] = width
        return ctk.CTkButton(
            parent, text=text, command=command, fg_color=color,
            hover_color=hover or _shade(color, 0.15),
            corner_radius=10, height=38,
            font=("Segoe UI Semibold", 12), text_color=_contrast_text_color(color),
            **kwargs,
        )

    def _build_widgets(self) -> None:
        tabs = ctk.CTkTabview(self, fg_color=BG, segmented_button_fg_color=CARD,
                              segmented_button_selected_color=ACCENT,
                              segmented_button_selected_hover_color=_shade(ACCENT, 0.15),
                              text_color=TEXT)
        tabs.pack(fill="both", expand=True, padx=16, pady=16)
        self._tabs = tabs

        tabs.add("Запуск")
        tabs.add("Порты")
        tabs.add("База данных")
        tabs.add("Логи")

        self._build_launch_tab(tabs.tab("Запуск"))
        self._build_ports_tab(tabs.tab("Порты"))
        self._build_db_tab(tabs.tab("База данных"))
        self._build_logs_tab(tabs.tab("Логи"))

    # ---------- вкладка «Запуск» ----------
    def _build_launch_tab(self, parent) -> None:
        scroll = ctk.CTkScrollableFrame(parent, fg_color="transparent")
        scroll.pack(fill="both", expand=True)

        # ---- КРУПНАЯ ПЛАШКА СТАТУСА (хорошо видна) ----
        banner = ctk.CTkFrame(scroll, fg_color=CARD, corner_radius=16, height=120)
        banner.pack(fill="x", pady=(4, 16))
        banner.pack_propagate(False)

        self.status_dot = ctk.CTkLabel(banner, text="●", font=("Segoe UI", 46),
                                       text_color=MUTED)
        self.status_dot.pack(side="left", padx=(28, 16))

        text_box = ctk.CTkFrame(banner, fg_color="transparent")
        text_box.pack(side="left", fill="both", expand=True, pady=18)
        self.status_title = ctk.CTkLabel(text_box, text="ОСТАНОВЛЕН",
                                         font=("Segoe UI", 30, "bold"),
                                         text_color=TEXT, anchor="w")
        self.status_title.pack(anchor="w")
        self.status_sub = ctk.CTkLabel(text_box, text="Проект не запущен",
                                       font=("Segoe UI", 13), text_color=MUTED, anchor="w")
        self.status_sub.pack(anchor="w", pady=(2, 0))

        # ---- Порты ----
        ports_card = self._card(scroll, "Порты сервисов")
        grid = ctk.CTkFrame(ports_card, fg_color="transparent")
        grid.pack(fill="x", padx=18, pady=(0, 8))
        grid.columnconfigure(2, weight=1)

        self._row_label(grid, "Backend (API)").grid(row=0, column=0, sticky="w", padx=(0, 12), pady=8)
        self.api_port = ctk.CTkEntry(grid, width=110, justify="center",
                                     fg_color=CARD_ALT, border_width=0, text_color=TEXT)
        self.api_port.grid(row=0, column=1, pady=8)
        self.api_state = ctk.CTkLabel(grid, text="", font=("Segoe UI", 11), text_color=MUTED)
        self.api_state.grid(row=0, column=2, sticky="w", padx=14)
        self._btn(grid, "Проверить", self.refresh_port_state, CARD_ALT,
                  width=110).grid(row=0, column=3, padx=(8, 0))

        self._row_label(grid, "Frontend (Web)").grid(row=1, column=0, sticky="w", padx=(0, 12), pady=8)
        self.web_port = ctk.CTkEntry(grid, width=110, justify="center",
                                     fg_color=CARD_ALT, border_width=0, text_color=TEXT)
        self.web_port.grid(row=1, column=1, pady=8)
        self.web_state = ctk.CTkLabel(grid, text="", font=("Segoe UI", 11), text_color=MUTED)
        self.web_state.grid(row=1, column=2, sticky="w", padx=14)
        self._btn(grid, "Проверить", self.refresh_port_state, CARD_ALT,
                  width=110).grid(row=1, column=3, padx=(8, 0))

        btn_row = ctk.CTkFrame(ports_card, fg_color="transparent")
        btn_row.pack(fill="x", padx=18, pady=(6, 14))
        self._btn(btn_row, "Применить порты (записать в .env)", self.apply_ports).pack(side="left")
        self._btn(btn_row, "Открыть вкладку «Порты»",
                  lambda: self._tabs.set("Порты"), CARD_ALT).pack(side="left", padx=(10, 0))
        ctk.CTkLabel(ports_card, text="Порты сохраняются в apps/api/.env и применяются при запуске.",
                     font=("Segoe UI", 10), text_color=MUTED).pack(anchor="w", padx=18, pady=(0, 14))

        # ---- Управление ----
        ctrl_card = self._card(scroll, "Управление")
        self.start_button = self._btn(ctrl_card, "▶  Запустить проект", self.start_project, OK)
        self.start_button.pack(fill="x", padx=18, pady=(6, 10))
        self.stop_button = self._btn(ctrl_card, "■  Остановить проект", self.stop_project, ERR)
        self.stop_button.pack(fill="x", padx=18, pady=(0, 14))

        # ---- Адреса ----
        addr_card = self._card(scroll, "Адреса сайта")
        agrid = ctk.CTkFrame(addr_card, fg_color="transparent")
        agrid.pack(fill="x", padx=18, pady=(0, 8))
        agrid.columnconfigure(1, weight=1)
        self._row_label(agrid, "Локально").grid(row=0, column=0, sticky="w", padx=(0, 12), pady=6)
        self.local_url = ctk.CTkEntry(agrid, fg_color=CARD_ALT, border_width=0, text_color=TEXT)
        self.local_url.grid(row=0, column=1, sticky="ew", pady=6)
        self._row_label(agrid, "В сети").grid(row=1, column=0, sticky="w", padx=(0, 12), pady=6)
        self.lan_url = ctk.CTkEntry(agrid, fg_color=CARD_ALT, border_width=0, text_color=TEXT)
        self.lan_url.grid(row=1, column=1, sticky="ew", pady=6)
        self._btn(addr_card, "Открыть сайт в браузере", self.open_site,
                  ACCENT).pack(fill="x", padx=18, pady=(6, 14))


    # ---------- вкладка «Порты» ----------
    def _build_ports_tab(self, parent) -> None:
        scroll = ctk.CTkScrollableFrame(parent, fg_color="transparent")
        scroll.pack(fill="both", expand=True)

        card = self._card(scroll, "Ключевые порты")
        self.port_rows: dict[int, ctk.CTkLabel] = {}
        for label_text, port in (
            ("Backend API", self.engine.read_api_port()),
            ("Frontend Web", self.engine.read_web_port()),
            ("PostgreSQL", DEFAULT_DB_PORT),
        ):
            row = ctk.CTkFrame(card, fg_color="transparent")
            row.pack(fill="x", padx=18, pady=6)
            ctk.CTkLabel(row, text=f"{label_text}  (порт {port})", font=("Segoe UI", 12),
                         text_color=TEXT, anchor="w").pack(side="left")
            state = ctk.CTkLabel(row, text="", font=("Segoe UI", 11), text_color=MUTED)
            state.pack(side="left", padx=18)
            if label_text != "PostgreSQL":
                self._btn(row, "Освободить", lambda p=port: self._free_port(p),
                      WARN, width=110).pack(side="right")
            self.port_rows[port] = state

        self._btn(card, "Обновить состояние портов", self.refresh_port_state,
                  CARD_ALT).pack(fill="x", padx=18, pady=(6, 14))

        list_card = self._card(scroll, "Все прослушиваемые порты (LISTEN)")
        self.ports_table = ctk.CTkScrollableFrame(list_card, fg_color=CARD_ALT, corner_radius=10,
                                                  height=240)
        self.ports_table.pack(fill="x", padx=18, pady=(6, 14))

    # ---------- вкладка «База данных» ----------
    def _build_db_tab(self, parent) -> None:
        scroll = ctk.CTkScrollableFrame(parent, fg_color="transparent")
        scroll.pack(fill="both", expand=True)

        card = self._card(scroll, "Подключение к базе данных")
        grid = ctk.CTkFrame(card, fg_color="transparent")
        grid.pack(fill="x", padx=18, pady=(0, 8))
        grid.columnconfigure(1, weight=1)

        self.db_entries: dict[str, ctk.CTkEntry] = {}
        for row, key in enumerate(["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]):
            self._row_label(grid, key).grid(row=row, column=0, sticky="w", padx=(0, 12), pady=6)
            entry = ctk.CTkEntry(grid, fg_color=CARD_ALT, border_width=0, text_color=TEXT)
            if key == "DB_PASSWORD":
                entry.configure(show="•")  # по умолчанию скрыт
            entry.grid(row=row, column=1, sticky="ew", pady=6)
            self.db_entries[key] = entry

        # ---- переключатель «показать пароль» ----
        self.show_password = ctk.CTkCheckBox(
            card, text="Показать пароль", font=("Segoe UI", 11), text_color=MUTED,
            checkbox_width=18, checkbox_height=18, command=self._toggle_password,
        )
        self.show_password.pack(anchor="w", padx=18, pady=(2, 10))

        btn_row = ctk.CTkFrame(card, fg_color="transparent")
        btn_row.pack(fill="x", padx=18, pady=(6, 8))
        self._btn(btn_row, "Загрузить из .env", self._load_db_settings, CARD_ALT).pack(side="left")
        self._btn(btn_row, "Сохранить в .env", self._save_db_settings).pack(side="left", padx=(10, 0))

        self.db_status = ctk.CTkLabel(card, text="", font=("Segoe UI", 11), text_color=MUTED)
        self.db_status.pack(anchor="w", padx=18, pady=(6, 14))
        ctk.CTkLabel(card, text="Перед записью создаётся резервная копия apps/api/.env.backup-*",
                     font=("Segoe UI", 10), text_color=MUTED).pack(anchor="w", padx=18, pady=(0, 14))

    def _toggle_password(self) -> None:
        entry = self.db_entries.get("DB_PASSWORD")
        if entry is None:
            return
        entry.configure(show="" if self.show_password.get() else "•")


    # ---------- вкладка «Логи» ----------
    def _build_logs_tab(self, parent) -> None:
        self._log_box = ctk.CTkTextbox(parent, fg_color=CARD_ALT, text_color=TEXT,
                                       font=("Cascadia Mono", 11), corner_radius=10, wrap="word")
        self._log_box.pack(fill="both", expand=True, padx=4, pady=4)
        self._log_box.configure(state="disabled")

        bar = ctk.CTkFrame(parent, fg_color="transparent")
        bar.pack(fill="x", padx=4, pady=(0, 6))
        self._btn(bar, "Очистить окно", lambda: self._clear_log(), CARD_ALT).pack(side="left")
        self._btn(bar, "Открыть launcher.log", self._open_log_file).pack(side="left", padx=(10, 0))

        # выводим накопленный буфер
        for line in self._log_buffer:
            self._append_log_line(line)

    # ---------- загрузка данных в форму ----------
    def _load_ports(self) -> None:
        self.api_port.delete(0, "end")
        self.api_port.insert(0, str(self.engine.read_api_port()))
        self.web_port.delete(0, "end")
        self.web_port.insert(0, str(self.engine.read_web_port()))

    def _load_db_settings(self) -> None:
        settings = read_db_settings(_read_env())
        self.db_entries["DB_HOST"].delete(0, "end")
        self.db_entries["DB_HOST"].insert(0, settings.get("DB_HOST", "localhost"))
        self.db_entries["DB_PORT"].delete(0, "end")
        self.db_entries["DB_PORT"].insert(0, settings.get("DB_PORT", str(DEFAULT_DB_PORT)))
        self.db_entries["DB_NAME"].delete(0, "end")
        self.db_entries["DB_NAME"].insert(0, settings.get("DB_NAME", "diplom"))
        self.db_entries["DB_USER"].delete(0, "end")
        self.db_entries["DB_USER"].insert(0, settings.get("DB_USER", "postgres"))
        self.db_entries["DB_PASSWORD"].delete(0, "end")
        self.db_entries["DB_PASSWORD"].insert(0, settings.get("DB_PASSWORD", ""))
        self.db_status.configure(text="Настройки загружены из apps/api/.env.")

    def _save_db_settings(self) -> None:
        host = self.db_entries["DB_HOST"].get().strip()
        port = self.db_entries["DB_PORT"].get().strip()
        name = self.db_entries["DB_NAME"].get().strip()
        user = self.db_entries["DB_USER"].get().strip()
        password = self.db_entries["DB_PASSWORD"].get()

        if not host or not name or not user or not port.isdigit():
            self._info("Проверьте поля: хост, порт (число), имя БД и пользователь обязательны.",
                       error=True)
            return
        try:
            import shutil
            from datetime import datetime
            from launcher_core import build_postgres_url, update_env_file
            backup = None
            if AppConfig.EnvPath.exists():
                backup = AppConfig.EnvPath.with_name(
                    f".env.backup-{datetime.now():%Y%m%d-%H%M%S}")
                shutil.copy2(AppConfig.EnvPath, backup)
            url = build_postgres_url(host, port, name, user, password, "schema=public")
            update_env_file(AppConfig.EnvPath, {
                "DATABASE_URL": url, "DB_HOST": host, "DB_PORT": port,
                "DB_NAME": name, "DB_USER": user, "DB_PASSWORD": password,
            })
            self.db_status.configure(
                text=("Настройки сохранены. Backup: " + backup.name) if backup
                else "Настройки сохранены (создан новый .env).")
            self._on_log("launcher", "Настройки БД сохранены, пароль не выводится в лог.")
        except Exception as error:
            self.db_status.configure(text=f"Ошибка сохранения: {error}")


    # ---------- обновление состояния ----------
    def refresh_statuses(self) -> None:
        running = self.engine.is_running(BACKEND_KEY) or self.engine.is_running(FRONTEND_KEY)
        if running:
            self.status_dot.configure(text_color=OK)
            self.status_title.configure(text="ЗАПУЩЕН", text_color=OK)
            backend = self.engine.service_status(BACKEND_KEY, self._safe_int(self.api_port))
            frontend = self.engine.service_status(FRONTEND_KEY, self._safe_int(self.web_port))
            self.status_sub.configure(
                text=f"Backend: {backend}   •   Frontend: {frontend}", text_color=TEXT)
        else:
            self.status_dot.configure(text_color=MUTED)
            self.status_title.configure(text="ОСТАНОВЛЕН", text_color=TEXT)
            self.status_sub.configure(text="Проект не запущен", text_color=MUTED)

    def refresh_addresses(self) -> None:
        web_port = self._safe_int(self.web_port)
        self.local_url.delete(0, "end")
        self.local_url.insert(0, f"http://localhost:{web_port}")
        self.lan_url.delete(0, "end")
        self.lan_url.insert(0, f"http://{self.engine.lan_ip}:{web_port}"
                               if self.engine.lan_ip else "IP не определён")

    def refresh_port_state(self) -> None:
        api_port = self._safe_int(self.api_port)
        web_port = self._safe_int(self.web_port)
        self._set_port_state(self.api_state, api_port)
        self._set_port_state(self.web_state, web_port)
        for port, label in getattr(self, "port_rows", {}).items():
            self._set_port_state(label, port)
        self._render_ports_table()

    def _set_port_state(self, label: ctk.CTkLabel, port: int) -> None:
        if PortScanner.is_port_busy(port):
            owner = PortScanner.owner(port)
            label.configure(text=(f"занят: {owner.process} (PID {owner.pid})" if owner else "занят"),
                            text_color=ERR)
        else:
            label.configure(text="свободен", text_color=OK)

    def _render_ports_table(self) -> None:
        if not hasattr(self, "ports_table"):
            return
        for child in self.ports_table.winfo_children():
            child.destroy()
        header = ctk.CTkFrame(self.ports_table, fg_color=CARD)
        header.pack(fill="x")
        for col, w in (("Порт", 90), ("PID", 80), ("Приложение", 220), ("Процесс", 220), ("", 60)):
            ctk.CTkLabel(header, text=col, width=w, font=("Segoe UI Semibold", 11),
                         text_color=TEXT, anchor="w").pack(side="left", padx=8)
        for info in sorted(PortScanner.get_listeners(), key=lambda x: x.port):
            row = ctk.CTkFrame(self.ports_table, fg_color="transparent")
            row.pack(fill="x", pady=1)
            ctk.CTkLabel(row, text=str(info.port), width=90, anchor="w",
                         text_color=TEXT).pack(side="left", padx=8)
            ctk.CTkLabel(row, text=str(info.pid), width=80, anchor="w",
                         text_color=MUTED).pack(side="left", padx=8)
            ctk.CTkLabel(row, text=info.app or info.process, width=220, anchor="w",
                         text_color=MUTED).pack(side="left", padx=8)
            ctk.CTkLabel(row, text=info.process, width=220, anchor="w",
                         text_color=MUTED).pack(side="left", padx=8)

    def _periodic_refresh(self) -> None:
        if self._closed:
            return
        # Только лёгкая проверка в основном потоке — таблицу LISTEN не перестраиваем.
        self.refresh_statuses()
        self.after(2000, self._periodic_refresh)

    @staticmethod
    def _safe_int(entry: ctk.CTkEntry) -> int:
        try:
            value = int(entry.get())
            return value if 0 < value < 65536 else 0
        except (ValueError, TypeError):
            return 0


    # ---------- действия ----------
    def apply_ports(self) -> None:
        api_port = self._safe_int(self.api_port)
        web_port = self._safe_int(self.web_port)
        if api_port <= 0 or web_port <= 0:
            self._info("Укажите корректные номера портов (1–65535).", error=True)
            return
        if api_port == web_port:
            self._info("Порты API и Web должны отличаться.", error=True)
            return
        self.engine.save_ports(api_port, web_port)
        self._load_ports()
        self.refresh_addresses()
        self.refresh_port_state()
        self._info(f"Порты сохранены: API={api_port}, WEB={web_port}.")

    def start_project(self) -> None:
        if self._busy:
            return
        api_port = self._safe_int(self.api_port)
        web_port = self._safe_int(self.web_port)
        if api_port <= 0 or web_port <= 0:
            self._info("Укажите корректные номера портов (1–65535).", error=True)
            return
        if api_port == web_port:
            self._info("Порты API и Web должны отличаться.", error=True)
            return
        self._set_busy(True)
        self._on_log("launcher", f"Запуск проекта: API={api_port}, WEB={web_port}...")

        def worker() -> None:
            try:
                error = self.controller.run(api_port, web_port,
                                            self._progress, self.refresh_addresses)
            except Exception as exc:
                error = f"Ошибка запуска проекта: {exc}"
            self.after(0, lambda: self._done(error))

        threading.Thread(target=worker, daemon=True).start()

    def stop_project(self) -> None:
        if self._busy:
            return
        self._set_busy(True)
        self._on_log("launcher", "Остановка проекта...")

        def worker() -> None:
            try:
                self.engine.stop_all_services()
            except Exception as error:
                self._on_log("launcher", f"Ошибка остановки: {error}")
            self.after(0, self._stopped)

        threading.Thread(target=worker, daemon=True).start()

    def _progress(self, message: str) -> None:
        self.after(0, lambda: self._set_status_sub(message))

    def _set_status_sub(self, text: str) -> None:
        self.status_sub.configure(text=text,
                                  text_color=OK if "успешно" in text else TEXT)

    def _done(self, error: str | None) -> None:
        self._set_busy(False)
        self.refresh_statuses()
        self.refresh_addresses()
        if error:
            self.status_sub.configure(text="Ошибка запуска", text_color=ERR)
            self._info(error, error=True)
        else:
            self.status_sub.configure(text="Проект запущен.", text_color=OK)

    def _stopped(self) -> None:
        self._set_busy(False)
        self.status_sub.configure(text="Проект остановлен.", text_color=TEXT)
        self.refresh_statuses()

    def _set_busy(self, busy: bool) -> None:
        self._busy = busy
        self.start_button.configure(state="disabled" if busy else "normal")
        self.stop_button.configure(state="disabled" if busy else "normal")
        self.configure(cursor="watch" if busy else "")

    def _free_port(self, port: int) -> None:
        if not PortScanner.is_port_busy(port):
            self._info(f"Порт {port} уже свободен.")
            return
        owner = PortScanner.owner(port)
        who = f" «{owner.process}» (PID {owner.pid})" if owner else ""
        if not self._ask_yesno(f"Завершить процесс{who}, который занимает порт {port}?"):
            return
        ok = PortScanner.free_port(port)
        self._info(f"Порт {port} освобождён." if ok else f"Не удалось освободить порт {port}.",
                   error=not ok)
        self.refresh_port_state()

    def open_site(self) -> None:
        url = self.local_url.get()
        if not url:
            self._info("Адрес сайта пока не определён.", error=True)
            return
        try:
            webbrowser.open(url)
        except Exception as error:
            self._info(f"Не удалось открыть браузер: {error}", error=True)


    # ---------- логирование ----------
    def _on_log(self, source: str, message: str) -> None:
        from datetime import datetime
        line = f"[{datetime.now():%Y-%m-%d %H:%M:%S}] [{source}] {message}"
        # файл launcher.log (потокобезопасно)
        try:
            with open(AppConfig.LogPath, "a", encoding="utf-8") as log_file:
                log_file.write(line + "\n")
        except Exception:
            pass
        if self._log_box is None:
            self._log_buffer.append(line)
            return
        self.after(0, lambda: self._append_log_line(line))

    def _append_log_line(self, line: str) -> None:
        if self._log_box is None or self._closed:
            return
        self._log_box.configure(state="normal")
        self._log_box.insert("end", line + "\n")
        self._log_box.see("end")
        self._log_box.configure(state="disabled")

    def _clear_log(self) -> None:
        if self._log_box is None:
            return
        self._log_box.configure(state="normal")
        self._log_box.delete("1.0", "end")
        self._log_box.configure(state="disabled")

    def _open_log_file(self) -> None:
        import os
        try:
            AppConfig.LogPath.touch(exist_ok=True)
            os.startfile(str(AppConfig.LogPath))  # type: ignore[attr-defined]
        except Exception as error:
            self._info(f"Не удалось открыть лог: {error}", error=True)

    # ---------- диалоги ----------
    def _info(self, message: str, error: bool = False) -> None:
        from tkinter import messagebox
        messagebox.showerror(APP_NAME, message) if error else messagebox.showinfo(APP_NAME, message)

    def _ask_yesno(self, message: str) -> bool:
        from tkinter import messagebox
        return messagebox.askyesno(APP_NAME, message)

    # ---------- закрытие ----------
    def on_close(self) -> None:
        if self.engine.is_running(BACKEND_KEY) or self.engine.is_running(FRONTEND_KEY):
            from tkinter import messagebox
            answer = messagebox.askyesnocancel(
                APP_NAME, "Проект запущен. Остановить процессы перед закрытием?")
            if answer is None:
                return
            if answer:
                self.engine.stop_all_services()
        self._closed = True
        self.engine.close()
        self.destroy()


def _read_env():
    from launcher_core import read_env_file
    return read_env_file(AppConfig.EnvPath)


def main() -> None:
    app = LauncherApp()
    app.mainloop()


if __name__ == "__main__":
    main()

