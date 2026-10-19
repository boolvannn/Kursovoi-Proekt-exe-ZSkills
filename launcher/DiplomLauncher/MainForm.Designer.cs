#nullable enable
using System.Drawing.Drawing2D;

namespace DiplomLauncher;

public partial class MainForm
{
    // Палитра (тёмная тема)
    private static readonly Color Bg = ColorTranslator.FromHtml("#1e1e2e");
    private static readonly Color Panel = ColorTranslator.FromHtml("#27293d");
    private static readonly Color PanelAlt = ColorTranslator.FromHtml("#313244");
    private static readonly Color Fg = ColorTranslator.FromHtml("#e6e6f0");
    private static readonly Color Muted = ColorTranslator.FromHtml("#9aa0c0");
    private static readonly Color Accent = ColorTranslator.FromHtml("#7c6cf0");
    private static readonly Color Ok = ColorTranslator.FromHtml("#4ec9a5");
    private static readonly Color Warn = ColorTranslator.FromHtml("#e0af68");
    private static readonly Color Err = ColorTranslator.FromHtml("#f07178");
    private static readonly Font Base = new("Segoe UI", 9.75f);
    private static readonly Font H1 = new("Segoe UI Semibold", 13f);
    private static readonly Font Mono = new("Cascadia Mono", 9f);

    private void InitializeComponent()
    {
        Text = AppConfig.AppName;
        Size = new Size(1020, 720);
        MinimumSize = new Size(920, 640);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Bg;
        ForeColor = Fg;
        Font = Base;
        FormBorderStyle = FormBorderStyle.Sizable;
        DoubleBuffered = true;

        var tabs = new TabControl { Dock = DockStyle.Fill, Padding = new Point(18, 8) };
        tabs.DrawMode = TabDrawMode.OwnerDrawFixed;
        tabs.DrawItem += Tabs_DrawItem;

        var tabLaunch = new TabPage("Запуск") { BackColor = Bg, ForeColor = Fg, Padding = new Padding(16) };
        var tabPorts = new TabPage("Порты") { BackColor = Bg, ForeColor = Fg, Padding = new Padding(16) };
        var tabSettings = new TabPage("База данных") { BackColor = Bg, ForeColor = Fg, Padding = new Padding(16) };
        var tabLogs = new TabPage("Логи") { BackColor = Bg, ForeColor = Fg, Padding = new Padding(16) };

        tabs.TabPages.Add(tabLaunch);
        tabs.TabPages.Add(tabPorts);
        tabs.TabPages.Add(tabSettings);
        tabs.TabPages.Add(tabLogs);

        BuildLaunchTab(tabLaunch);
        BuildPortsTab(tabPorts);
        BuildSettingsTab(tabSettings);
        BuildLogsTab(tabLogs);

        Controls.Add(tabs);

        Load += (_, _) => tabs.Invalidate();
        FormClosing += MainForm_FormClosing;
    }

    private void Tabs_DrawItem(object? sender, DrawItemEventArgs e)
    {
        var tab = (TabControl)sender!;
        var page = tab.TabPages[e.Index];
        var active = tab.SelectedIndex == e.Index;
        var rect = tab.GetTabRect(e.Index);

        using var bgBrush = new SolidBrush(active ? PanelAlt : Bg);
        e.Graphics.FillRectangle(bgBrush, rect);

        var textColor = active ? Fg : Muted;
        TextRenderer.DrawText(e.Graphics, page.Text, active ? H1 : Base,
            rect, textColor, TextFormatFlags.HorizontalCenter | TextFormatFlags.VerticalCenter);

        if (active)
        {
            using var pen = new Pen(Accent, 3);
            e.Graphics.DrawLine(pen, rect.Left + 6, rect.Bottom - 2, rect.Right - 6, rect.Bottom - 2);
        }
    }

    // ---- вспомогательные фабрики контролов ----
    private static Panel Card(Control parent, int x, int y, int w, int h, string? title = null)
    {
        var card = new Panel
        {
            Location = new Point(x, y), Size = new Size(w, h),
            BackColor = Panel, Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right,
        };
        card.Paint += (_, e) =>
        {
            var path = RoundedRect(new Rectangle(0, 0, card.Width - 1, card.Height - 1), 10);
            using var pen = new Pen(PanelAlt, 1);
            e.Graphics.SmoothingMode = SmoothingMode.AntiAlias;
            e.Graphics.DrawPath(pen, path);
        };
        parent.Controls.Add(card);

        var top = 14;
        if (title is not null)
        {
            var lbl = new Label
            {
                Text = title, Font = H1, ForeColor = Fg, AutoSize = true,
                Location = new Point(16, 12),
            };
            card.Controls.Add(lbl);
            top = 48;
        }
        card.Tag = top;
        return card;
    }

