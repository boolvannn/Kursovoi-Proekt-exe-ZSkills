namespace DiplomLauncher;

/// <summary>
/// Константы и разрешение путей проекта. Корень ищется подъёмом вверх от exe,
/// поэтому лаунчер работает и из bin, и из опубликованной папки.
/// </summary>
public static class AppConfig
{
    public const string AppName = "ZSkills — Панель управления";
    public const string BackendKey = "backend";
    public const string FrontendKey = "frontend";

    public const int DefaultApiPort = 4000;
    public const int DefaultWebPort = 3000;
    public const int DefaultDbPort = 5432;

    public static readonly string ProjectRoot = FindProjectRoot();

    public static string ApiDir => Path.Combine(ProjectRoot, "apps", "api");
    public static string WebDir => Path.Combine(ProjectRoot, "apps", "web");
    public static string EnvPath => Path.Combine(ApiDir, ".env");
    public static string LogPath => Path.Combine(ProjectRoot, "launcher.log");
    public static string StateDir => Path.Combine(ProjectRoot, ".launcher");
    public static string StatePath => Path.Combine(StateDir, "state.json");

    public static string ApiDistMain => Path.Combine(ApiDir, "dist", "main.js");
    public static string WebNextBuildId => Path.Combine(WebDir, ".next", "BUILD_ID");
    public static string WebBuildMarker => Path.Combine(WebDir, ".next", "launcher-env.json");
    public static string WebNextBin => Path.Combine(
        WebDir, "node_modules", ".bin", "next" + (OperatingSystem.IsWindows() ? ".cmd" : string.Empty));

    private static string FindProjectRoot()
    {
        var candidates = new List<string>();
        var baseDir = AppContext.BaseDirectory;
        candidates.Add(baseDir);

        var dir = new DirectoryInfo(baseDir);
        for (var i = 0; i < 8 && dir is not null; i++)
        {
            candidates.Add(dir.FullName);
            dir = dir.Parent;
        }
        candidates.Add(Directory.GetCurrentDirectory());

        foreach (var candidate in candidates)
        {
            if (File.Exists(Path.Combine(candidate, "apps", "api", "package.json")))
                return candidate;
        }

        return candidates[0];
    }
}
