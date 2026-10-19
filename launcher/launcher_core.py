# -*- coding: utf-8 -*-
"""Ядро лаунчера ZSkills: работа с .env, портами и процессами.

UI-независимый слой. Всё, что касается tkinter/customtkinter, вынесено в launcher_ui.py.
"""

from __future__ import annotations

import ctypes
import json
import os
import re
import shutil
import socket
import subprocess
import sys
import threading
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, Iterable
from urllib.parse import quote, unquote, urlparse

APP_NAME = "ZSkills — Панель управления"
BACKEND_KEY = "backend"
FRONTEND_KEY = "frontend"
DEFAULT_API_PORT = 4000
DEFAULT_WEB_PORT = 3000
DEFAULT_DB_PORT = 5432
DB_ENV_KEYS = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]
SENSITIVE_KEY_PATTERN = re.compile(r"(PASSWORD|SECRET|TOKEN|DATABASE_URL)", re.IGNORECASE)
POSTGRES_URL_PATTERN = re.compile(r"(postgres(?:ql)?://[^:\s]+:)([^@\s]+)(@)", re.IGNORECASE)

IS_WINDOWS = sys.platform.startswith("win")


def _creation_flags() -> int:
    """Флаги запуска без консольного окна на Windows."""
    if not IS_WINDOWS:
        return 0
    flags = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
    flags |= getattr(subprocess, "CREATE_NO_WINDOW", 0)
    return flags


def _startupinfo():
    """Скрывает консольное окно у дочерних процессов на Windows."""
    if not IS_WINDOWS:
        return None
    si = subprocess.STARTUPINFO()
    si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    si.wShowWindow = subprocess.SW_HIDE
    return si


def find_project_root() -> Path:
    if getattr(sys, "frozen", False):
        base = Path(sys.executable).resolve().parent
        candidates = [base, base.parent, Path.cwd()]
    else:
        base = Path(__file__).resolve()
        candidates = [base.parent.parent, Path.cwd()]

    for candidate in candidates:
        if (candidate / "apps" / "api" / "package.json").exists():
            return candidate
        if (candidate / "apps" / "web" / "package.json").exists():
            return candidate
    return candidates[0]


class AppConfig:
    ProjectRoot = find_project_root()
    ApiDir = ProjectRoot / "apps" / "api"
    WebDir = ProjectRoot / "apps" / "web"
    EnvPath = ApiDir / ".env"
    LogPath = ProjectRoot / "launcher.log"
    StateDir = ProjectRoot / ".launcher"
    StatePath = StateDir / "state.json"

    ApiDistMain = ApiDir / "dist" / "main.js"
    WebNextBin = WebDir / "node_modules" / ".bin" / ("next.cmd" if IS_WINDOWS else "next")
    WebNextBuildId = WebDir / ".next" / "BUILD_ID"
    WebBuildMarker = WebDir / ".next" / "launcher-env.json"


def _unquote_env_value(value: str) -> str:
    if len(value) >= 2 and ((value[0] == value[-1] == '"') or (value[0] == value[-1] == "'")):
        return value[1:-1]
    return value


def _format_env_value(value: str) -> str:
    if re.search(r"\s|#", value):
        escaped = value.replace("\\", "\\\\").replace('"', '\\"')
        return f'"{escaped}"'
    return value


def read_env_file(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    if not path.exists():
        return env
    for raw_line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = _unquote_env_value(value.strip())
    return env


def update_env_file(path: Path, updates: dict[str, str]) -> None:
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines() if path.exists() else []
    seen: set[str] = set()
    updated: list[str] = []

    for raw_line in lines:
        match = re.match(r"^(\s*([^#=\s]+)\s*=).*$", raw_line)
        if not match:
            updated.append(raw_line)
            continue
        key = match.group(2)
        if key in updates:
            updated.append(f"{key}={_format_env_value(updates[key])}")
            seen.add(key)
        else:
            updated.append(raw_line)

    missing = [key for key in updates if key not in seen]
    if missing:
        if updated and updated[-1].strip():
            updated.append("")
        updated.append("# Settings managed by launcher")
        for key in missing:
            updated.append(f"{key}={_format_env_value(updates[key])}")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(updated) + "\n", encoding="utf-8")


def parse_port(value: str | None, default: int) -> int:
    if not value:
        return default
    try:
        port = int(value)
        return port if 0 < port < 65536 else default
    except ValueError:
        return default


def build_postgres_url(host, port, database, user, password, query):
    credentials = quote(user, safe="") + ":" + quote(password, safe="")
    path = "/" + quote(database, safe="")
    return f"postgresql://{credentials}@{host}:{port}{path}" + (f"?{query}" if query else "")


