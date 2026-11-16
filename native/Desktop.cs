using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
namespace FishDesktopLab;
[StructLayout(LayoutKind.Sequential)] public struct Pt {public int X,Y;public Pt(int x,int y){X=x;Y=y;}}
[StructLayout(LayoutKind.Sequential)] public struct Rect {public int Left,Top,Right,Bottom;}
public record DesktopItem(string Key,string Name,int X,int Y,int ScreenX,int ScreenY);
public record WindowItem(long Id,string Title,int X,int Y,int Width,int Height);
public static class Win {
 [DllImport("user32.dll")] public static extern bool GetCursorPos(out Pt p);
 [DllImport("user32.dll",SetLastError=true)] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern short GetAsyncKeyState(int key);
 [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr h,ref Pt p);
 [DllImport("user32.dll")] public static extern bool ScreenToClient(IntPtr h,ref Pt p);
 [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h,out Rect r);
 [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
 [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
 [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr h,int attribute,out int value,int size);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h,StringBuilder b,int n);
 static bool OrdinaryWindow(IntPtr h){int cloaked;try{if(DwmGetWindowAttribute(h,14,out cloaked,4)==0&&cloaked!=0)return false;}catch{}var cls=new StringBuilder(256);GetClassName(h,cls,256);return cls.ToString()!="Progman"&&cls.ToString()!="WorkerW"&&cls.ToString()!="Shell_TrayWnd"&&cls.ToString()!="Shell_SecondaryTrayWnd";}
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h,StringBuilder b,int n);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h,int command);
 [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
 public delegate bool EnumProc(IntPtr h,IntPtr p);
 [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc f,IntPtr p);
 public static bool Escape=> (GetAsyncKeyState(27)&0x8000)!=0;
 public static List<WindowItem> Windows(){var list=new List<WindowItem>();EnumWindows((h,p)=>{var b=new StringBuilder(512);GetWindowText(h,b,512);if(IsWindowVisible(h)&&!IsIconic(h)&&OrdinaryWindow(h)&&b.Length>0&&GetWindowRect(h,out var r)&&r.Right-r.Left>100&&r.Bottom-r.Top>70)list.Add(new(h.ToInt64(),b.ToString(),r.Left,r.Top,r.Right-r.Left,r.Bottom-r.Top));return true;},IntPtr.Zero);return list;}
}
[ComImport,Guid("6D5140C1-7436-11CE-8034-00AA006009FA"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface ServiceProvider { [PreserveSig] int QueryService(ref Guid service,ref Guid iid,out IntPtr result); }
[ComImport,Guid("000214E2-0000-0000-C000-000000000046"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface ShellBrowser {
 [PreserveSig]int GetWindow(out IntPtr h);[PreserveSig]int ContextSensitiveHelp(bool v);
 [PreserveSig]int InsertMenusSB(IntPtr a,IntPtr b);[PreserveSig]int SetMenuSB(IntPtr a,IntPtr b,IntPtr c);[PreserveSig]int RemoveMenusSB(IntPtr a);[PreserveSig]int SetStatusTextSB(IntPtr a);[PreserveSig]int EnableModelessSB(bool a);[PreserveSig]int TranslateAcceleratorSB(IntPtr a,ushort b);[PreserveSig]int BrowseObject(IntPtr a,uint b);[PreserveSig]int GetViewStateStream(uint a,out IntPtr b);[PreserveSig]int GetControlWindow(uint a,out IntPtr b);[PreserveSig]int SendControlMsg(uint a,uint b,IntPtr c,IntPtr d,out IntPtr e);[PreserveSig]int QueryActiveShellView([MarshalAs(UnmanagedType.IUnknown)]out object view);
}
[ComImport,Guid("000214E3-0000-0000-C000-000000000046"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface OleWindow {[PreserveSig]int GetWindow(out IntPtr h);[PreserveSig]int ContextSensitiveHelp(bool v);}
[ComImport,Guid("1AC3D9F0-175C-11D1-95BE-00609797EA4F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface PersistFolder2 {
 void GetClassID(out Guid id);void Initialize(IntPtr pidl);void GetCurFolder(out IntPtr pidl);
}
[ComImport,Guid("CDE725B0-CCC9-4519-917E-325D72FAB4CE"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface FolderView {
 [PreserveSig]int GetCurrentViewMode(out uint m);[PreserveSig]int SetCurrentViewMode(uint m);[PreserveSig]int GetFolder(ref Guid iid,out IntPtr p);[PreserveSig]int Item(int i,out IntPtr p);[PreserveSig]int ItemCount(uint f,out int c);[PreserveSig]int Items(uint f,ref Guid iid,out IntPtr p);[PreserveSig]int GetSelectionMarkedItem(out int i);[PreserveSig]int GetFocusedItem(out int i);[PreserveSig]int GetItemPosition(IntPtr pidl,out Pt p);[PreserveSig]int GetSpacing(out Pt p);[PreserveSig]int GetDefaultSpacing(out Pt p);[PreserveSig]int GetAutoArrange();[PreserveSig]int SelectItem(int i,uint f);[PreserveSig]int SelectAndPositionItems(uint c,[MarshalAs(UnmanagedType.LPArray,SizeParamIndex=0)]IntPtr[] items,[MarshalAs(UnmanagedType.LPArray,SizeParamIndex=0)]Pt[] points,uint flags);
}
public interface IDesktopView:IDisposable {string Backend{get;}bool AutoArrange{get;}List<DesktopItem> List();Pt Move(string key,int x,int y);Pt ToClient(int x,int y);Pt ToScreen(int x,int y);}
public sealed class DesktopView:IDesktopView {
 public string Backend=>"shell-com";
 [DllImport("shell32.dll")] static extern IntPtr ILCombine(IntPtr parent,IntPtr child);
 [DllImport("shell32.dll",CharSet=CharSet.Unicode)] static extern int SHGetNameFromIDList(IntPtr pidl,uint kind,out IntPtr name);
 readonly List<object> refs=new();readonly FolderView view;readonly IntPtr hwnd,parent;
 static void Ok(int hr){Marshal.ThrowExceptionForHR(hr);}
 public DesktopView(){
  dynamic windows=Activator.CreateInstance(Type.GetTypeFromCLSID(new Guid("9BA05972-F6A8-11CF-A442-00A0C90A8F39"))!)!;refs.Add(windows);
  object loc=0;object root=null!;int h;object desktop=windows.FindWindowSW(ref loc,ref root,8,out h,1);if(desktop==null)throw new Exception("没有找到 Explorer 桌面视图");refs.Add(desktop);
  var svc=(ServiceProvider)desktop;var sid=new Guid("4C96BE40-915C-11CF-99D3-00AA004AE837");var iid=typeof(ShellBrowser).GUID;Ok(svc.QueryService(ref sid,ref iid,out var ptr));object browser;try{browser=Marshal.GetObjectForIUnknown(ptr);}finally{Marshal.Release(ptr);}refs.Add(browser);
  Ok(((ShellBrowser)browser).QueryActiveShellView(out var sv));refs.Add(sv);view=(FolderView)sv;Ok(((OleWindow)sv).GetWindow(out hwnd));iid=typeof(PersistFolder2).GUID;Ok(view.GetFolder(ref iid,out ptr));object folder;try{folder=Marshal.GetObjectForIUnknown(ptr);}finally{Marshal.Release(ptr);}refs.Add(folder);((PersistFolder2)folder).GetCurFolder(out parent);
 }
 string Name(IntPtr child,uint kind){var full=ILCombine(parent,child);try{Ok(SHGetNameFromIDList(full,kind,out var p));try{return Marshal.PtrToStringUni(p)??"";}finally{Marshal.FreeCoTaskMem(p);}}finally{Marshal.FreeCoTaskMem(full);}}
 public bool AutoArrange=>view.GetAutoArrange()==0;
 public List<DesktopItem> List(){var list=new List<DesktopItem>();Ok(view.ItemCount(2,out var n));for(int i=0;i<n;i++){Ok(view.Item(i,out var p));try{Ok(view.GetItemPosition(p,out var pt));var screen=pt;Win.ClientToScreen(hwnd,ref screen);list.Add(new(Name(p,0x80028000),Name(p,0),pt.X,pt.Y,screen.X,screen.Y));}finally{Marshal.FreeCoTaskMem(p);}}return list;}
 public Pt Move(string key,int x,int y){if(AutoArrange)throw new Exception("桌面开启了自动排列，当前不能移动图标。请自行关闭后再试。");Ok(view.ItemCount(2,out var n));for(int i=0;i<n;i++){Ok(view.Item(i,out var p));try{if(Name(p,0x80028000)!=key)continue;Ok(view.SelectAndPositionItems(1,new[]{p},new[]{new Pt(x,y)},0x80000080));Ok(view.GetItemPosition(p,out var actual));return actual;}finally{Marshal.FreeCoTaskMem(p);}}throw new Exception("图标已不存在，请刷新列表");}
 public Pt ToClient(int x,int y){var p=new Pt(x,y);if(!Win.ScreenToClient(hwnd,ref p))throw new Exception("无法转换桌面坐标");return p;}
 public Pt ToScreen(int x,int y){var p=new Pt(x,y);if(!Win.ClientToScreen(hwnd,ref p))throw new Exception("无法转换桌面坐标");return p;}
 public void Dispose(){if(parent!=IntPtr.Zero)Marshal.FreeCoTaskMem(parent);for(int i=refs.Count-1;i>=0;i--)if(Marshal.IsComObject(refs[i]))Marshal.ReleaseComObject(refs[i]);}
}

