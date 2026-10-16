using System.Runtime.InteropServices;

namespace DiplomLauncher;

/// <summary>
/// Job Object с флагом KILL_ON_JOB_CLOSE. Все дочерние процессы (node, prisma, next)
/// попадают в задание и гарантированно завершаются при закрытии лаунчера.
/// Это устраняет классическую проблему «зависший» node, блокирующий порт.
/// </summary>
public sealed class ProcessJob : IDisposable
{
    [StructLayout(LayoutKind.Sequential)]
    private struct IoCounters
    {
        public ulong ReadOperationCount, WriteOperationCount, OtherOperationCount;
        public ulong ReadTransferCount, WriteTransferCount, OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JobObjectBasicLimitInformation
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public UIntPtr PriorityClass;
        public UIntPtr SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct JobObjectExtendedLimitInformation
    {
        public JobObjectBasicLimitInformation BasicLimitInformation;
        public IoCounters IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    private const int JobObjectExtendedLimitInformationClass = 9;
    private const uint JobObjectLimitKillOnJobClose = 0x00002000;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string? lpName);

    [DllImport("kernel32.dll")]
    private static extern bool SetInformationJobObject(
        IntPtr hJob, int jobObjectInfoClass, IntPtr lpJobObjectInfo, uint cbJobObjectInfoLength);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern bool CloseHandle(IntPtr hObject);

    private IntPtr _handle;
    private bool _supported = true;

    public ProcessJob()
    {
        _handle = CreateJobObject(IntPtr.Zero, null);
        if (_handle == IntPtr.Zero)
        {
            _supported = false;
            return;
        }

        var info = new JobObjectExtendedLimitInformation();
        info.BasicLimitInformation.LimitFlags = JobObjectLimitKillOnJobClose;
        var length = Marshal.SizeOf(info);
        var ptr = Marshal.AllocHGlobal(length);
        try
        {
            Marshal.StructureToPtr(info, ptr, false);
            if (!SetInformationJobObject(
                    _handle, JobObjectExtendedLimitInformationClass, ptr, (uint)length))
                _supported = false;
        }
        finally
        {
            Marshal.FreeHGlobal(ptr);
        }
    }

    public bool AddProcess(IntPtr processHandle)
    {
        if (!_supported || _handle == IntPtr.Zero)
            return false;
        try
        {
            return AssignProcessToJobObject(_handle, processHandle);
        }
        catch
        {
            return false;
        }
    }

    public void Dispose()
    {
        if (_handle != IntPtr.Zero)
        {
            CloseHandle(_handle);
            _handle = IntPtr.Zero;
        }
    }
}