def read_db_settings(env: dict[str, str]) -> dict[str, str]:
    settings = {key: env[key] for key in DB_ENV_KEYS if key in env}
    if all(key in settings for key in DB_ENV_KEYS):
        return settings

    database_url = env.get("DATABASE_URL")
    if not database_url:
        return settings

    parsed = urlparse(database_url)
    db_name = parsed.path.lstrip("/")
    if parsed.hostname:
        settings.setdefault("DB_HOST", parsed.hostname)
    if parsed.port:
        settings.setdefault("DB_PORT", str(parsed.port))
    if db_name:
        settings.setdefault("DB_NAME", unquote(db_name))
    if parsed.username:
        settings.setdefault("DB_USER", unquote(parsed.username))
    if parsed.password:
        settings.setdefault("DB_PASSWORD", unquote(parsed.password))
    return settings



@dataclass
class PortInfo:
    port: int
    pid: int
    process: str
    app: str = ""


class PortScanner:
    """Сканер занятых портов через GetExtendedTcpTable (без локализации netstat)."""

    _AF_INET = 2
    _TCP_TABLE_OWNER_PID_ALL = 5
    _MIB_TCP_STATE_LISTEN = 2

    class _TcpRow(ctypes.Structure):
        _fields_ = [
            ("state", ctypes.c_uint32),
            ("localAddr", ctypes.c_uint32),
            ("localPort", ctypes.c_uint32),
            ("remoteAddr", ctypes.c_uint32),
            ("remotePort", ctypes.c_uint32),
            ("owningPid", ctypes.c_uint32),
        ]

    @staticmethod
    def is_port_busy(port: int, timeout: float = 0.25) -> bool:
        """Лёгкая проверка: пытаемся установить TCP-соединение. Быстро, без WinAPI."""
        try:
            with socket.create_connection(("127.0.0.1", port), timeout=timeout):
                return True
        except OSError:
            return False

    @classmethod
    def get_listeners(cls) -> list[PortInfo]:
        if not IS_WINDOWS:
            return []
        result: list[PortInfo] = []
        try:
            size = ctypes.c_int(0)
            iphlpapi = ctypes.windll.iphlpapi  # type: ignore[attr-defined]
            iphlpapi.GetExtendedTcpTable(
                None, ctypes.byref(size), False,
                cls._AF_INET, cls._TCP_TABLE_OWNER_PID_ALL, 0,
            )
            if size.value <= 0:
                return result

            buf = ctypes.create_string_buffer(size.value)
            if iphlpapi.GetExtendedTcpTable(
                buf, ctypes.byref(size), False,
                cls._AF_INET, cls._TCP_TABLE_OWNER_PID_ALL, 0,
            ) != 0:
                return result

            count = ctypes.cast(buf, ctypes.POINTER(ctypes.c_ulong)).contents.value
            offset = ctypes.sizeof(ctypes.c_ulong)
            row_size = ctypes.sizeof(cls._TcpRow)
            for i in range(count):
                row = cls._TcpRow.from_buffer_copy(buf.raw[offset:offset + row_size])
                offset += row_size
                if row.state == cls._MIB_TCP_STATE_LISTEN:
                    port = socket.ntohs(row.localPort & 0xFFFF)
                    pid = int(row.owningPid)
                    result.append(PortInfo(port=port, pid=pid, process=cls._proc_name(pid), app=cls.app_name(pid)))
        except Exception:
            return result
        return result

    @staticmethod
    def _proc_name(pid: int) -> str:
        if not IS_WINDOWS:
            return ""
        try:
            import psutil  # noqa: F401
            return psutil.Process(pid).name()
        except Exception:
            pass
        try:
            kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
            h = kernel32.OpenProcess(0x1000, False, pid)  # PROCESS_QUERY_LIMITED_INFORMATION
            if not h:
                return "(нет доступа)"
            try:
                buf = ctypes.create_unicode_buffer(260)
                # GetModuleBaseNameW lives in psapi on some systems; fall back to psapi
                try:
                    psapi = ctypes.windll.psapi  # type: ignore[attr-defined]
                    ok = psapi.GetModuleBaseNameW(h, None, buf, 260)
                except Exception:
                    ok = kernel32.GetModuleBaseNameW(h, None, buf, 260)
                return buf.value if ok else "(нет доступа)"
            finally:
                kernel32.CloseHandle(h)
        except Exception:
            return "(нет доступа)"


    @classmethod
    def app_name(cls, pid: int) -> str:
        """Readable application name by PID (exe path or process name)."""
        if not IS_WINDOWS or pid <= 0:
            return ""
        cache = getattr(cls, '_app_name_cache', {})
        if pid in cache:
            return cache[pid]
        name = ""
        try:
            import ctypes as _ct
            kernel32 = _ct.windll.kernel32
            psapi = _ct.windll.psapi
            h = kernel32.OpenProcess(0x1000 | 0x0010, False, pid)
            if h:
                try:
                    buf = _ct.create_unicode_buffer(260)
                    if psapi.GetModuleFileNameExW(h, None, buf, 260):
                        from pathlib import Path as _P
                        name = _P(buf.value).name
                finally:
                    kernel32.CloseHandle(h)
        except Exception:
            pass
        if not name:
            # Сначала — без консольных окон (psutil / WinAPI), wmic — только fallback.
            name = cls._proc_name(pid)
        if not name:
            try:
                out = subprocess.run(
                    ["wmic", "process", "where", f"ProcessId={pid}",
                     "get", "Name", "/format:value"],
                    capture_output=True, text=True, timeout=3,
                    creationflags=_creation_flags(),
                    startupinfo=_startupinfo(),
                )
                for line in out.stdout.splitlines():
                    if line.startswith("Name="):
                        name = line[5:].strip()
                        break
            except Exception:
                pass
        cache[pid] = name
        cls._app_name_cache = cache
        return name

    @classmethod
    def owner(cls, port: int) -> PortInfo | None:
        for info in cls.get_listeners():
            if info.port == port:
                return info
        return None

    @classmethod
    def free_port(cls, port: int) -> bool:
        """Убивает только процессы, слушающие указанный порт."""
        pids = {info.pid for info in cls.get_listeners() if info.port == port}
        if not pids:
            return True
        for pid in pids:
            cls._kill_pid(pid)
        deadline = time.time() + 5
        while time.time() < deadline:
            if not cls.is_port_busy(port):
                return True
            time.sleep(0.3)
        return not cls.is_port_busy(port)

    @staticmethod
    def _kill_pid(pid: int) -> None:
        if not IS_WINDOWS:
            try:
                os.kill(pid, 9)
            except Exception:
                pass
            return
        try:
            subprocess.run(
                ["taskkill", "/PID", str(pid), "/T", "/F"],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                check=False, timeout=5,
                creationflags=_creation_flags(),
                startupinfo=_startupinfo(),
            )
        except Exception:
            pass

    @staticmethod
    def detect_lan_ip() -> str | None:
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
                sock.connect(("8.8.8.8", 80))
                ip = sock.getsockname()[0]
                if _usable_lan_ip(ip):
                    return ip
        except OSError:
            pass
        try:
            host = socket.gethostname()
            for ip in socket.gethostbyname_ex(host)[2]:
                if _usable_lan_ip(ip):
                    return ip
        except OSError:
            pass
        return None


