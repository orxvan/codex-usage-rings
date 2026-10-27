$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -lt 7 -or [Threading.Thread]::CurrentThread.GetApartmentState() -ne [Threading.ApartmentState]::STA) {
 Start-Process -FilePath 'pwsh.exe' -ArgumentList @('-NoLogo','-NoProfile','-STA','-File',('"' + $PSCommandPath + '"')) -WindowStyle Hidden
 return
}
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class UsageNative {
 [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
 private delegate bool EnumProc(IntPtr h, IntPtr p);
 [DllImport("user32.dll")] private static extern bool EnumWindows(EnumProc callback, IntPtr p);
 [DllImport("user32.dll", CharSet=CharSet.Unicode)] private static extern int GetWindowText(IntPtr h, StringBuilder text, int size);
 [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr h);
 public static IntPtr FindTarget() {
  IntPtr found=IntPtr.Zero;
  EnumWindows((h,p) => { var title=new StringBuilder(512); GetWindowText(h,title,title.Capacity); if (IsWindowVisible(h) && title.ToString()=="ChatGPT") { found=h; return false; } return true; }, IntPtr.Zero);
  return found;
 }
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out RECT r);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
}
"@
$mutex = [Threading.Mutex]::new($false, 'Local\CodexUsageRings-v1')
if (-not $mutex.WaitOne(0)) { return }
$reader = $null
try {
 $folder = Split-Path -Parent $MyInvocation.MyCommand.Path
 $data = Join-Path $folder 'usage.json'
 if (Test-Path -LiteralPath $data) { Remove-Item -LiteralPath $data -Force }
 $node = (Get-Command node.exe -ErrorAction Stop).Source
 $reader = Start-Process -FilePath $node -ArgumentList ('"' + (Join-Path $folder 'reader.cjs') + '"') -WindowStyle Hidden -PassThru
 [xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Width="28" Height="28" WindowStyle="None" AllowsTransparency="True" Background="Transparent" ShowInTaskbar="False" ResizeMode="NoResize" Topmost="True" ShowActivated="False">
 <Border Background="#0126282C" CornerRadius="14" Padding="1">
  <Viewbox Stretch="Uniform">
   <Canvas Width="52" Height="52">
    <Ellipse Canvas.Left="2" Canvas.Top="2" Width="48" Height="48" Stroke="#554F2D3F" StrokeThickness="5"/>
    <Path x:Name="Outer" Stroke="#FFFF557B" StrokeThickness="5" StrokeStartLineCap="Round" StrokeEndLineCap="Round"/>
    <Ellipse Canvas.Left="10" Canvas.Top="10" Width="32" Height="32" Stroke="#5530554C" StrokeThickness="5"/>
    <Path x:Name="Inner" Stroke="#FF54E6B2" StrokeThickness="5" StrokeStartLineCap="Round" StrokeEndLineCap="Round"/>
   </Canvas>
  </Viewbox>
 </Border>
</Window>
'@
 $window = [Windows.Markup.XamlReader]::Load([System.Xml.XmlNodeReader]::new($xaml))
 $outer=$window.FindName('Outer'); $inner=$window.FindName('Inner')
 $window.ToolTip = '正在读取用量… · 右键退出'
 $window.Add_MouseRightButtonUp({ $window.Close() })
 function Set-Arc($element, [double]$radius, [double]$percent) {
  $percent=[Math]::Max(0,[Math]::Min(100,$percent)); $element.Data=$null
  if ($percent -le 0) { return }
  $sweep=[Math]::Min(359.99,360*$percent/100); $angle=($sweep-90)*[Math]::PI/180
  $figure=[Windows.Media.PathFigure]::new(); $figure.StartPoint=[Windows.Point]::new(26,26-$radius)
  $arc=[Windows.Media.ArcSegment]::new(); $arc.Point=[Windows.Point]::new(26+$radius*[Math]::Cos($angle),26+$radius*[Math]::Sin($angle)); $arc.Size=[Windows.Size]::new($radius,$radius); $arc.IsLargeArc=($sweep -gt 180); $arc.SweepDirection=[Windows.Media.SweepDirection]::Clockwise
  $figure.Segments.Add($arc); $geometry=[Windows.Media.PathGeometry]::new(); $geometry.Figures.Add($figure); $element.Data=$geometry
 }
 $script:lastSeen=[DateTime]::UtcNow
 $tick=[Windows.Threading.DispatcherTimer]::new(); $tick.Interval=[TimeSpan]::FromSeconds(1)
 $tick.Add_Tick({
  try {
   $hwnd=[UsageNative]::FindTarget(); $foreground=[UsageNative]::GetForegroundWindow()
   $self=([System.Windows.Interop.WindowInteropHelper]::new($window)).Handle
   if ($hwnd -ne [IntPtr]::Zero -and -not [UsageNative]::IsIconic($hwnd)) {
    $script:lastSeen=[DateTime]::UtcNow
    if ($foreground -eq $hwnd -or $foreground -eq $self) {
     $rect=[UsageNative+RECT]::new()
     if ([UsageNative]::GetWindowRect($hwnd,[ref]$rect)) {
      $source=[Windows.PresentationSource]::FromVisual($window); $sx=1.0; $sy=1.0
      if ($source -and $source.CompositionTarget) { $sx=$source.CompositionTarget.TransformToDevice.M11; $sy=$source.CompositionTarget.TransformToDevice.M22 }
      $window.Left=($rect.Left+12)/$sx; $window.Top=($rect.Bottom-80)/$sy
      if (-not $window.IsVisible) { $window.Show() }
     }
    } else { $window.Hide() }
   } else { $window.Hide(); if (([DateTime]::UtcNow-$script:lastSeen).TotalSeconds -gt 30 -and $hwnd -eq [IntPtr]::Zero) { $window.Close() } }
   if (Test-Path -LiteralPath $data) {
    $usage=Get-Content -LiteralPath $data -Raw | ConvertFrom-Json
    if ($null -ne $usage.primary.usedPercent -and $null -ne $usage.secondary.usedPercent) {
     $p=[double]$usage.primary.usedPercent; $s=[double]$usage.secondary.usedPercent
     Set-Arc $outer 24 $p; Set-Arc $inner 16 $s
     $stale=([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()-[double]$usage.updatedAt) -gt 180000
     $suffix=if ($stale) {' · 已过期'} else {''}
     $r1=[DateTimeOffset]::FromUnixTimeSeconds([long]$usage.primary.resetsAt).ToLocalTime().ToString('yyyy-MM-dd HH:mm')
     $r2=[DateTimeOffset]::FromUnixTimeSeconds([long]$usage.secondary.resetsAt).ToLocalTime().ToString('yyyy-MM-dd HH:mm')
     $window.ToolTip="5h：已用 $([Math]::Round($p))% · 重置 $r1`nWeekly：已用 $([Math]::Round($s))% · 重置 $r2$suffix`n右键退出"
    }
   }
  } catch { $window.ToolTip='用量暂不可用；正在重试。右键退出。' }
 })
 $window.Add_Closed({$tick.Stop(); [System.Windows.Threading.Dispatcher]::CurrentDispatcher.BeginInvokeShutdown([System.Windows.Threading.DispatcherPriority]::Background)})
 $window.Show(); $tick.Start(); [System.Windows.Threading.Dispatcher]::Run()
} finally {
 if ($reader -and -not $reader.HasExited) { try { $reader.Kill($true) } catch { Stop-Process -Id $reader.Id -Force -ErrorAction SilentlyContinue } }
 if ($data -and (Test-Path -LiteralPath $data)) { Remove-Item -LiteralPath $data -Force -ErrorAction SilentlyContinue }
 $mutex.ReleaseMutex(); $mutex.Dispose()
}
