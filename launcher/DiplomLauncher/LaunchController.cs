using System.Diagnostics;

namespace DiplomLauncher;

/// <summary>
/// Высокоуровневый сценарий запуска проекта. Выполняется в фоновом потоке,
/// прогресс сообщается через callback progress(message).
/// </summary>
public sealed class LaunchController
{
    private readonly LauncherEngine _engine;

    public LaunchController(LauncherEngine engine)
    {
        _engine = engine;
    }

    /// <summary>Запускает проект целиком. Возвращает текст ошибки или null при успехе.</summary>
    public string? Run(
        int apiPort, int webPort, Action<string> progress, Action refreshAddresses)
    {
        try
        {
            progress("Запуск проекта...");
            refreshAddresses();

            if (_engine.IsRunning(AppConfig.BackendKey) || _engine.IsRunning(AppConfig.FrontendKey))
            {
                progress("Проект уже запущен лаунчером. Повторный запуск пропущен.");
                return null;
            }

            if (_engine.PackageManagerPath is null)
                return "Не найден pnpm или npm. Установите Node.js и зависимости проекта.";

            // Сохраняем выбранные порты, чтобы backend/frontend их использовали.
            _engine.SavePorts(apiPort, webPort);

            progress("Освобождение портов при необходимости...");
            if (PortScanner.IsPortBusy(apiPort))
            {
                progress($"Порт backend {apiPort} занят. Пробуем освободить...");
                if (!PortScanner.FreePort(apiPort))
                    return $"Порт backend {apiPort} занят и не удалось освободить. " +
                           "Освободите его вручную (вкладка «Порты») или выберите другой.";
            }
            if (Directory.Exists(AppConfig.WebDir) && PortScanner.IsPortBusy(webPort))
            {
                progress($"Порт frontend {webPort} занят. Пробуем освободить...");
                if (!PortScanner.FreePort(webPort))
                    return $"Порт frontend {webPort} занят и не удалось освободить. " +
                           "Освободите его вручную (вкладка «Порты») или выберите другой.";
            }

            RequireProjectFiles();

            progress("Проверка подключения к БД...");
            var check = _engine.PmRunCommand("Проверка БД", "db:check", stdinText: "SELECT 1;");
            if (check.Code != 0)
                return "База данных недоступна. Проверьте DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD " +
                       "и что PostgreSQL запущен.";

            progress("Применение миграций...");
            var migrate = _engine.PmRunCommand("Миграции Prisma", "migrate:deploy");
            if (migrate.Code != 0)
                return "Миграции не выполнены. Проверьте доступ к БД и журнал.";

            progress("Seed администратора...");
            var seed = _engine.PmRunCommand("Seed администратора", "seed:admin");
            if (seed.Code != 0)
                return "Seed администратора не выполнен. Проверьте ADMIN_EMAIL/ADMIN_PASSWORD в apps/api/.env.";

            progress("Проверка сборки backend...");
            if (!File.Exists(AppConfig.ApiDistMain))
            {
                progress("Сборка backend...");
                var buildApi = _engine.PmRunCommand("Сборка backend", "build");
                if (buildApi.Code != 0)
                    return "Backend не собран. Проверьте логи сборки.";
            }

            if (Directory.Exists(AppConfig.WebDir))
            {
                var nextBuilt = File.Exists(AppConfig.WebNextBuildId);
                var envMatches = _engine.WebBuildMatches(apiPort);
                if (!nextBuilt || !envMatches)
                {
                    progress(nextBuilt
                        ? "Порт API изменён — пересборка frontend..."
                        : "Сборка frontend (может занять несколько минут)...");
                    var buildWeb = _engine.RunCommand("Сборка frontend",
                        _engine.PackageManagerPath!, "run build", AppConfig.WebDir);
                    if (buildWeb.Code != 0)
                        return "Frontend не собран. Проверьте логи сборки.";
                    _engine.WriteWebBuildMarker(apiPort);
                }
            }

            progress("Запуск backend...");
            var backend = _engine.StartService(
                AppConfig.BackendKey, "Backend",
                _engine.PackageManagerPath!, "run start", AppConfig.ApiDir);

            if (!WaitForPort(apiPort, 40))
            {
                _engine.StopService(AppConfig.BackendKey);
                return "Backend запущен, но порт API не открылся. Проверьте логи backend.";
            }

            if (Directory.Exists(AppConfig.WebDir))
            {
                progress("Запуск frontend...");
                StartFrontend(webPort);

                if (!WaitForPort(webPort, 60))
                {
                    _engine.StopService(AppConfig.FrontendKey);
                    _engine.StopService(AppConfig.BackendKey);
                    return "Frontend запущен, но порт сайта не открылся. Проверьте логи frontend.";
                }
            }

            progress("Проект успешно запущен.");
            refreshAddresses();
            return null;
        }
        catch (Exception ex)
        {
            _engine.StopAllServices();
            return ex.Message;
        }
    }

    /// <summary>
    /// Запускает frontend с пользовательским портом. Вызываем next напрямую
    /// (next start -p PORT), т.к. package.json жестко фиксирует -p 3000.
    /// </summary>
    private void StartFrontend(int webPort)
    {
        var nextBin = AppConfig.WebNextBin;
        var args = $"start -H 0.0.0.0 -p {webPort}";

        if (File.Exists(nextBin))
        {
            _engine.StartService(
                AppConfig.FrontendKey, "Frontend", nextBin, args, AppConfig.WebDir);
            return;
        }

        // Фолбэк: через пакетный менеджер (node_modules\.bin в PATH).
        var binDir = Path.Combine(AppConfig.WebDir, "node_modules", ".bin");
        var previousPath = Environment.GetEnvironmentVariable("PATH") ?? string.Empty;
        Environment.SetEnvironmentVariable("PATH", binDir + Path.PathSeparator + previousPath);
        try
        {
            _engine.StartService(
                AppConfig.FrontendKey, "Frontend",
                OperatingSystem.IsWindows() ? "next.cmd" : "next",
                $"start -H 0.0.0.0 -p {webPort}", AppConfig.WebDir);
        }
        finally
        {
            Environment.SetEnvironmentVariable("PATH", previousPath);
        }
    }

    private void RequireProjectFiles()
    {
        if (!Directory.Exists(AppConfig.ApiDir))
            throw new InvalidOperationException("Не найдена папка apps/api рядом с лаунчером.");
        if (!File.Exists(Path.Combine(AppConfig.ApiDir, "package.json")))
            throw new InvalidOperationException("Не найден apps/api/package.json.");
        if (!Directory.Exists(Path.Combine(AppConfig.ApiDir, "node_modules")))
            throw new InvalidOperationException("Не найдены зависимости backend: apps/api/node_modules.");

        if (Directory.Exists(AppConfig.WebDir))
        {
            if (!File.Exists(Path.Combine(AppConfig.WebDir, "package.json")))
                throw new InvalidOperationException("Не найден apps/web/package.json.");
            if (!Directory.Exists(Path.Combine(AppConfig.WebDir, "node_modules")))
                throw new InvalidOperationException("Не найдены зависимости frontend: apps/web/node_modules.");
        }
    }

    private static bool WaitForPort(int port, int timeoutSeconds)
    {
        var deadline = DateTime.UtcNow.AddSeconds(timeoutSeconds);
        while (DateTime.UtcNow < deadline)
        {
            if (PortScanner.IsPortBusy(port))
                return true;
            Thread.Sleep(500);
        }
        return false;
    }
}