def _usable_lan_ip(ip: str) -> bool:
    return not (ip.startswith("127.") or ip.startswith("169.254.") or ip == "0.0.0.0")



class _IoCounters(ctypes.Structure):
    _fields_ = [
        ("ReadOperationCount", ctypes.c_ulonglong),
        ("WriteOperationCount", ctypes.c_ulonglong),
        ("OtherOperationCount", ctypes.c_ulonglong),
        ("ReadTransferCount", ctypes.c_ulonglong),
        ("WriteTransferCount", ctypes.c_ulonglong),
        ("OtherTransferCount", ctypes.c_ulonglong),
    ]


class _BasicLimit(ctypes.Structure):
    _fields_ = [
        ("PerProcessUserTimeLimit", ctypes.c_longlong),
        ("PerJobUserTimeLimit", ctypes.c_longlong),
        ("LimitFlags", ctypes.c_ulong),
        ("MinimumWorkingSetSize", ctypes.c_size_t),
        ("MaximumWorkingSetSize", ctypes.c_size_t),
        ("ActiveProcessLimit", ctypes.c_ulong),
        ("Affinity", ctypes.c_size_t),
        ("PriorityClass", ctypes.c_size_t),
        ("SchedulingClass", ctypes.c_size_t),
    ]


class _ExtendedLimit(ctypes.Structure):
    _fields_ = [
        ("BasicLimitInformation", _BasicLimit),
        ("IoInfo", _IoCounters),
        ("ProcessMemoryLimit", ctypes.c_size_t),
        ("JobMemoryLimit", ctypes.c_size_t),
        ("PeakProcessMemoryUsed", ctypes.c_size_t),
        ("PeakJobMemoryUsed", ctypes.c_size_t),
    ]