    private static GraphicsPath RoundedRect(Rectangle r, int radius)
    {
        var path = new GraphicsPath();
        var d = radius * 2;
        path.AddArc(r.X, r.Y, d, d, 180, 90);
        path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
        path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
        path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
        path.CloseFigure();
        return path;
    }

    private static Label Label(Control parent, string text, int x, int y, Color? color = null, Font? font = null)
    {
        var lbl = new System.Windows.Forms.Label
        {
            Text = text, Location = new Point(x, y), AutoSize = true,
            ForeColor = color ?? Muted, Font = font ?? Base, BackColor = Color.Transparent,
        };
        parent.Controls.Add(lbl);
        return lbl;
    }

    private static Button Button(Control parent, string text, int x, int y, int w, int h, EventHandler onClick, Color? color = null)
    {
        var btn = new Button
        {
            Text = text, Location = new Point(x, y), Size = new Size(w, h),
            FlatStyle = FlatStyle.Flat, BackColor = color ?? Accent,
            ForeColor = Color.White, Font = Base, Cursor = Cursors.Hand,
        };
        btn.FlatAppearance.BorderSize = 0;
        btn.FlatAppearance.MouseOverBackColor = ControlPaint.Light(color ?? Accent, 0.15f);
        btn.Click += onClick;
        parent.Controls.Add(btn);
        return btn;
    }

    private void BuildLaunchTab(TabPage page)
    {
        var content = new Panel { Dock = DockStyle.Fill, BackColor = Bg, AutoScroll = true };
        page.Controls.Add(content);

        // Карточка портов
        var portsCard = Card(content, 0, 0, 520, 220, "Порты сервисов");
        Label(portsCard, "Backend (API)", 16, 54);
        _apiPort = PortBox(portsCard, 130, 50, 120);
        _apiPortState = PortStateLabel(portsCard, 262, 54);
        Button(portsCard, "Проверить", 392, 48, 96, 30, (_, _) => RefreshPortState(), PanelAlt);

        Label(portsCard, "Frontend (Web)", 16, 96);
        _webPort = PortBox(portsCard, 130, 92, 120);
        _webPortState = PortStateLabel(portsCard, 262, 96);
        Button(portsCard, "Проверить", 392, 90, 96, 30, (_, _) => RefreshPortState(), PanelAlt);

        var applyBtn = Button(portsCard, "Применить порты (записать в .env)", 16, 140, 230, 34,
            (_, _) => ApplyPorts());
        var openPortsBtn = Button(portsCard, "Открыть вкладку «Порты»", 258, 140, 230, 34,
            (_, _) => ((TabControl)page.Parent!).SelectedIndex = 1, PanelAlt);
        _ = applyBtn; _ = openPortsBtn;

        Label(portsCard, "Порты сохраняются в apps/api/.env и применяются при запуске.",
            16, 182, Muted, new Font("Segoe UI", 8.5f));

        // Карточка запуска
        var runCard = Card(content, 0, 236, 520, 210, "Управление");
        _startButton = Button(runCard, "▶  Запустить проект", 16, 54, 472, 48, (_, _) => StartProject(), Ok);
        _stopButton = Button(runCard, "■  Остановить проект", 16, 112, 472, 44,
            (_, _) => StopProject(), Err);

        // Карточка статуса (справа)
        var statusCard = Card(content, 536, 0, 400, 300, "Статус");
        _backendStatus = StatusValue(statusCard, "Backend", 56);
        _frontendStatus = StatusValue(statusCard, "Frontend", 106);
        _pmStatus = StatusValue(statusCard, "Пакетный менеджер", 156);
        _launchStatus = StatusValue(statusCard, "Состояние", 206);

        // Карточка адресов (справа снизу)
        var addrCard = Card(content, 536, 316, 400, 130, "Адреса сайта");
        Label(addrCard, "Локально", 16, 54);
        _localUrl = UrlBox(addrCard, 110, 50, 268);
        Label(addrCard, "В сети", 16, 96);
        _lanUrl = UrlBox(addrCard, 110, 92, 268);

        Button(content, "Открыть сайт в браузере", 536, 458, 400, 40, (_, _) => OpenSite());

        // Стартовый таймер статуса
        _statusTimer = new System.Windows.Forms.Timer { Interval = 1000 };
        _statusTimer.Tick += (_, _) => RefreshStatuses();
    }

