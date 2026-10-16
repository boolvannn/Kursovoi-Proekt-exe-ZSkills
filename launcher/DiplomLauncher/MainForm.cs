using System.Diagnostics;

namespace DiplomLauncher;

public partial class MainForm : Form
{
    private LauncherEngine _engine = null!;
    private LaunchController _controller = null!;
    private System.Windows.Forms.Timer _statusTimer = null!;

    // Поля портов
    private NumericUpDown _apiPort = null!;
    private NumericUpDown _webPort = null!;
    private Label _apiPortState = null!;
    private Label _webPortState = null!;

    // Статус запуска
    private Label _backendStatus = null!;
    private Label _frontendStatus = null!;
    private Label _pmStatus = null!;
    private Label _launchStatus = null!;

    // Адреса
    private TextBox _localUrl = null!;
    private TextBox _lanUrl = null!;

    // Кнопки запуска
    private Button _startButton = null!;
    private Button _stopButton = null!;

    // Порты (вкладка)
    private ListView _portsList = null!;
    private Label _portsHint = null!;
    private readonly Dictionary<int, Label> PortStateLabels = new();

    // Настройки БД
    private TextBox _dbHost = null!;
    private TextBox _dbPort = null!;
    private TextBox _dbName = null!;
    private TextBox _dbUser = null!;
    private TextBox _dbPassword = null!;
    private Label _settingsStatus = null!;

    // Логи
    private RichTextBox _logBox = null!;

    public MainForm()
    {
        // Движок должен существовать до построения UI: вкладки читают порты из .env.
        _engine = new LauncherEngine(AppendLog);
        _controller = new LaunchController(_engine);
        _engine.Initialize();

        InitializeComponent();

        _apiPort.Value = _engine.ReadApiPort();
        _webPort.Value = _engine.ReadWebPort();
        LoadDbSettings();
        RefreshPortState();
        RefreshAddresses();
        RefreshStatuses();

        _statusTimer.Start();
    }

    private readonly object _fileLogLock = new();

    private void AppendLog(string source, string message)
    {
        var line = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] [{source}] {message}";

        // Пишем в файл launcher.log (как в прежней версии), потокобезопасно.
        try
        {
            lock (_fileLogLock)
            {
                Directory.CreateDirectory(Path.GetDirectoryName(AppConfig.LogPath)!);
                File.AppendAllText(AppConfig.LogPath, line + Environment.NewLine);
            }
        }
        catch
        {
            // игнорируем ошибки записи файла
        }