class ProcessJob:
    """Job Object с флагом KILL_ON_JOB_CLOSE: дочерние процессы умирают с лаунчером."""

    _JobObjectExtendedLimitInformation = 9
    _JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000

    def __init__(self) -> None:
        self._handle = None
        self._supported = IS_WINDOWS
        if not IS_WINDOWS:
            return
        try:
            self._handle = ctypes.windll.kernel32.CreateJobObjectW(None, None)  # type: ignore[attr-defined]
            if not self._handle:
                self._supported = False
                return
            info = _ExtendedLimit()
            info.BasicLimitInformation.LimitFlags = self._JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE
            length = ctypes.sizeof(info)
            if not ctypes.windll.kernel32.SetInformationJobObject(  # type: ignore[attr-defined]
                self._handle, self._JobObjectExtendedLimitInformation,
                ctypes.byref(info), length,
            ):
                self._supported = False
        except Exception:
            self._supported = False

    def add_process(self, process_handle: int) -> bool:
        if not self._supported or not self._handle or not IS_WINDOWS:
            return False
        try:
            return bool(ctypes.windll.kernel32.AssignProcessToJobObject(  # type: ignore[attr-defined]
                self._handle, process_handle))
        except Exception:
            return False

    def close(self) -> None:
        if self._handle:
            try:
                ctypes.windll.kernel32.CloseHandle(self._handle)  # type: ignore[attr-defined]
            except Exception:
                pass
            self._handle = None




@dataclass
class CommandResult:
    code: int
    output: str = ""


@dataclass
class ServiceProcess:
    key: str
    title: str
    process: subprocess.Popen