    private static NumericUpDown PortBox(Control parent, int x, int y, int w)
    {
        var box = new NumericUpDown
        {
            Location = new Point(x, y), Size = new Size(w, 30),
            Minimum = 1, Maximum = 65535, Font = Base,
            BackColor = PanelAlt, ForeColor = Fg, BorderStyle = BorderStyle.FixedSingle,
            TextAlign = HorizontalAlignment.Center,
        };
        parent.Controls.Add(box);
        return box;
    }

    private static Label PortStateLabel(Control parent, int x, int y)
    {
        var lbl = new System.Windows.Forms.Label
        {
            Location = new Point(x, y), AutoSize = true, Font = Base, ForeColor = Muted,
            BackColor = Color.Transparent,
        };
        parent.Controls.Add(lbl);
        return lbl;
    }

    private static Label StatusValue(Control parent, string title, int y)
    {
        Label(parent, title, 16, y);
        var val = new System.Windows.Forms.Label
        {
            Location = new Point(150, y - 2), AutoSize = false, Size = new Size(240, 26),
            Font = Base, ForeColor = Fg, BackColor = Color.Transparent,
            TextAlign = ContentAlignment.MiddleLeft,
        };
        parent.Controls.Add(val);
        return val;
    }

    private static TextBox UrlBox(Control parent, int x, int y, int w)
    {
        var box = new TextBox
        {
            Location = new Point(x, y), Size = new Size(w, 28),
            ReadOnly = true, Font = Base, BackColor = PanelAlt, ForeColor = Fg,
            BorderStyle = BorderStyle.FixedSingle,
        };
        parent.Controls.Add(box);
        return box;
    }

    private void BuildPortsTab(TabPage page)
    {
        var content = new Panel { Dock = DockStyle.Fill, BackColor = Bg };
        page.Controls.Add(content);

        var card = Card(content, 0, 0, 900, 460, "Занятые и свободные порты");
        _portsHint = new System.Windows.Forms.Label
        {
            Text = "Зелёный — свободен, красный — занят. Можно освободить порт одной кнопкой.",
            Location = new Point(16, 52), AutoSize = true, ForeColor = Muted, Font = new Font("Segoe UI", 8.5f),
            BackColor = Color.Transparent,
        };
        card.Controls.Add(_portsHint);

        var apiPort = _engine.ReadApiPort();
        var webPort = _engine.ReadWebPort();
        var dbPort = AppConfig.DefaultDbPort;

        _ = PortRow(card, "Backend API", apiPort, 84);
        _ = PortRow(card, "Frontend Web", webPort, 132);
        _ = PortRow(card, "PostgreSQL", dbPort, 180);

        var refreshBtn = Button(card, "Обновить состояние портов", 16, 232, 220, 34,
            (_, _) => { RefreshPortState(); BuildPortsTab_RefreshList(card); }, PanelAlt);

        Label(card, "Все прослушиваемые порты (LISTEN):", 16, 280);
        _portsList = new ListView
        {
            Location = new Point(16, 306), Size = new Size(852, 130), View = View.Details,
            FullRowSelect = true, GridLines = true, BackColor = PanelAlt, ForeColor = Fg,
            Font = Mono, BorderStyle = BorderStyle.FixedSingle,
        };
        _portsList.Columns.Add("Порт", 120);
        _portsList.Columns.Add("PID", 100);
        _portsList.Columns.Add("Процесс", 200);
        _portsList.Columns.Add("Состояние", 180);
        card.Controls.Add(_portsList);

        _ = refreshBtn;
        RefreshPortsList();
    }

    private void BuildPortsTab_RefreshList(Panel card) => RefreshPortsList();

