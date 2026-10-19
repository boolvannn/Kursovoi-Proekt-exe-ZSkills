using System.Collections;
using System.Diagnostics;
using System.Text;
using System.Text.Json;

namespace DiplomLauncher;

public sealed class CommandResult
{
    public int Code { get; init; }
    public string Output { get; init; } = string.Empty;
}

public sealed class ServiceProcess
{
    public string Key { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public required Process Process { get; init; }
}

/// <summary>
/// Ядро лаунчера: запуск/остановка сервисов, работа с портами и .env.
/// Пишет лог через callback, поэтому UI остаётся отзывчивым.
/// </summary>
public sealed class LauncherEngine : IDisposable
{
    private readonly Action<string, string> _log;
    private readonly ProcessJob _job = new();
    private readonly Dictionary<string, ServiceProcess> _services = new();
    private readonly object _lock = new();
    private Dictionary<string, int> _knownPids = LoadState();

    public LauncherEngine(Action<string, string> logSink)
    {
        _log = logSink;
    }

    public string? PackageManagerPath { get; private set; }
    public string PackageManagerName { get; private set; } = "не найден";
    public string? LanIp { get; private set; }

    private void Log(string message, string source = "launcher") => _log(source, message);

    public void Initialize()
    {
        Log("Лаунчер запущен.");
        Log($"Корень проекта: {AppConfig.ProjectRoot}");
        Log($"Папка API: {AppConfig.ApiDir}");
        Log($"Папка Web: {AppConfig.WebDir}");

        PackageManagerPath = FindPackageManager();
        if (PackageManagerPath is not null)
        {
            PackageManagerName = Path.GetFileName(PackageManagerPath);
            Log($"Команды Node выполняются через {PackageManagerName}.");
        }
        else
        {
            Log("Не найден pnpm/npm. Установите Node.js и зависимости проекта.");
        }

        LanIp = PortScanner.DetectLanIp();
        Log(LanIp is not null
            ? $"IP в локальной сети: {LanIp}"
            : "IP в локальной сети определить не удалось.");
    }

    private static string? FindPackageManager()
    {
        foreach (var name in new[] { "pnpm.cmd", "pnpm", "npm.cmd", "npm", "pnpm.exe", "npm.exe" })
        {
            var found = Which(name);
            if (found is not null)
                return found;
        }
        return null;
    }