class LauncherEngine:
    """Запуск/остановка сервисов, порты, .env. Лог отдаётся через callback log(source, msg)."""

    def __init__(self, log_sink: Callable[[str, str], None]) -> None:
        self._log = log_sink
        self._job = ProcessJob()
        self._lock = threading.Lock()
        self._services: dict[str, ServiceProcess] = {}
        self._known_pids = self._load_state()
        self.package_manager: str | None = None
        self.package_manager_name = "не найден"
        self.lan_ip: str | None = None

    # ---- логирование ----
    def log(self, message: str, source: str = "launcher") -> None:
        self._log(source, message)

    # ---- инициализация ----
    def initialize(self) -> None:
        self.log("Лаунчер запущен.")
        self.log(f"Корень проекта: {AppConfig.ProjectRoot}")
        self.log(f"Папка API: {AppConfig.ApiDir}")
        self.log(f"Папка Web: {AppConfig.WebDir}")

        self.package_manager = self._find_package_manager()
        if self.package_manager:
            self.package_manager_name = Path(self.package_manager).name
            self.log(f"Команды Node выполняются через {self.package_manager_name}.")
        else:
            self.log("Не найден pnpm/npm. Установите Node.js и зависимости проекта.")

        self.lan_ip = PortScanner.detect_lan_ip()
        self.log(f"IP в локальной сети: {self.lan_ip}" if self.lan_ip
                 else "IP в локальной сети определить не удалось.")

    @staticmethod
    def _find_package_manager() -> str | None:
        for name in ["pnpm.cmd", "pnpm", "npm.cmd", "npm", "pnpm.exe", "npm.exe"]:
            found = shutil.which(name)
            if found:
                return found
        return None

    # ---- порты ----
    def read_api_port(self) -> int:
        return parse_port(read_env_file(AppConfig.EnvPath).get("PORT"), DEFAULT_API_PORT)

    def read_web_port(self) -> int:
        return parse_port(read_env_file(AppConfig.EnvPath).get("WEB_PORT"), DEFAULT_WEB_PORT)

    def save_ports(self, api_port: int, web_port: int) -> None:
        update_env_file(AppConfig.EnvPath, {
            "PORT": str(api_port),
            "WEB_PORT": str(web_port),
            "NEXT_PUBLIC_API_PORT": str(api_port),
            "NEXT_PUBLIC_API_URL": f"http://localhost:{api_port}/api",
        })
        self.log(f"Порты сохранены в .env: API={api_port}, WEB={web_port}.")

    def _desired_web_build_env(self, api_port: int) -> dict[str, str]:
        env = read_env_file(AppConfig.EnvPath)
        return {
            "NEXT_PUBLIC_API_PORT": str(api_port),
            "NEXT_PUBLIC_API_URL": env.get("NEXT_PUBLIC_API_URL",
                                           f"http://localhost:{api_port}/api"),
        }

    def web_build_matches(self, api_port: int) -> bool:
        desired = self._desired_web_build_env(api_port)
        if not AppConfig.WebBuildMarker.exists():
            return (desired["NEXT_PUBLIC_API_PORT"] == str(DEFAULT_API_PORT)
                    and desired["NEXT_PUBLIC_API_URL"] == f"http://localhost:{DEFAULT_API_PORT}/api")
        try:
            current = json.loads(AppConfig.WebBuildMarker.read_text(encoding="utf-8"))
            return current == desired
        except Exception:
            return False

    def write_web_build_marker(self, api_port: int) -> None:
        try:
            AppConfig.WebBuildMarker.parent.mkdir(parents=True, exist_ok=True)
            AppConfig.WebBuildMarker.write_text(
                json.dumps(self._desired_web_build_env(api_port), ensure_ascii=False, indent=2),
                encoding="utf-8")
        except Exception:
            pass

    # ---- окружение процессов ----
    def _build_runtime_env(self, api_port: int, web_port: int) -> dict[str, str]:
        env = read_env_file(AppConfig.EnvPath)
        local_ip = self.lan_ip or "127.0.0.1"
        origins = [
            f"http://localhost:{web_port}",
            f"http://127.0.0.1:{web_port}",
            f"http://{local_ip}:{web_port}",
        ]
        existing = [o.strip() for o in env.get("CORS_ORIGIN", "").split(",") if o.strip()]
        cors = ",".join(list(dict.fromkeys(existing + origins)))
        return {
            "NODE_ENV": "production",
            "PORT": str(api_port),
            "HOST": "0.0.0.0",
            "CORS_ORIGIN": cors,
            "WEB_PORT": str(web_port),
            "NEXT_PUBLIC_API_PORT": str(api_port),
            "NEXT_PUBLIC_API_URL": env.get("NEXT_PUBLIC_API_URL",
                                           f"http://localhost:{api_port}/api"),
        }

    def _build_process_env(self, updates: dict[str, str] | None = None) -> dict[str, str]:
        env = os.environ.copy()
        env.update(read_env_file(AppConfig.EnvPath))
        env.update(self._build_runtime_env(self.read_api_port(), self.read_web_port()))
        if updates:
            env.update(updates)
        return env

    def pm_command(self, script: str) -> list[str]:
        """Возвращает команду запуска npm-скрипта, минуя cmd.exe на Windows."""
        if not self.package_manager:
            raise RuntimeError("Найдите pnpm или npm.")
        pm_lower = self.package_manager.lower()
        if "npm" in pm_lower and IS_WINDOWS:
            npm_dir = os.path.dirname(self.package_manager)
            npm_js = os.path.join(npm_dir, "node_modules", "npm", "bin", "npm-cli.js")
            node_exe = shutil.which("node")
            if node_exe and os.path.exists(npm_js):
                return [node_exe, npm_js, "run", script]
        return [self.package_manager, "run", script]

    @staticmethod
    def _creation_flags() -> int:
        return _creation_flags()

    @staticmethod
    def _startupinfo():
        """Скрывает консольное окно у дочерних процессов на Windows."""
        return _startupinfo()


    # ---- выполнение команд ----
    def _pm_run(self, script: str) -> list[str]:
        if not self.package_manager:
            raise RuntimeError('No pnpm or npm found.')
        pm_lower = self.package_manager.lower()
        if 'npm' in pm_lower and IS_WINDOWS:
            npm_dir = os.path.dirname(self.package_manager)
            npm_js = os.path.join(npm_dir, 'node_modules', 'npm', 'bin', 'npm-cli.js')
            node_exe = shutil.which('node')
            if node_exe and os.path.exists(npm_js):
                return [node_exe, npm_js, 'run', script]
        return [self.package_manager, 'run', script]

    def pm_run_command(self, title: str, script: str,
                       env_updates: dict[str, str] | None = None,
                       stdin_text: str | None = None) -> CommandResult:
        return self.run_command(title, self._pm_run(script), cwd=AppConfig.ApiDir,
                                env_updates=env_updates, stdin_text=stdin_text)

    def run_command(self, title: str, args: list[str], cwd: Path,
                    env_updates: dict[str, str] | None = None,
                    stdin_text: str | None = None) -> CommandResult:
        env = self._build_process_env(env_updates)
        self.log(f"Запуск команды: {title}: {' '.join(args)}")
        try:
            process = subprocess.Popen(
                args, cwd=str(cwd), env=env,
                stdin=subprocess.PIPE if stdin_text is not None else subprocess.DEVNULL,
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                text=True, encoding="utf-8", errors="replace", bufsize=1,
                creationflags=self._creation_flags(),
                startupinfo=self._startupinfo(),
            )
        except FileNotFoundError as error:
            self.log(f"Команда не найдена: {args[0]}")
            return CommandResult(code=1, output=str(error))

        if stdin_text is not None and process.stdin:
            try:
                process.stdin.write(stdin_text)
                process.stdin.close()
            except Exception:
                pass

        collected: list[str] = []
        try:
            assert process.stdout is not None
            for line in _safe_iter_lines(process.stdout):
                collected.append(line)
                self.log(line.rstrip(), source=title)
            code = process.wait(timeout=120)
            self.log(f"Команда завершена: {title}, код {code}.")
            return CommandResult(code=code, output="".join(collected))
        except Exception:
            self.log(f"Команда '{title}' завершена (ошибка ожидания).")
            _safe_kill(process)
            return CommandResult(code=-1, output="".join(collected))

    # ---- запуск сервисов ----
    def start_service(self, key: str, title: str, args: list[str], cwd: Path,
                      env_updates: dict[str, str] | None = None) -> subprocess.Popen:
        env = self._build_process_env(env_updates)
        self.log(f"Запуск процесса: {title}: {' '.join(args)}")
        process = subprocess.Popen(
            args, cwd=str(cwd), env=env,
            stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace", bufsize=1,
            creationflags=self._creation_flags(),
            startupinfo=self._startupinfo(),
        )
        try:
            self._job.add_process(process._handle)  # type: ignore[attr-defined]
        except Exception:
            pass

        sp = ServiceProcess(key=key, title=title, process=process)
        with self._lock:
            self._services[key] = sp
        self._save_state()

        def reader() -> None:
            try:
                assert process.stdout is not None
                for line in _safe_iter_lines(process.stdout):
                    self.log(line.rstrip(), source=title)
            except Exception:
                pass
            try:
                code = process.wait()
                self.log(f"Процесс {title} завершился с кодом {code}.")
            except Exception:
                self.log(f"Процесс {title} завершился (ошибка получения кода).")
            with self._lock:
                current = self._services.get(key)
                if current and current.process is process:
                    self._services.pop(key, None)
                    self._known_pids.pop(key, None)
            self._save_state()

        threading.Thread(target=reader, daemon=True).start()
        return process


    # ---- статус ----
    def is_running(self, key: str) -> bool:
        with self._lock:
            service = self._services.get(key)
            if service and service.process.poll() is None:
                return True
        pid = self._known_pids.get(key)
        return bool(pid and _is_pid_alive(pid))

    def service_status(self, key: str, port: int) -> str:
        with self._lock:
            service = self._services.get(key)
            if service and service.process.poll() is None:
                return f"работает (PID {service.process.pid})"
        pid = self._known_pids.get(key)
        if pid and _is_pid_alive(pid):
            return f"работает (PID {pid})"
        if PortScanner.is_port_busy(port):
            return f"порт {port} занят другим процессом"
        return "остановлен"

    # ---- остановка ----
    def stop_service(self, key: str) -> None:
        with self._lock:
            service = self._services.pop(key, None)
        pid = service.process.pid if service else self._known_pids.get(key)

        if not pid:
            return
        if not _is_pid_alive(pid):
            with self._lock:
                self._known_pids.pop(key, None)
            self._save_state()
            return

        title = "frontend" if key == FRONTEND_KEY else "backend"
        self.log(f"Остановка {title}, PID {pid}.")
        _terminate_process_tree(pid)
        if service and _safe_poll(service.process) is None:
            try:
                service.process.wait(timeout=8)
            except Exception:
                _safe_kill(service.process)
        if _is_pid_alive(pid):
            _terminate_process_tree(pid, force=True)

        with self._lock:
            self._known_pids.pop(key, None)
        self._save_state()

    def stop_all_services(self) -> None:
        self.stop_service(FRONTEND_KEY)
        self.stop_service(BACKEND_KEY)
        with self._lock:
            self._known_pids = {}
        self._save_state()

    # ---- состояние ----
    def _load_state(self) -> dict[str, int]:
        try:
            if not AppConfig.StatePath.exists():
                return {}
            data = json.loads(AppConfig.StatePath.read_text(encoding="utf-8"))
            return {k: int(v) for k, v in data.items()
                    if k in (BACKEND_KEY, FRONTEND_KEY) and int(v) > 0}
        except Exception:
            return {}

    def _save_state(self) -> None:
        try:
            AppConfig.StateDir.mkdir(parents=True, exist_ok=True)
            live: dict[str, int] = {}
            with self._lock:
                for key, sp in self._services.items():
                    if sp.process.poll() is None:
                        live[key] = sp.process.pid
            AppConfig.StatePath.write_text(
                json.dumps(live, ensure_ascii=False, indent=2), encoding="utf-8")
        except Exception:
            pass

    def remember_service(self, key: str, pid: int) -> None:
        with self._lock:
            self._known_pids[key] = pid
        self._save_state()

    def close(self) -> None:
        self._job.close()



