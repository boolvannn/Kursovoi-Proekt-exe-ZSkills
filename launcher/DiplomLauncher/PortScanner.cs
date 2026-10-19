using System.Diagnostics;
using System.Net;
using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.InteropServices;

namespace DiplomLauncher;

public sealed class PortInfo
{
    public int Port { get; init; }
    public int Pid { get; init; }
    public string ProcessName { get; init; } = string.Empty;

    public string Display => $"{Port}\t{Pid}\t{ProcessName}";
}

/// <summary>
/// Просмотр занятых/свободных портов через GetExtendedTcpTable (без локализации netstat)
/// и дополнительная проверка TCP-подключением.
/// </summary>
public static class PortScanner
{
    private const int AfInet = 2;
    private const int TcpTableOwnerPidAll = 5;
    private const uint MibTcpStateListen = 2;

    [StructLayout(LayoutKind.Sequential)]
    private struct TcpRowOwnerPid
    {
        public uint state;
        public uint localAddr;
        public uint localPort;
        public uint remoteAddr;
        public uint remotePort;
        public uint owningPid;
    }

    [DllImport("iphlpapi.dll", SetLastError = true)]
    private static extern uint GetExtendedTcpTable(
        IntPtr tcpTable, ref int dwOutBufLen, bool sort, int ipVersion, int tblClass, int reserved);

    public static List<PortInfo> GetListeners()
    {
        var result = new List<PortInfo>();
        if (!OperatingSystem.IsWindows())
            return result;

        var bufferSize = 0;
        GetExtendedTcpTable(IntPtr.Zero, ref bufferSize, false, AfInet, TcpTableOwnerPidAll, 0);
        if (bufferSize <= 0)
            return result;

        var table = Marshal.AllocHGlobal(bufferSize);
        try
        {
            if (GetExtendedTcpTable(table, ref bufferSize, false, AfInet, TcpTableOwnerPidAll, 0) != 0)
                return result;

            var rowCount = Marshal.ReadInt32(table);
            var rowPtr = (IntPtr)((long)table + sizeof(uint));
            var rowSize = Marshal.SizeOf<TcpRowOwnerPid>();

            for (var i = 0; i < rowCount; i++)
            {
                var row = Marshal.PtrToStructure<TcpRowOwnerPid>(rowPtr);
                if (row.state == MibTcpStateListen)
                {
                    var port = (ushort)IPAddress.NetworkToHostOrder((short)row.localPort);
                    var pid = (int)row.owningPid;
                    string name;
                    try
                    {
                        name = Process.GetProcessById(pid).ProcessName;
                    }
                    catch
                    {
                        name = "(нет доступа)";
                    }

                    result.Add(new PortInfo { Port = port, Pid = pid, ProcessName = name });
                }

                rowPtr = (IntPtr)((long)rowPtr + rowSize);
            }
        }
        finally
        {
            Marshal.FreeHGlobal(table);
        }

        return result;
    }

    public static bool IsPortBusy(int port)
    {
        foreach (var listener in GetListeners())
            if (listener.Port == port)
                return true;

        try
        {
            using var client = new TcpClient();
            client.Connect(new IPEndPoint(IPAddress.Loopback, port));
            return true;
        }
        catch
        {
            return false;
        }
    }

    public static PortInfo? Owner(int port)
    {
        foreach (var listener in GetListeners())
            if (listener.Port == port)
                return listener;
        return null;
    }

    /// <summary>Убивает только те процессы, которые слушают указанный порт.</summary>
    public static bool FreePort(int port)
    {
        var pids = GetListeners()
            .Where(l => l.Port == port)
            .Select(l => l.Pid)
            .Distinct()
            .ToList();

        if (pids.Count == 0)
            return true;

        foreach (var pid in pids)
        {
            try
            {
                using var process = Process.GetProcessById(pid);
                process.Kill(entireProcessTree: true);
                process.WaitForExit(5000);
            }
            catch
            {
                // процесс мог уже умереть
            }
        }

        var deadline = DateTime.UtcNow.AddSeconds(5);
        while (DateTime.UtcNow < deadline)
        {
            if (!IsPortBusy(port))
                return true;
            Thread.Sleep(300);
        }

        return !IsPortBusy(port);
    }

    public static string? DetectLanIp()
    {
        try
        {
            using var socket = new Socket(AddressFamily.InterNetwork, SocketType.Dgram, 0);
            socket.Connect("8.8.8.8", 80);
            var ip = ((IPEndPoint)socket.LocalEndPoint!).Address.ToString();
            if (!ip.StartsWith("127.") && ip != "0.0.0.0")
                return ip;
        }
        catch
        {
            // ignore
        }

        try
        {
            foreach (var ni in NetworkInterface.GetAllNetworkInterfaces())
            {
                if (ni.OperationalStatus != OperationalStatus.Up)
                    continue;
                foreach (var ua in ni.GetIPProperties().UnicastAddresses)
                {
                    if (ua.Address.AddressFamily == AddressFamily.InterNetwork
                        && !ua.Address.ToString().StartsWith("127.")
                        && !ua.Address.ToString().StartsWith("169.254."))
                        return ua.Address.ToString();
                }
            }
        }
        catch
        {
            // ignore
        }

        return null;
    }
}
