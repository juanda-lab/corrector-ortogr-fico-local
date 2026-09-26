// Instalador de Corrector Local. Desarrollado por Daniel.
// Se compila con construir.ps1 (usa el compilador de C# que trae Windows).
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("Instalador de Corrector Local")]
[assembly: AssemblyDescription("Corrector ortográfico local para el navegador")]
[assembly: AssemblyCompany("Daniel Diaz")]
[assembly: AssemblyProduct("Corrector Local")]
[assembly: AssemblyCopyright("© 2026 Daniel Diaz. Licencia MIT.")]
[assembly: AssemblyVersion("1.1.0.0")]
[assembly: AssemblyFileVersion("1.1.0.0")]
[assembly: AssemblyInformationalVersion("1.1.0")]

static class Program
{
    [DllImport("user32.dll")]
    static extern bool SetProcessDPIAware();

    [STAThread]
    static void Main()
    {
        try { SetProcessDPIAware(); } catch { }
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        Application.Run(new InstallerForm());
    }
}

class InstallerForm : Form
{
    const string AppName = "Corrector Local";
    const string Version = "1.1.0";
    const string Publisher = "Daniel Diaz";
    const string UninstallKey = @"Software\Microsoft\Windows\CurrentVersion\Uninstall\CorrectorLocal";
    const string StartupFile = "LanguageTool local.vbs";
    // 127.0.0.1 y no "localhost": el servidor solo escucha en IPv4 y Windows tarda ~2 s en descartar ::1
    const string ServerUrl = "http://127.0.0.1:8081/v2/languages";

    static readonly Color Accent = Color.FromArgb(37, 99, 235);
    static readonly Color Muted = Color.FromArgb(100, 106, 115);
    static readonly Color Line = Color.FromArgb(226, 228, 232);

    Panel pageLicense, pageChoose, pageProgress, pageDone;
    TextBox pathBox, extPathBox;
    CheckBox acceptBox;
    Button nextBtn, installBtn, cancelBtn, finishBtn;
    ProgressBar bar;
    Label statusLabel, serverLabel;
    string installDir;

    public InstallerForm()
    {
        SuspendLayout();
        AutoScaleDimensions = new SizeF(96F, 96F);
        AutoScaleMode = AutoScaleMode.Dpi;
        Text = "Instalar " + AppName;
        Font = new Font("Segoe UI", 9.5F);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(600, 440);
        BackColor = Color.White;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

        Controls.Add(BuildHeader());
        pageLicense = BuildLicensePage();
        pageChoose = BuildChoosePage();
        pageProgress = BuildProgressPage();
        pageDone = BuildDonePage();
        foreach (Panel p in Pages)
        {
            p.SetBounds(0, 96, 600, 284);
            Controls.Add(p);
        }
        Controls.Add(BuildFooter());
        ShowPage(pageLicense);
        Shown += (s, e) => acceptBox.Focus(); // evita que el texto de la licencia aparezca seleccionado
        ResumeLayout(false);
    }

    // ---------- Interfaz ----------

    Control BuildHeader()
    {
        var header = new Panel { Bounds = new Rectangle(0, 0, 600, 96), BackColor = Color.FromArgb(246, 248, 252) };
        header.Paint += (s, e) => e.Graphics.DrawLine(new Pen(Line), 0, header.Height - 1, header.Width, header.Height - 1);

        var logo = new PictureBox { Bounds = new Rectangle(24, 18, 60, 60), SizeMode = PictureBoxSizeMode.Zoom };
        using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("logo.png"))
            if (s != null) logo.Image = Image.FromStream(s);
        header.Controls.Add(logo);