def _safe_iter_lines(stream: Iterable[str]):
    try:
        for line in stream:
            yield line
    except Exception:
        pass


def _safe_kill(process: subprocess.Popen) -> None:
    try:
        process.kill()
    except Exception:
        pass


def _safe_poll(process: subprocess.Popen):
    try:
        return process.poll()
    except Exception:
        return None


def _is_pid_alive(pid: int) -> bool:
    if pid <= 0:
        return False
    if IS_WINDOWS:
        try:
            kernel32 = ctypes.windll.kernel32  # type: ignore[attr-defined]
            PROCESS_QUERY_LIMITED_INFORMATION = 0x1000
            STILL_ACTIVE = 259
            handle = kernel32.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, False, pid)
            if not handle:
                return False
            try:
                exit_code = ctypes.c_ulong()
                if not kernel32.GetExitCodeProcess(handle, ctypes.byref(exit_code)):
                    return False
                return exit_code.value == STILL_ACTIVE
            finally:
                try:
                    kernel32.CloseHandle(handle)
                except Exception:
                    pass
        except Exception:
            return False
    try:
        os.kill(pid, 0)
        return True
    except Exception:
        return False


def _terminate_process_tree(pid: int, force: bool = False) -> None:
    if IS_WINDOWS:
        args = ["taskkill", "/PID", str(pid), "/T"]
        if force:
            args.append("/F")
        try:
                subprocess.run(args, stdout=subprocess.DEVNULL,
                           stderr=subprocess.DEVNULL, check=False, timeout=5,
                           creationflags=_creation_flags(),
                           startupinfo=_startupinfo(),)
        except Exception:
            pass
        return
    import signal
    try:
        os.kill(pid, signal.SIGTERM)
    except Exception:
        pass
    if force:
        try:
            os.kill(pid, signal.SIGKILL)
        except Exception:
            pass