    private (Label State, Button Free) PortRow(Panel card, string title, int port, int y)
    {
        Label(card, $"{title}  (порт {port})", 16, y, Fg);
        var state = new System.Windows.Forms.Label
        {
            Location = new Point(260, y - 2), Size = new Size(220, 24),
            ForeColor = Fg, Font = Base, BackColor = Color.Transparent,
        };
        card.Controls.Add(state);

        var free = new Button
        {
            Text = "Освободить", Location = new Point(500, y - 4), Size = new Size(120, 30),
            FlatStyle = FlatStyle.Flat, BackColor = Warn, ForeColor = Color.Black,
            Font = new Font("Segoe UI", 8.5f), Cursor = Cursors.Hand,
            Tag = port,
        };
        free.FlatAppearance.BorderSize = 0;
        free.Click += (_, _) =>
        {
            if (!PortScanner.IsPortBusy(port))
            {
                MessageBox.Show($"Порт {port} уже свободен.", AppConfig.AppName,
                    MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
            var owner = PortScanner.Owner(port);
            var confirm = MessageBox.Show(
                $"Завершить процесс{(owner is null ? "" : $" «{owner.ProcessName}» (PID {owner.Pid})")}, " +
                $"который занимает порт {port}?",
                AppConfig.AppName, MessageBoxButtons.YesNo, MessageBoxIcon.Warning);
            if (confirm != DialogResult.Yes) return;

            var ok = PortScanner.FreePort(port);
            MessageBox.Show(ok ? $"Порт {port} освобождён." : $"Не удалось освободить порт {port}.",
                AppConfig.AppName, MessageBoxButtons.OK,
                ok ? MessageBoxIcon.Information : MessageBoxIcon.Error);
            RefreshPortState();
            RefreshPortsList();
        };
        card.Controls.Add(free);

        PortStateLabels[port] = state;
        return (state, free);
    }

    private void RefreshPortsList()
    {
        if (_portsList is null || IsDisposed) return;
        if (_portsList.InvokeRequired) { try { _portsList.BeginInvoke(RefreshPortsList); } catch { } return; }

        _portsList.Items.Clear();
        foreach (var info in PortScanner.GetListeners().OrderBy(p => p.Port))
        {
            var item = new ListViewItem(info.Port.ToString());
            item.SubItems.Add(info.Pid.ToString());
            item.SubItems.Add(info.ProcessName);
            item.SubItems.Add("LISTEN");
            _portsList.Items.Add(item);
        }
    }

    private void BuildSettingsTab(TabPage page)
    {
        var content = new Panel { Dock = DockStyle.Fill, BackColor = Bg, AutoScroll = true };
        page.Controls.Add(content);

        var card = Card(content, 0, 0, 640, 340, "Подключение к базе данных");
        var rows = new (string Label, Func<TextBox> Box)[]
        {
            ("DB_HOST", () => Field(card, "DB_HOST", 58, ref _dbHost, false)),
            ("DB_PORT", () => Field(card, "DB_PORT", 98, ref _dbPort, false)),
            ("DB_NAME", () => Field(card, "DB_NAME", 138, ref _dbName, false)),
            ("DB_USER", () => Field(card, "DB_USER", 178, ref _dbUser, false)),
            ("DB_PASSWORD", () => Field(card, "DB_PASSWORD", 218, ref _dbPassword, true)),
        };
        foreach (var (_, factory) in rows) factory();

        Button(card, "Загрузить из .env", 200, 262, 160, 34, (_, _) => LoadDbSettings(), PanelAlt);
        Button(card, "Сохранить в .env", 372, 262, 160, 34, (_, _) => SaveDbSettings());

        _settingsStatus = new System.Windows.Forms.Label
        {
            Location = new Point(16, 306), Size = new Size(560, 24), ForeColor = Muted,
            Font = new Font("Segoe UI", 8.5f), BackColor = Color.Transparent,
        };
        card.Controls.Add(_settingsStatus);

        Label(content, "Лаунчер обновляет DATABASE_URL и DB_* в apps/api/.env. " +
                       "Перед записью создаётся резервная копия.", 16, 356, Muted, new Font("Segoe UI", 8.5f));
    }

    private TextBox Field(Panel card, string label, int y, ref TextBox target, bool secret)
    {
        Label(card, label, 16, y + 4, Fg);
        var box = new TextBox
        {
            Location = new Point(140, y), Size = new Size(300, 28), Font = Base,
            BackColor = PanelAlt, ForeColor = Fg, BorderStyle = BorderStyle.FixedSingle,
            UseSystemPasswordChar = secret,
        };
        card.Controls.Add(box);
        target = box;
        return box;
    }

    private void BuildLogsTab(TabPage page)
    {
        var content = new Panel { Dock = DockStyle.Fill, BackColor = Bg };
        page.Controls.Add(content);

        _logBox = new RichTextBox
        {
            Location = new Point(16, 16), Size = new Size(868, 380),
            ReadOnly = true, Font = Mono, BackColor = PanelAlt, ForeColor = Fg,
            BorderStyle = BorderStyle.FixedSingle, Anchor = AnchorStyles.Top
                | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right,
        };
        content.Controls.Add(_logBox);

        var clearBtn = Button(content, "Очистить окно", 16, 408, 160, 36,
            (_, _) => _logBox.Clear(), PanelAlt);
        var openBtn = Button(content, "Открыть launcher.log", 188, 408, 200, 36,
            (_, _) => OpenLogFile());
        _ = clearBtn; _ = openBtn;
    }

    // MORE_UI4




}