    private static string? Which(string name)
    {
        try
        {
            var psi = new ProcessStartInfo
            {
                FileName = OperatingSystem.IsWindows() ? "where.exe" : "which",
                Arguments = name,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            };
            using var proc = Process.Start(psi);
            if (proc is null) return null;
            var outp = proc.StandardOutput.ReadToEnd();
            proc.WaitForExit(4000);
            var first = outp.Split(new[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault();
            return first is not null && File.Exists(first) ? first : null;
        }
        catch
        {
            return null;
        }
    }

    // ---- порты ----
    public int ReadApiPort()
    {
        var env = EnvFile.Read(AppConfig.EnvPath);
        return ParsePort(env.GetValueOrDefault("PORT"), AppConfig.DefaultApiPort);
    }

    public int ReadWebPort()
    {
        var env = EnvFile.Read(AppConfig.EnvPath);
        return ParsePort(env.GetValueOrDefault("WEB_PORT"), AppConfig.DefaultWebPort);
    }

    private static int ParsePort(string? value, int fallback)
    {
        if (string.IsNullOrWhiteSpace(value)) return fallback;
        return int.TryParse(value, out var p) && p is > 0 and < 65536 ? p : fallback;
    }

    /// <summary>Записывает порты API и WEB в apps/api/.env.</summary>
    public void SavePorts(int apiPort, int webPort)
    {
        EnvFile.Update(AppConfig.EnvPath, new Dictionary<string, string>
        {
            ["PORT"] = apiPort.ToString(),
            ["WEB_PORT"] = webPort.ToString(),
            ["NEXT_PUBLIC_API_PORT"] = apiPort.ToString(),
            ["NEXT_PUBLIC_API_URL"] = $"http://localhost:{apiPort}/api",
        });
        Log($"Порты сохранены в .env: API={apiPort}, WEB={webPort}.");
    }

    // Желаемые NEXT_PUBLIC_*, которые должны быть "запечены" в сборку фронта.
    private Dictionary<string, string> DesiredWebBuildEnv(int apiPort)
    {
        var env = EnvFile.Read(AppConfig.EnvPath);
        return new Dictionary<string, string>
        {
            ["NEXT_PUBLIC_API_PORT"] = apiPort.ToString(),
            ["NEXT_PUBLIC_API_URL"] = env.GetValueOrDefault("NEXT_PUBLIC_API_URL",
                $"http://localhost:{apiPort}/api"),
        };
    }

    /// <summary>Совпадает ли текущая сборка фронта с выбранным портом API.</summary>
    public bool WebBuildMatches(int apiPort)
    {
        var desired = DesiredWebBuildEnv(apiPort);
        if (!File.Exists(AppConfig.WebBuildMarker))
        {
            return desired["NEXT_PUBLIC_API_PORT"] == AppConfig.DefaultApiPort.ToString()
                && desired["NEXT_PUBLIC_API_URL"] == $"http://localhost:{AppConfig.DefaultApiPort}/api";
        }
        try
        {
            var current = JsonSerializer.Deserialize<Dictionary<string, string>>(
                File.ReadAllText(AppConfig.WebBuildMarker)) ?? new();
            return current.Count == desired.Count
                && desired.All(kv => current.TryGetValue(kv.Key, out var v) && v == kv.Value);
        }
        catch
        {
            return false;
        }
    }

    public void WriteWebBuildMarker(int apiPort)
    {
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(AppConfig.WebBuildMarker)!);
            File.WriteAllText(AppConfig.WebBuildMarker,
                JsonSerializer.Serialize(DesiredWebBuildEnv(apiPort),
                    new JsonSerializerOptions { WriteIndented = true }));
        }
        catch
        {
            // ignore
        }
    }


    private Dictionary<string, string> BuildRuntimeEnv(int apiPort, int webPort)
    {
        var env = EnvFile.Read(AppConfig.EnvPath);
        var localIp = LanIp ?? "127.0.0.1";

        var origins = new List<string>
        {
            $"http://localhost:{webPort}",
            $"http://127.0.0.1:{webPort}",
            $"http://{localIp}:{webPort}",
        };
        var existing = env.GetValueOrDefault("CORS_ORIGIN", string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();
        var cors = string.Join(",", existing.Concat(origins).Distinct());

        return new Dictionary<string, string>
        {
            ["NODE_ENV"] = "production",
            ["PORT"] = apiPort.ToString(),
            ["HOST"] = "0.0.0.0",
            ["CORS_ORIGIN"] = cors,
            ["WEB_PORT"] = webPort.ToString(),
            ["NEXT_PUBLIC_API_PORT"] = apiPort.ToString(),
            ["NEXT_PUBLIC_API_URL"] = env.GetValueOrDefault("NEXT_PUBLIC_API_URL",
                $"http://localhost:{apiPort}/api"),
        };
    }

    private Dictionary<string, string> BuildProcessEnv(Dictionary<string, string>? updates)
    {
        var env = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var kv in Environment.GetEnvironmentVariables())
        {
            if (kv is DictionaryEntry de && de.Key is string k && de.Value is string v)
                env[k] = v;
        }
        foreach (var kv in EnvFile.Read(AppConfig.EnvPath))
            env[kv.Key] = kv.Value;
        foreach (var kv in BuildRuntimeEnv(ReadApiPort(), ReadWebPort()))
            env[kv.Key] = kv.Value;
        if (updates is not null)
            foreach (var kv in updates)
                env[kv.Key] = kv.Value;
        return env;
    }