        header.Controls.Add(new Label
        {
            Text = AppName, Bounds = new Rectangle(98, 20, 480, 32),
            Font = new Font("Segoe UI Semibold", 16F), ForeColor = Color.FromArgb(28, 29, 31), BackColor = Color.Transparent
        });
        header.Controls.Add(new Label
        {
            Text = "Corrector ortográfico para tu navegador  ·  Desarrollado por Daniel",
            Bounds = new Rectangle(100, 54, 480, 22), ForeColor = Muted, BackColor = Color.Transparent
        });
        return header;
    }

    Control BuildFooter()
    {
        var footer = new Panel { Bounds = new Rectangle(0, 380, 600, 60), BackColor = Color.FromArgb(246, 248, 252) };
        footer.Paint += (s, e) => e.Graphics.DrawLine(new Pen(Line), 0, 0, footer.Width, 0);

        footer.Controls.Add(new Label { Text = "v" + Version, Bounds = new Rectangle(24, 21, 100, 20), ForeColor = Muted });

        cancelBtn = MakeButton("Cancelar", false);
        cancelBtn.Location = new Point(378, 14);
        cancelBtn.Click += (s, e) => Close();

        nextBtn = MakeButton("Siguiente", true);
        nextBtn.Location = new Point(484, 14);
        nextBtn.Enabled = false;
        nextBtn.Click += (s, e) => { ShowPage(pageChoose); nextBtn.Visible = false; installBtn.Visible = true; AcceptButton = installBtn; };

        installBtn = MakeButton("Instalar", true);
        installBtn.Location = new Point(484, 14);
        installBtn.Visible = false;
        installBtn.Click += (s, e) => StartInstall();

        finishBtn = MakeButton("Finalizar", true);
        finishBtn.Location = new Point(484, 14);
        finishBtn.Visible = false;
        finishBtn.Click += (s, e) => Close();

        footer.Controls.AddRange(new Control[] { cancelBtn, nextBtn, installBtn, finishBtn });
        return footer;
    }

    Panel BuildLicensePage()
    {
        var p = new Panel();
        p.Controls.Add(new Label
        {
            Text = "Licencia y privacidad", Bounds = new Rectangle(24, 14, 540, 24),
            Font = new Font("Segoe UI Semibold", 11F)
        });

        string text = "";
        using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("licencia.txt"))
            if (s != null) using (var r = new StreamReader(s)) text = r.ReadToEnd();
        p.Controls.Add(new TextBox
        {
            Bounds = new Rectangle(24, 44, 552, 196), Multiline = true, ReadOnly = true, WordWrap = true,
            ScrollBars = ScrollBars.Vertical, BackColor = Color.FromArgb(246, 248, 252),
            Font = new Font("Consolas", 8.5F), Text = text.Replace("\r\n", "\n").Replace("\n", "\r\n")
        });

        acceptBox = new CheckBox { Text = "Acepto los términos de la licencia", Bounds = new Rectangle(24, 248, 400, 26) };
        acceptBox.CheckedChanged += (s, e) => nextBtn.Enabled = acceptBox.Checked;
        p.Controls.Add(acceptBox);
        return p;
    }

    Panel BuildChoosePage()
    {
        var p = new Panel();
        p.Controls.Add(new Label
        {
            Text = "¿Dónde quieres instalarlo?", Bounds = new Rectangle(24, 24, 540, 24),
            Font = new Font("Segoe UI Semibold", 11F)
        });
        p.Controls.Add(new Label
        {
            Text = "Elige una carpeta fija: el corrector funciona desde ahí, no la muevas ni la borres después.",
            Bounds = new Rectangle(24, 52, 552, 22), ForeColor = Muted
        });

        pathBox = new TextBox
        {
            Bounds = new Rectangle(24, 88, 440, 28),
            Text = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "CorrectorLocal")
        };
        p.Controls.Add(pathBox);

        var browse = MakeButton("Examinar…", false);
        browse.Bounds = new Rectangle(472, 86, 104, 30);
        browse.Click += (s, e) => Browse();
        p.Controls.Add(browse);

        p.Controls.Add(new Label
        {
            Text = "Qué se va a hacer:\r\n" +
                   "  •  Copiar el corrector (LanguageTool) y Java a esa carpeta  —  unos 550 MB\r\n" +
                   "  •  Hacer que arranque solo cada vez que prendas el PC\r\n" +
                   "  •  Añadirlo a \"Aplicaciones instaladas\" de Windows para poder desinstalarlo\r\n" +
                   "  •  Al final, abrir Edge para que añadas la extensión (3 clics)\r\n\r\n" +
                   "No necesita permisos de administrador. Nada de lo que escribes sale de tu PC.",
            Bounds = new Rectangle(24, 136, 552, 140), ForeColor = Color.FromArgb(55, 60, 68)
        });
        return p;
    }

    Panel BuildProgressPage()
    {
        var p = new Panel();
        p.Controls.Add(new Label
        {
            Text = "Instalando…", Bounds = new Rectangle(24, 24, 540, 24),
            Font = new Font("Segoe UI Semibold", 11F)
        });
        bar = new ProgressBar { Bounds = new Rectangle(24, 72, 552, 22), Minimum = 0, Maximum = 100 };
        p.Controls.Add(bar);
        statusLabel = new Label { Bounds = new Rectangle(24, 104, 552, 44), ForeColor = Muted };
        p.Controls.Add(statusLabel);
        return p;
    }

    Panel BuildDonePage()
    {
        var p = new Panel();
        p.Controls.Add(new Label
        {
            Text = "¡Listo! Solo falta añadir la extensión a Edge", Bounds = new Rectangle(24, 16, 540, 24),
            Font = new Font("Segoe UI Semibold", 11F)
        });
        serverLabel = new Label { Bounds = new Rectangle(24, 42, 552, 20), ForeColor = Muted };
        p.Controls.Add(serverLabel);

        p.Controls.Add(new Label
        {
            Text = "1.  Pulsa \"Abrir extensiones de Edge\".\r\n" +
                   "2.  Activa \"Modo de desarrollador\" (panel izquierdo de Edge).\r\n" +
                   "3.  Pulsa \"Cargar desempaquetada\", pega la ruta (Ctrl+V) y acepta.\r\n" +
                   "      (La ruta ya está copiada; si hace falta, usa \"Copiar ruta\".)\r\n" +
                   "4.  Recarga WhatsApp Web y escribe: los errores aparecerán subrayados.",
            Bounds = new Rectangle(24, 72, 552, 104), ForeColor = Color.FromArgb(55, 60, 68)
        });

        extPathBox = new TextBox { Bounds = new Rectangle(24, 184, 440, 28), ReadOnly = true, BackColor = Color.FromArgb(246, 248, 252) };
        p.Controls.Add(extPathBox);

        var copy = MakeButton("Copiar ruta", false);
        copy.Bounds = new Rectangle(472, 182, 104, 30);
        copy.Click += (s, e) => CopyExtensionPath();
        p.Controls.Add(copy);

        var openEdge = MakeButton("Abrir extensiones de Edge", true);
        openEdge.Bounds = new Rectangle(24, 228, 220, 34);
        openEdge.Click += (s, e) => OpenEdgeExtensions();
        p.Controls.Add(openEdge);

        var openFolder = MakeButton("Abrir carpeta", false);
        openFolder.Bounds = new Rectangle(254, 228, 130, 34);
        openFolder.Click += (s, e) => Process.Start("explorer.exe", "\"" + installDir + "\"");
        p.Controls.Add(openFolder);
        return p;
    }

    static Button MakeButton(string text, bool primary)
    {
        var b = new Button
        {
            Text = text, Size = new Size(100, 32), FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand,
            BackColor = primary ? Accent : Color.White, ForeColor = primary ? Color.White : Color.FromArgb(28, 29, 31)
        };
        b.FlatAppearance.BorderColor = primary ? Accent : Color.FromArgb(200, 204, 210);
        return b;
    }

    Panel[] Pages { get { return new[] { pageLicense, pageChoose, pageProgress, pageDone }; } }

    void ShowPage(Panel page)
    {
        foreach (Panel p in Pages) p.Visible = p == page;
    }

    void Browse()
    {
        using (var dlg = new FolderBrowserDialog())
        {
            dlg.Description = "Elige dónde crear la carpeta CorrectorLocal";
            dlg.ShowNewFolderButton = true;
            if (dlg.ShowDialog(this) != DialogResult.OK) return;
            string chosen = dlg.SelectedPath;
            pathBox.Text = Path.GetFileName(chosen.TrimEnd('\\')).Equals("CorrectorLocal", StringComparison.OrdinalIgnoreCase)
                ? chosen : Path.Combine(chosen, "CorrectorLocal");
        }
    }

    // ---------- Instalación ----------

    void StartInstall()
    {
        try { installDir = Path.GetFullPath(pathBox.Text.Trim()); }
        catch { MessageBox.Show(this, "La ruta no es válida.", AppName, MessageBoxButtons.OK, MessageBoxIcon.Warning); return; }

        installBtn.Enabled = false;
        cancelBtn.Enabled = false;
        ShowPage(pageProgress);
        new Thread(InstallWorker) { IsBackground = true }.Start();
    }

    void Report(int percent, string text)
    {
        BeginInvoke((MethodInvoker)delegate
        {
            if (percent >= 0) bar.Value = Math.Min(100, percent);
            statusLabel.Text = text;
        });
    }

    void InstallWorker()
    {
        try
        {
            // Si ya estaba instalado aquí, detener el servidor para poder reemplazar archivos
            string stopBat = Path.Combine(installDir, "detener-servidor.bat");
            if (File.Exists(stopBat))
            {
                Report(0, "Deteniendo la versión anterior…");
                RunHidden("cmd.exe", "/c \"\"" + stopBat + "\"\"", true);
                Thread.Sleep(1500);
            }

            Directory.CreateDirectory(installDir);
            ExtractPayload();

            Report(88, "Configurando el arranque automático…");
            string vbs = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Startup), StartupFile);
            File.WriteAllText(vbs,
                "' Arranca el servidor de Corrector Local sin mostrar ventana\r\n" +
                "CreateObject(\"WScript.Shell\").Run Chr(34) & \"" + Path.Combine(installDir, "iniciar-servidor.bat") + "\" & Chr(34), 0, False\r\n");

            Report(90, "Registrando en Aplicaciones instaladas…");
            RegisterUninstall();

            Report(91, "Creando accesos en el menú Inicio…");
            CreateStartMenu();

            Report(92, "Iniciando el corrector (puede tardar unos segundos)…");
            RunHidden("wscript.exe", "\"" + vbs + "\"", false);
            bool running = WaitForServer(60);

            BeginInvoke((MethodInvoker)delegate { Finish(running); });
        }
        catch (UnauthorizedAccessException)
        {
            Fail("No hay permiso para escribir en esa carpeta.\r\nElige otra, por ejemplo dentro de tu carpeta de usuario.");
        }
        catch (Exception ex)
        {
            Fail("No se pudo completar la instalación:\r\n" + ex.Message);
        }
    }

    void ExtractPayload()
    {
        using (var s = Assembly.GetExecutingAssembly().GetManifestResourceStream("payload.zip"))
        using (var zip = new ZipArchive(s, ZipArchiveMode.Read))
        {
            string root = installDir.TrimEnd('\\') + "\\";
            int total = zip.Entries.Count, done = 0;
            foreach (ZipArchiveEntry entry in zip.Entries)
            {
                string rel = entry.FullName.Replace('/', '\\');
                string dest = Path.GetFullPath(Path.Combine(installDir, rel));
                if (!dest.StartsWith(root, StringComparison.OrdinalIgnoreCase)) continue;

                if (rel.EndsWith("\\")) Directory.CreateDirectory(dest);
                else
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(dest));
                    entry.ExtractToFile(dest, true);
                }
                done++;
                if (done % 20 == 0 || done == total)
                    Report(85 * done / total, "Copiando archivos…  " + done + " de " + total);
            }
        }
    }

    void RegisterUninstall()
    {
        using (RegistryKey k = Registry.CurrentUser.CreateSubKey(UninstallKey))
        {
            k.SetValue("DisplayName", AppName);
            k.SetValue("DisplayVersion", Version);
            k.SetValue("Publisher", Publisher);
            k.SetValue("Comments", "Corrector ortográfico local para Edge y Chrome");
            k.SetValue("DisplayIcon", Path.Combine(installDir, "logo.ico"));
            k.SetValue("InstallLocation", installDir);
            k.SetValue("UninstallString", "cmd.exe /c \"\"" + Path.Combine(installDir, "desinstalar.bat") + "\"\"");
            k.SetValue("NoModify", 1, RegistryValueKind.DWord);
            k.SetValue("NoRepair", 1, RegistryValueKind.DWord);
            k.SetValue("EstimatedSize", (int)(DirSize(new DirectoryInfo(installDir)) / 1024), RegistryValueKind.DWord);
        }
    }

    void CreateStartMenu()
    {
        string menu = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Programs), AppName);
        Directory.CreateDirectory(menu);
        string icon = Path.Combine(installDir, "logo.ico");
        string explorer = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Windows), "explorer.exe");
        string cmd = Path.Combine(Environment.SystemDirectory, "cmd.exe");

        CreateShortcut(Path.Combine(menu, "Carpeta de Corrector Local.lnk"), explorer, "\"" + installDir + "\"", icon, "Abrir la carpeta de instalación");
        CreateShortcut(Path.Combine(menu, "Léeme.lnk"), Path.Combine(installDir, "LEEME.txt"), "", null, "Instrucciones de uso");
        CreateShortcut(Path.Combine(menu, "Licencias y avisos.lnk"), Path.Combine(installDir, "THIRD-PARTY-NOTICES.txt"), "", null, "Licencia MIT y componentes de terceros");
        CreateShortcut(Path.Combine(menu, "Desinstalar Corrector Local.lnk"), cmd, "/c \"\"" + Path.Combine(installDir, "desinstalar.bat") + "\"\"", icon, "Desinstalar Corrector Local");
    }

    static void CreateShortcut(string lnk, string target, string args, string icon, string description)
    {
        // WScript.Shell por COM, sin dependencias extra
        Type t = Type.GetTypeFromProgID("WScript.Shell");
        object shell = Activator.CreateInstance(t);
        object sc = t.InvokeMember("CreateShortcut", BindingFlags.InvokeMethod, null, shell, new object[] { lnk });
        Type st = sc.GetType();
        st.InvokeMember("TargetPath", BindingFlags.SetProperty, null, sc, new object[] { target });
        st.InvokeMember("Arguments", BindingFlags.SetProperty, null, sc, new object[] { args });
        st.InvokeMember("Description", BindingFlags.SetProperty, null, sc, new object[] { description });
        st.InvokeMember("WorkingDirectory", BindingFlags.SetProperty, null, sc, new object[] { Path.GetDirectoryName(target) });
        if (icon != null) st.InvokeMember("IconLocation", BindingFlags.SetProperty, null, sc, new object[] { icon + ",0" });
        st.InvokeMember("Save", BindingFlags.InvokeMethod, null, sc, null);
        Marshal.FinalReleaseComObject(sc);
        Marshal.FinalReleaseComObject(shell);
    }

    static long DirSize(DirectoryInfo d)
    {
        long size = 0;
        foreach (FileInfo f in d.GetFiles("*", SearchOption.AllDirectories)) size += f.Length;
        return size;
    }

    static void RunHidden(string file, string args, bool wait)
    {
        var psi = new ProcessStartInfo(file, args) { CreateNoWindow = true, UseShellExecute = false, WindowStyle = ProcessWindowStyle.Hidden };
        using (Process p = Process.Start(psi))
            if (wait) p.WaitForExit(15000);
    }

    bool WaitForServer(int seconds)
    {
        for (int i = 0; i < seconds; i++)
        {
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(ServerUrl);
                req.Timeout = 3000;
                req.Proxy = null;
                using (var res = (HttpWebResponse)req.GetResponse())
                    if (res.StatusCode == HttpStatusCode.OK) return true;
            }
            catch { }
            Report(92 + Math.Min(7, i / 4), "Iniciando el corrector…  " + i + " s");
            Thread.Sleep(1000);
        }
        return false;
    }

    void Fail(string message)
    {
        BeginInvoke((MethodInvoker)delegate
        {
            MessageBox.Show(this, message, AppName, MessageBoxButtons.OK, MessageBoxIcon.Error);
            ShowPage(pageChoose);
            installBtn.Enabled = true;
            cancelBtn.Enabled = true;
        });
    }

    void Finish(bool running)
    {
        bar.Value = 100;
        extPathBox.Text = Path.Combine(installDir, "extension");
        serverLabel.Text = running
            ? "✔  El corrector está funcionando y arrancará solo con Windows."
            : "⚠  El corrector aún no responde. Reinicia el PC; si sigue igual, ejecuta iniciar-servidor.bat.";
        serverLabel.ForeColor = running ? Color.FromArgb(22, 128, 61) : Color.FromArgb(180, 83, 9);
        CopyExtensionPath();
        ShowPage(pageDone);
        installBtn.Visible = false;
        cancelBtn.Visible = false;
        finishBtn.Visible = true;
        AcceptButton = finishBtn;
    }

    void CopyExtensionPath()
    {
        try { Clipboard.SetText(extPathBox.Text); } catch { }
    }

    void OpenEdgeExtensions()
    {
        CopyExtensionPath();
        try { Process.Start("msedge.exe", "edge://extensions"); }
        catch
        {
            MessageBox.Show(this, "No se encontró Edge. Ábrelo y escribe en la barra de direcciones:\r\nedge://extensions",
                AppName, MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
    }
}