def wait_for_port(port: int, timeout_seconds: int) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if PortScanner.is_port_busy(port, timeout=0.5):
            return True
        time.sleep(0.5)
    return False



class LaunchController:
    """Полный сценарий запуска проекта. Выполняется в фоне, прогресс через callback."""

    def __init__(self, engine: LauncherEngine) -> None:
        self._engine = engine

    def run(self, api_port: int, web_port: int,
            progress: Callable[[str], None],
            refresh_addresses: Callable[[], None]) -> str | None:
        """Возвращает текст ошибки или None при успехе."""
        engine = self._engine
        try:
            progress("Запуск проекта...")
            refresh_addresses()

            if engine.is_running(BACKEND_KEY) or engine.is_running(FRONTEND_KEY):
                progress("Проект уже запущен лаунчером. Повторный запуск пропущен.")
                return None

            if not engine.package_manager:
                return "Не найден pnpm или npm. Установите Node.js и зависимости проекта."

            engine.save_ports(api_port, web_port)

            progress("Освобождение портов при необходимости...")
            if PortScanner.is_port_busy(api_port):
                progress(f"Порт backend {api_port} занят. Пробуем освободить...")
                if not PortScanner.free_port(api_port):
                    return (f"Порт backend {api_port} занят и не удалось освободить. "
                            "Освободите его на вкладке «Порты» или выберите другой.")
            if AppConfig.WebDir.exists() and PortScanner.is_port_busy(web_port):
                progress(f"Порт frontend {web_port} занят. Пробуем освободить...")
                if not PortScanner.free_port(web_port):
                    return (f"Порт frontend {web_port} занят и не удалось освободить. "
                            "Освободите его на вкладке «Порты» или выберите другой.")

            self._require_project_files()

            progress("Проверка подключения к БД...")
            if (AppConfig.ApiDir / "package.json").exists():
                check = engine.pm_run_command("Проверка БД", "db:check", stdin_text="SELECT 1;")
                if check.code != 0:
                    return ("База данных недоступна. Проверьте DB_HOST/DB_PORT/DB_NAME/"
                            "DB_USER/DB_PASSWORD и что PostgreSQL запущен.")

            progress("Применение миграций...")
            if (AppConfig.ApiDir / "package.json").exists():
                migrate = engine.pm_run_command("Миграции Prisma", "migrate:deploy")
                if migrate.code != 0:
                    return "Миграции не выполнены. Проверьте доступ к БД и журнал."

            progress("Seed администратора...")
            if (AppConfig.ApiDir / "package.json").exists():
                seed = engine.pm_run_command("Seed администратора", "seed:admin")
                if seed.code != 0:
                    return ("Seed администратора не выполнен. Проверьте ADMIN_EMAIL/"
                            "ADMIN_PASSWORD в apps/api/.env.")

            if not AppConfig.ApiDistMain.exists():
                if (AppConfig.ApiDir / "package.json").exists():
                    progress("Сборка backend...")
                    build_api = engine.pm_run_command("Сборка backend", "build")
                    if build_api.code != 0:
                        return "Backend не собран. Проверьте логи сборки."
                else:
                    engine.log("Внимание: apps/api/package.json отсутствует — пропускаем сборку backend.")

            if AppConfig.WebDir.exists():
                next_built = AppConfig.WebNextBuildId.exists()
                env_matches = engine.web_build_matches(api_port)
                if not next_built or not env_matches:
                    progress("Порт API изменён — пересборка frontend..." if next_built
                             else "Сборка frontend (может занять несколько минут)...")
                    build_web = engine.run_command("Сборка frontend",
                                                   engine.pm_command("build"),
                                                   cwd=AppConfig.WebDir)
                    if build_web.code != 0:
                        return "Frontend не собран. Проверьте логи сборки."
                    engine.write_web_build_marker(api_port)

            progress("Запуск backend...")
            if (AppConfig.ApiDir / "package.json").exists():
                engine.start_service(BACKEND_KEY, "Backend",
                                     engine.pm_command("start"),
                                     cwd=AppConfig.ApiDir)
                if not wait_for_port(api_port, 40):
                    engine.stop_service(BACKEND_KEY)
                    return "Backend запущен, но порт API не открылся. Проверьте логи backend."
            else:
                engine.log("Внимание: apps/api/package.json отсутствует — пропускаем запуск backend.")

            if AppConfig.WebDir.exists():
                progress("Запуск frontend...")
                self._start_frontend(web_port)
                # Если процесс frontend уже упал — не ждём 60 секунд впустую.
                if not engine.is_running(FRONTEND_KEY):
                    engine.stop_service(FRONTEND_KEY)
                    engine.stop_service(BACKEND_KEY)
                    return ("Frontend упал сразу после запуска. Проверьте логи frontend "
                            "(npm/pnpm next start).")
                if not wait_for_port(web_port, 120):
                    engine.stop_service(FRONTEND_KEY)
                    engine.stop_service(BACKEND_KEY)
                    return "Frontend запущен, но порт сайта не открылся. Проверьте логи frontend."

            progress("Проект успешно запущен.")
            refresh_addresses()
            return None
        except Exception as error:
            engine.stop_all_services()
            return str(error)

    def _start_frontend(self, web_port: int) -> None:
        """Запускает next напрямую через node (минуя next.cmd, чтобы избежать проблем со скобками в пути к проекту)."""
        args = ["start", "-H", "0.0.0.0", "-p", str(web_port)]
        next_js = AppConfig.WebDir / "node_modules" / "next" / "dist" / "bin" / "next"
        node_exe = shutil.which("node")
        if node_exe and next_js.exists():
            self._engine.start_service(FRONTEND_KEY, "Frontend",
                                       [node_exe, str(next_js), *args],
                                       cwd=AppConfig.WebDir)
            return
        # .cmd/.bin обёртки не используются — они открывают лишние консольные окна
        # и ломаются на путях со скобками.

    def _require_project_files(self) -> None:
        if not AppConfig.ApiDir.exists():
            raise RuntimeError("Не найдена папка apps/api рядом с лаунчером.")
        if (AppConfig.ApiDir / "package.json").exists():
            if not (AppConfig.ApiDir / "node_modules").exists():
                raise RuntimeError("Не найдены зависимости backend: apps/api/node_modules.")
        else:
            self._engine.log("Внимание: apps/api/package.json не найден — шаги бэкенда (Node.js) пропускаются.")
        if AppConfig.WebDir.exists():
            if not (AppConfig.WebDir / "package.json").exists():
                raise RuntimeError("Не найден apps/web/package.json.")
            if not (AppConfig.WebDir / "node_modules").exists():
                raise RuntimeError("Не найдены зависимости frontend: apps/web/node_modules.")

