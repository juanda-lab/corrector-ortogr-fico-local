// Lanzador de Corrector Local para la versión de la Microsoft Store (paquete MSIX).
// Enciende el servidor de LanguageTool que va dentro del paquete, sin ventanas.
// - Al iniciar Windows (tarea de inicio del paquete): solo enciende el servidor.
// - Si el usuario lo abre desde el menú Inicio: además muestra el estado y opciones.
// Desarrollado por Daniel Diaz. Licencia MIT.
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

[assembly: AssemblyTitle("Corrector Local")]
[assembly: AssemblyDescription("Corrector ortográfico local para el navegador")]
[assembly: AssemblyCompany("Daniel Diaz")]
[assembly: AssemblyProduct("Corrector Local")]
[assembly: AssemblyCopyright("© 2026 Daniel Diaz. Licencia MIT.")]
[assembly: AssemblyVersion("1.3.0.0")]
[assembly: AssemblyFileVersion("1.3.0.0")]

static class Lanzador
{
    const int Puerto = 8081;
    const string StoreUrl = "https://microsoftedge.microsoft.com/addons/detail/eajjoflldpddkbfbkbjdnmgeabilkdea";

    [DllImport("kernel32.dll")] static extern ulong GetTickCount64();
    [DllImport("user32.dll")] static extern bool SetProcessDPIAware();

    static string Dir { get { return AppDomain.CurrentDomain.BaseDirectory; } }

    [STAThread]
    static void Main(string[] args)
    {
        bool yaFunciona = Responde();
        if (!yaFunciona) Encender();

        // En los primeros minutos tras encender el PC es la tarea de inicio: no se muestra nada
        bool arranqueDeWindows = GetTickCount64() < 3 * 60 * 1000;
        if (arranqueDeWindows && !yaFunciona) return;

        try { SetProcessDPIAware(); } catch { }
        Application.EnableVisualStyles();
        Application.Run(new Estado());
    }

    // ¿Hay algo escuchando en 127.0.0.1:8081?
    public static bool Responde()
    {
        try
        {
            using (var c = new TcpClient())
            {
                var r = c.BeginConnect("127.0.0.1", Puerto, null, null);
                bool ok = r.AsyncWaitHandle.WaitOne(700) && c.Connected;
                if (ok) c.EndConnect(r);
                return ok;
            }
        }
        catch { return false; }
    }

    public static void Encender()
    {
        string lt = Path.Combine(Dir, "LanguageTool");
        var psi = new ProcessStartInfo(Path.Combine(Dir, @"java\bin\javaw.exe"))
        {
            Arguments = "-Xmx1g -cp languagetool-server.jar org.languagetool.server.HTTPServer" +
                        " --config \"" + Path.Combine(Dir, "server.properties") + "\" --port " + Puerto,
            WorkingDirectory = lt,
            UseShellExecute = false,
            CreateNoWindow = true
        };
        Process.Start(psi);
    }

    // Detiene solo el Java de este paquete (no otros programas Java del PC)
    public static void Detener()
    {
        string java = Path.Combine(Dir, @"java\bin\javaw.exe");
        foreach (var p in Process.GetProcessesByName("javaw"))
        {
            try
            {
                if (string.Equals(p.MainModule.FileName, java, StringComparison.OrdinalIgnoreCase)) p.Kill();
            }
            catch { }
        }
    }

    public static void AbrirTienda()
    {
        try { Process.Start("msedge.exe", StoreUrl); }
        catch { try { Process.Start(StoreUrl); } catch { } }
    }
}

class Estado : Form
{
    static readonly Color Accent = Color.FromArgb(37, 99, 235);
    readonly Label estado;
    readonly Button detener;

    public Estado()
    {
        SuspendLayout();
        AutoScaleDimensions = new SizeF(96F, 96F);
        AutoScaleMode = AutoScaleMode.Dpi;
        Text = "Corrector Local";
        Font = new Font("Segoe UI", 9.5F);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        MinimizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        ClientSize = new Size(440, 220);
        BackColor = Color.White;
        try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }

        Controls.Add(new Label
        {
            Text = "Corrector Local", Bounds = new Rectangle(20, 16, 400, 30),
            Font = new Font("Segoe UI Semibold", 14F)
        });
        estado = new Label { Bounds = new Rectangle(20, 52, 400, 24), Text = "Encendiendo el corrector…", ForeColor = Color.FromArgb(100, 106, 115) };
        Controls.Add(estado);
        Controls.Add(new Label
        {
            Text = "Arranca solo con Windows. Para que subraye lo que escribes,\r\n" +
                   "añade la extensión Corrector Local a Microsoft Edge.",
            Bounds = new Rectangle(20, 84, 400, 44), ForeColor = Color.FromArgb(55, 60, 68)
        });

        var ext = Boton("Obtener la extensión", true);
        ext.Bounds = new Rectangle(20, 150, 170, 34);
        ext.Click += (s, e) => Lanzador.AbrirTienda();
        detener = Boton("Detener", false);
        detener.Bounds = new Rectangle(200, 150, 100, 34);
        detener.Click += (s, e) => { Lanzador.Detener(); Close(); };
        var cerrar = Boton("Cerrar", false);
        cerrar.Bounds = new Rectangle(310, 150, 110, 34);
        cerrar.Click += (s, e) => Close();
        Controls.AddRange(new Control[] { ext, detener, cerrar });
        AcceptButton = cerrar;
        Controls.Add(new Label
        {
            Text = "Desarrollado por Daniel Diaz", Bounds = new Rectangle(20, 194, 400, 20),
            ForeColor = Color.FromArgb(140, 146, 155), Font = new Font("Segoe UI", 8F)
        });
        ResumeLayout(false);

        // Espera a que el servidor responda (tarda unos segundos al encenderse).
        // Se lanza en Shown: antes la ventana aún no existe y no se podría actualizar.
        Shown += (s, e) => new Thread(() =>
        {
            bool ok = false;
            for (int i = 0; i < 60 && !ok; i++) { ok = Lanzador.Responde(); if (!ok) Thread.Sleep(1000); }
            try
            {
                BeginInvoke((MethodInvoker)delegate
                {
                    estado.Text = ok ? "✔  El corrector está funcionando." : "⚠  El corrector no responde. Cierra y vuelve a abrir Corrector Local.";
                    estado.ForeColor = ok ? Color.FromArgb(22, 128, 61) : Color.FromArgb(180, 83, 9);
                });
            }
            catch { }
        }) { IsBackground = true }.Start();
    }

    static Button Boton(string texto, bool principal)
    {
        var b = new Button
        {
            Text = texto, FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand,
            BackColor = principal ? Accent : Color.White, ForeColor = principal ? Color.White : Color.FromArgb(28, 29, 31)
        };
        b.FlatAppearance.BorderColor = principal ? Accent : Color.FromArgb(200, 204, 210);
        return b;
    }
}