    private (string FileName, string Args) PmRun(string script)
    {
        if (PackageManagerPath is null)
            throw new InvalidOperationException("Не найден pnpm или npm.");
        return (PackageManagerPath, $"run {script}");
    }

    public CommandResult PmRunCommand(
        string title, string script, Dictionary<string, string>? envUpdates = null, string? stdinText = null)
    {
        var (file, args) = PmRun(script);
        return RunCommand(title, file, args, AppConfig.ApiDir, envUpdates, stdinText);
    }

    public CommandResult RunCommand(
        string title, string fileName, string arguments, string cwd,
        Dictionary<string, string>? envUpdates = null, string? stdinText = null)
    {
        var env = BuildProcessEnv(envUpdates);
        Log($"Запуск команды [{title}]: {Path.GetFileName(fileName)} {arguments}");

        var psi = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = cwd,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            RedirectStandardInput = stdinText is not null,
        };
        foreach (var kv in env)
            psi.Environment[kv.Key] = kv.Value;

        Process proc;
        try
        {
            proc = new Process { StartInfo = psi };
            proc.Start();
        }
        catch (Exception ex)
        {
            Log($"Команда не найдена [{title}]: {ex.Message}");
            return new CommandResult { Code = 1, Output = ex.Message };
        }

        var sb = new StringBuilder();
        void Read(StreamReader reader)
        {
            string? line;
            while ((line = reader.ReadLine()) is not null)
            {
                lock (sb) sb.AppendLine(line);
                Log(line, title);
            }
        }

        var tOut = new Thread(() => Read(proc.StandardOutput)) { IsBackground = true };
        var tErr = new Thread(() => Read(proc.StandardError)) { IsBackground = true };
        tOut.Start();
        tErr.Start();

        if (stdinText is not null)
        {
            try { proc.StandardInput.Write(stdinText); proc.StandardInput.Close(); }
            catch { /* ignore */ }
        }

        int code;
        try
        {
            if (proc.WaitForExit(120_000))
            {
                tOut.Join(2000);
                tErr.Join(2000);
                code = SafeExitCode(proc);
            }
            else
            {
                Try(() => proc.Kill(true));
                code = -1;
            }
        }
        catch
        {
            code = -1;
        }

        Log($"Команда завершена [{title}], код {code}.");
        return new CommandResult { Code = code, Output = sb.ToString() };
    }

    public ServiceProcess StartService(
        string key, string title, string fileName, string arguments, string cwd,
        Dictionary<string, string>? envUpdates = null)
    {
        var env = BuildProcessEnv(envUpdates);
        Log($"Запуск процесса [{title}]: {Path.GetFileName(fileName)} {arguments}");

        var psi = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = cwd,
            UseShellExecute = false,
            CreateNoWindow = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            RedirectStandardInput = true,
        };
        foreach (var kv in env)
            psi.Environment[kv.Key] = kv.Value;

        var proc = new Process { StartInfo = psi, EnableRaisingEvents = true };
        proc.Start();

        _job.AddProcess(proc.Handle);

        var sp = new ServiceProcess { Key = key, Title = title, Process = proc };
        lock (_lock) _services[key] = sp;
        SaveState();

        var reader = new Thread(() =>
        {
            void R(StreamReader r) { string? l; while ((l = r.ReadLine()) is not null) Log(l, title); }
            var a = new Thread(() => R(proc.StandardOutput)) { IsBackground = true };
            var b = new Thread(() => R(proc.StandardError)) { IsBackground = true };
            a.Start(); b.Start();
            proc.WaitForExit();
            a.Join(1500); b.Join(1500);
            Log($"Процесс [{title}] завершился (код {SafeExitCode(proc)}).");
            lock (_lock)
                if (_services.TryGetValue(key, out var cur) && ReferenceEquals(cur, sp))
                    _services.Remove(key);
            SaveState();
        })
        { IsBackground = true };
        reader.Start();