        if (IsDisposed || _logBox is null) return;
        try
        {
            if (_logBox.InvokeRequired)
                _logBox.BeginInvoke(new Action(() => AppendLogLine(line)));
            else
                AppendLogLine(line);
        }
        catch
        {
            // форма может быть в процессе закрытия
        }
    }

    private void AppendLogLine(string line)
    {
        _logBox.AppendText(line + Environment.NewLine);
    }


    private void StartProject()
    {
        var apiPort = (int)_apiPort.Value;
        var webPort = (int)_webPort.Value;

        if (apiPort == webPort)
        {
            MessageBox.Show("Порты API и Web должны отличаться.", AppConfig.AppName,
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        SetBusy(true);
        AppendLog("launcher", $"Запуск проекта: API={apiPort}, WEB={webPort}...");

        var thread = new Thread(() =>
        {
            string? error = null;
            try
            {
                error = _controller.Run(apiPort, webPort, Progress, RefreshAddressesUi);
            }
            catch (Exception ex)
            {
                error = ex.Message;
            }
            Done(error);
        })
        { IsBackground = true };
        thread.Start();
    }

    private void Progress(string message)
    {
        if (IsDisposed) return;
        if (InvokeRequired) { try { BeginInvoke(new Action(() => Progress(message))); } catch { } return; }
        _launchStatus.Text = message;
        _launchStatus.ForeColor = message.Contains("успешно") ? Ok : Fg;
    }

    private void Done(string? error)
    {
        if (IsDisposed) return;
        if (InvokeRequired) { try { BeginInvoke(new Action(() => Done(error))); } catch { } return; }
        SetBusy(false);
        if (error is null)
        {
            _launchStatus.Text = "Проект запущен.";
            _launchStatus.ForeColor = Ok;
        }
        else
        {
            _launchStatus.Text = "Ошибка запуска";
            _launchStatus.ForeColor = Err;
            MessageBox.Show(error, AppConfig.AppName, MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
        RefreshStatuses();
        RefreshAddressesUi();
    }

    private void StopProject()
    {
        SetBusy(true);
        AppendLog("launcher", "Остановка проекта...");
        var thread = new Thread(() =>
        {
            try { _engine.StopAllServices(); }
            catch (Exception ex) { AppendLog("launcher", $"Ошибка остановки: {ex.Message}"); }
            if (IsDisposed) return;
            if (InvokeRequired) { try { BeginInvoke(Stopped); } catch { } }
            else Stopped();
        })
        { IsBackground = true };
        thread.Start();
    }

    private void Stopped()
    {
        SetBusy(false);
        _launchStatus.Text = "Проект остановлен.";
        _launchStatus.ForeColor = Fg;
        RefreshStatuses();
    }

    private void SetBusy(bool busy)
    {
        if (IsDisposed) return;
        if (InvokeRequired) { try { BeginInvoke(new Action(() => SetBusy(busy))); } catch { } return; }
        _startButton.Enabled = !busy;
        _stopButton.Enabled = !busy;
        Cursor = busy ? Cursors.WaitCursor : Cursors.Default;
    }

    private void ApplyPorts()
    {
        var apiPort = (int)_apiPort.Value;
        var webPort = (int)_webPort.Value;

        if (apiPort == webPort)
        {
            MessageBox.Show("Порты API и Web должны отличаться.", AppConfig.AppName,
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        if (PortScanner.IsPortBusy(apiPort) && !_engine.IsRunning(AppConfig.BackendKey))
        {
            var owner = PortScanner.Owner(apiPort);
            MessageBox.Show(
                $"Порт API {apiPort} уже занят" +
                (owner is null ? "." : $" процессом «{owner.ProcessName}» (PID {owner.Pid}).") +
                "\nОсвободите его на вкладке «Порты» или выберите другой.",
                AppConfig.AppName, MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
        if (PortScanner.IsPortBusy(webPort) && !_engine.IsRunning(AppConfig.FrontendKey))
        {
            var owner = PortScanner.Owner(webPort);
            MessageBox.Show(
                $"Порт Web {webPort} уже занят" +
                (owner is null ? "." : $" процессом «{owner.ProcessName}» (PID {owner.Pid}).") +
                "\nОсвободите его на вкладке «Порты» или выберите другой.",
                AppConfig.AppName, MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }

        _engine.SavePorts(apiPort, webPort);
        RefreshAddressesUi();
        RefreshPortState();
        MessageBox.Show($"Порты сохранены: API={apiPort}, WEB={webPort}.", AppConfig.AppName,
            MessageBoxButtons.OK, MessageBoxIcon.Information);
    }

    private void RefreshPortState()
    {
        if (IsDisposed || _apiPortState is null) return;
        if (InvokeRequired) { try { BeginInvoke(RefreshPortState); } catch { } return; }

        SetPortState(_apiPortState, (int)_apiPort.Value);
        SetPortState(_webPortState, (int)_webPort.Value);

        // обновляем метки на вкладке «Порты»
        foreach (var (port, label) in PortStateLabels)
        {
            if (!label.IsDisposed)
                SetPortState(label, port);
        }

        RefreshPortsList();
    }

    private void SetPortState(System.Windows.Forms.Label label, int port)
    {
        if (PortScanner.IsPortBusy(port))
        {
            var owner = PortScanner.Owner(port);
            label.Text = owner is null ? "занят" : $"занят: {owner.ProcessName} (PID {owner.Pid})";
            label.ForeColor = Err;
        }
        else
        {
            label.Text = "свободен";
            label.ForeColor = Ok;
        }
    }

    private void RefreshAddressesUi()
    {
        if (IsDisposed) return;
        if (InvokeRequired) { try { BeginInvoke(RefreshAddressesUi); } catch { } return; }
        var webPort = (int)_webPort.Value;
        _localUrl.Text = $"http://localhost:{webPort}";
        _lanUrl.Text = _engine.LanIp is not null
            ? $"http://{_engine.LanIp}:{webPort}"
            : "IP не определён";
    }

    private void RefreshAddresses() => RefreshAddressesUi();

    private void RefreshStatuses()
    {
        if (IsDisposed || _backendStatus is null) return;
        if (InvokeRequired) { try { BeginInvoke(RefreshStatuses); } catch { } return; }

        var apiPort = (int)_apiPort.Value;
        var webPort = (int)_webPort.Value;
        SetStatus(_backendStatus, _engine.ServiceStatus(AppConfig.BackendKey, apiPort));
        SetStatus(_frontendStatus, _engine.ServiceStatus(AppConfig.FrontendKey, webPort));
        _pmStatus.Text = _engine.PackageManagerName;
    }

    private void SetStatus(System.Windows.Forms.Label label, string text)
    {
        label.Text = text;
        label.ForeColor = text.StartsWith("работает") ? Ok
            : text.StartsWith("порт") ? Err
            : Muted;
    }

    private void LoadDbSettings()
    {
        if (IsDisposed) return;
        if (InvokeRequired) { try { BeginInvoke(LoadDbSettings); } catch { } return; }

        var env = EnvFile.Read(AppConfig.EnvPath);
        _dbHost.Text = env.GetValueOrDefault("DB_HOST", "localhost");
        _dbPort.Text = env.GetValueOrDefault("DB_PORT", AppConfig.DefaultDbPort.ToString());
        _dbName.Text = env.GetValueOrDefault("DB_NAME", "diplom");
        _dbUser.Text = env.GetValueOrDefault("DB_USER", "postgres");
        _dbPassword.Text = env.GetValueOrDefault("DB_PASSWORD", string.Empty);
        if (_settingsStatus is not null)
            _settingsStatus.Text = "Настройки загружены из apps/api/.env.";
    }

    private void SaveDbSettings()
    {
        var host = _dbHost.Text.Trim();
        var port = _dbPort.Text.Trim();
        var name = _dbName.Text.Trim();
        var user = _dbUser.Text.Trim();
        var password = _dbPassword.Text;

        if (string.IsNullOrEmpty(host) || string.IsNullOrEmpty(name) || string.IsNullOrEmpty(user)
            || !port.All(char.IsDigit))
        {
            MessageBox.Show("Проверьте поля: хост, порт (число), имя БД и пользователь обязательны.",
                AppConfig.AppName, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        try
        {
            var backup = (string?)null;
            if (File.Exists(AppConfig.EnvPath))
            {
                backup = Path.Combine(Path.GetDirectoryName(AppConfig.EnvPath)!,
                    $".env.backup-{DateTime.Now:yyyyMMdd-HHmmss}");
                File.Copy(AppConfig.EnvPath, backup);
            }

            var url = $"postgresql://{Uri.EscapeDataString(user)}:{Uri.EscapeDataString(password)}" +
                      $"@{host}:{port}/{Uri.EscapeDataString(name)}?schema=public";
            EnvFile.Update(AppConfig.EnvPath, new Dictionary<string, string>
            {
                ["DATABASE_URL"] = url,
                ["DB_HOST"] = host,
                ["DB_PORT"] = port,
                ["DB_NAME"] = name,
                ["DB_USER"] = user,
                ["DB_PASSWORD"] = password,
            });

            _settingsStatus.Text = backup is not null
                ? $"Настройки сохранены. Backup: {Path.GetFileName(backup)}"
                : "Настройки сохранены (создан новый .env).";
            AppendLog("launcher", "Настройки БД сохранены, пароль не выводится в лог.");
        }
        catch (Exception ex)
        {
            _settingsStatus.Text = $"Ошибка сохранения: {ex.Message}";
        }
    }

    private void OpenSite()
    {
        var url = _localUrl.Text;
        if (string.IsNullOrWhiteSpace(url))
        {
            MessageBox.Show("Адрес сайта пока не определён.", AppConfig.AppName,
                MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        TryOpen(url);
    }

    private void OpenLogFile()
    {
        try { File.Create(AppConfig.LogPath).Close(); }
        catch { /* ignore */ }
        TryOpen(AppConfig.LogPath);
    }

    private static void TryOpen(string target)
    {
        try
        {
            System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
            {
                FileName = target, UseShellExecute = true,
            });
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Не удалось открыть: {ex.Message}", AppConfig.AppName,
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }

    private void MainForm_FormClosing(object? sender, FormClosingEventArgs e)
    {
        var running = _engine.IsRunning(AppConfig.BackendKey) || _engine.IsRunning(AppConfig.FrontendKey);
        if (running)
        {
            var result = MessageBox.Show(
                "Проект запущен. Остановить процессы перед закрытием?",
                AppConfig.AppName, MessageBoxButtons.YesNoCancel, MessageBoxIcon.Question);
            if (result == DialogResult.Cancel) { e.Cancel = true; return; }
            if (result == DialogResult.Yes) _engine.StopAllServices();
        }
        _statusTimer?.Stop();
        _engine?.Dispose();
    }
}