        return sp;
    }

    public bool IsRunning(string key)
    {
        lock (_lock)
        {
            if (_services.TryGetValue(key, out var sp))
                return !sp.Process.HasExited;
        }
        return _knownPids.TryGetValue(key, out var pid) && IsPidAlive(pid);
    }

    public string ServiceStatus(string key, int port)
    {
        lock (_lock)
        {
            if (_services.TryGetValue(key, out var sp) && !sp.Process.HasExited)
                return $"работает (PID {sp.Process.Id})";
        }
        if (_knownPids.TryGetValue(key, out var pid) && IsPidAlive(pid))
            return $"работает (PID {pid})";
        if (PortScanner.IsPortBusy(port))
            return $"порт {port} занят другим процессом";
        return "остановлен";
    }

    public void StopService(string key)
    {
        ServiceProcess? sp;
        lock (_lock)
        {
            _services.TryGetValue(key, out sp);
            _services.Remove(key);
        }

        var title = key == AppConfig.FrontendKey ? "frontend" : "backend";

        if (sp is not null)
        {
            Log($"Остановка [{title}], PID {sp.Process.Id}.");
            KillTree(sp.Process);
        }
        else if (_knownPids.TryGetValue(key, out var pid) && IsPidAlive(pid))
        {
            Log($"Остановка [{title}] по сохранённому PID {pid}.");
            KillPid(pid);
        }

        lock (_lock) _knownPids.Remove(key);
        SaveState();
    }

    public void StopAllServices()
    {
        StopService(AppConfig.FrontendKey);
        StopService(AppConfig.BackendKey);
        lock (_lock) _knownPids.Clear();
        SaveState();
    }

    private static void KillTree(Process proc)
    {
        try
        {
            if (!proc.HasExited)
                proc.Kill(entireProcessTree: true);
            if (!proc.WaitForExit(8000))
                Try(() => { proc.Kill(entireProcessTree: true); proc.WaitForExit(4000); });
        }
        catch
        {
            // процесс мог умереть сам
        }
    }

    private static void KillPid(int pid)
    {
        try
        {
            using var p = Process.GetProcessById(pid);
            if (!p.HasExited)
                p.Kill(entireProcessTree: true);
        }
        catch
        {
            // ignore
        }
    }

    private static void Try(Action action)
    {
        try { action(); } catch { /* ignore */ }
    }

    private static int SafeExitCode(Process p)
    {
        try { return p.HasExited ? p.ExitCode : -1; }
        catch { return -1; }
    }

    private static Dictionary<string, int> LoadState()
    {
        try
        {
            if (!File.Exists(AppConfig.StatePath)) return new();
            var json = File.ReadAllText(AppConfig.StatePath);
            var data = JsonSerializer.Deserialize<Dictionary<string, int>>(json) ?? new();
            return data.Where(kv => kv.Key is AppConfig.BackendKey or AppConfig.FrontendKey && kv.Value > 0)
                .ToDictionary(kv => kv.Key, kv => kv.Value);
        }
        catch
        {
            return new();
        }
    }

    private void SaveState()
    {
        try
        {
            Directory.CreateDirectory(AppConfig.StateDir);
            var live = new Dictionary<string, int>();
            lock (_lock)
            {
                foreach (var (key, sp) in _services)
                    if (!sp.Process.HasExited)
                        live[key] = sp.Process.Id;
            }
            File.WriteAllText(AppConfig.StatePath,
                JsonSerializer.Serialize(live, new JsonSerializerOptions { WriteIndented = true }));
        }
        catch
        {
            // ignore
        }
    }

    public static bool IsPidAlive(int pid)
    {
        if (pid <= 0) return false;
        try
        {
            using var p = Process.GetProcessById(pid);
            return !p.HasExited;
        }
        catch
        {
            return false;
        }
    }

    public void Dispose()
    {
        _job.Dispose();
    }
}
