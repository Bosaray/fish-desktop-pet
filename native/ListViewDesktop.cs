using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
namespace FishDesktopLab {
// Compatibility path for Explorer installations whose ShellWindows COM broker is unavailable.
// Only a fixed 4 KiB PAGE_READWRITE data buffer is allocated in the desktop list-view process.
// The buffer carries documented LVITEM/POINT messages; no code is written or executed there.
public sealed class ListViewDesktop:IDesktopView {
 [StructLayout(LayoutKind.Sequential)] struct LVITEM {public uint mask;public int iItem,iSubItem;public uint state,stateMask;public IntPtr pszText;public int cchTextMax,iImage;public IntPtr lParam;public int iIndent,iGroupId;public uint cColumns;public IntPtr puColumns,piColFmt;public int iGroup;}
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr parent,IntPtr after,string cls,string title);
 [DllImport("user32.dll")] static extern bool EnumWindows(Win.EnumProc callback,IntPtr p);
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint process);
 [DllImport("user32.dll",CharSet=CharSet.Unicode,SetLastError=true)] static extern IntPtr SendMessageTimeout(IntPtr h,uint message,IntPtr w,IntPtr l,uint flags,uint timeout,out IntPtr result);
 [DllImport("user32.dll",EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetWindowLongPtr(IntPtr h,int index);
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr OpenProcess(uint access,bool inherit,uint pid);
 [DllImport("kernel32.dll",SetLastError=true)] static extern IntPtr VirtualAllocEx(IntPtr process,IntPtr address,UIntPtr bytes,uint allocation,uint protection);
 [DllImport("kernel32.dll")] static extern bool VirtualFreeEx(IntPtr process,IntPtr address,UIntPtr bytes,uint kind);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool ReadProcessMemory(IntPtr process,IntPtr address,byte[] buffer,UIntPtr bytes,out UIntPtr read);
 [DllImport("kernel32.dll",SetLastError=true)] static extern bool WriteProcessMemory(IntPtr process,IntPtr address,byte[] buffer,UIntPtr bytes,out UIntPtr written);
 [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
 readonly IntPtr hwnd,process,memory;readonly uint pid;bool disposed;
 readonly Dictionary<string,Tuple<int,string>> indices=new Dictionary<string,Tuple<int,string>>(StringComparer.OrdinalIgnoreCase);
 public string Backend=>"list-view";
 public ListViewDesktop(){
  IntPtr found=IntPtr.Zero;EnumWindows((h,p)=>{var view=FindWindowEx(h,IntPtr.Zero,"SHELLDLL_DefView",null);if(view!=IntPtr.Zero)found=FindWindowEx(view,IntPtr.Zero,"SysListView32",null);return found==IntPtr.Zero;},IntPtr.Zero);
  if(found==IntPtr.Zero)throw new Exception("没有可用的 Windows 桌面图标视图");hwnd=found;GetWindowThreadProcessId(hwnd,out pid);
  if(!String.Equals(Process.GetProcessById((int)pid).ProcessName,"explorer",StringComparison.OrdinalIgnoreCase))throw new Exception("桌面图标视图不属于 Explorer");
  process=OpenProcess(0x1038,false,pid);if(process==IntPtr.Zero)throw new Exception("当前 Windows 权限不能读取桌面图标");
  memory=VirtualAllocEx(process,IntPtr.Zero,new UIntPtr(4096),0x3000,0x04);if(memory==IntPtr.Zero){CloseHandle(process);throw new Exception("无法建立桌面图标数据缓冲区");}
 }
 IntPtr Message(uint message,int index,IntPtr parameter){uint current;GetWindowThreadProcessId(hwnd,out current);if(disposed||current!=pid||!Win.IsWindow(hwnd))throw new Exception("桌面视图已重建，请刷新");IntPtr result;if(SendMessageTimeout(hwnd,message,new IntPtr(index),parameter,2,1000,out result)==IntPtr.Zero)throw new Exception("桌面图标视图暂未响应");return result;}
 byte[] Read(int offset,int length){var bytes=new byte[length];UIntPtr n;if(!ReadProcessMemory(process,IntPtr.Add(memory,offset),bytes,new UIntPtr((uint)length),out n)||n.ToUInt64()!=(ulong)length)throw new Exception("桌面图标数据读取失败");return bytes;}
 void Write(int offset,byte[] bytes){UIntPtr n;if(!WriteProcessMemory(process,IntPtr.Add(memory,offset),bytes,new UIntPtr((uint)bytes.Length),out n)||n.ToUInt64()!=(ulong)bytes.Length)throw new Exception("桌面图标数据写入失败");}
 void WriteStruct<T>(T value){int n=Marshal.SizeOf(typeof(T));var p=Marshal.AllocHGlobal(n);try{Marshal.StructureToPtr(value,p,false);var b=new byte[n];Marshal.Copy(p,b,0,n);Write(0,b);}finally{Marshal.FreeHGlobal(p);}}
 string Name(int index){WriteStruct(new LVITEM{mask=1,iItem=index,iSubItem=0,pszText=IntPtr.Add(memory,256),cchTextMax=512});int n=Message(0x1073,index,memory).ToInt32();return n<=0?"":Encoding.Unicode.GetString(Read(256,Math.Min(n,511)*2));}
 Pt Position(int index){if(Message(0x1010,index,IntPtr.Add(memory,128))==IntPtr.Zero)throw new Exception("图标位置已失效");var bytes=Read(128,8);return new Pt(BitConverter.ToInt32(bytes,0),BitConverter.ToInt32(bytes,4));}
 public bool AutoArrange=>(GetWindowLongPtr(hwnd,-16).ToInt64()&0x100)!=0;
 static List<string> Files(){var files=new List<string>();foreach(var dir in new[]{Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),Environment.GetFolderPath(Environment.SpecialFolder.CommonDesktopDirectory)})try{if(Directory.Exists(dir))files.AddRange(Directory.GetFileSystemEntries(dir));}catch{}return files;}
 public List<DesktopItem> List(){
  int count=Message(0x1004,0,IntPtr.Zero).ToInt32();if(count<0||count>4096)throw new Exception("桌面图标数量异常");var files=Files();var occurrences=new Dictionary<string,int>(StringComparer.OrdinalIgnoreCase);var list=new List<DesktopItem>();indices.Clear();
  for(int i=0;i<count;i++){string name=Name(i);if(name.Length==0)continue;int occurrence;occurrences.TryGetValue(name,out occurrence);occurrences[name]=occurrence+1;
   var matches=files.Where(p=>String.Equals(Path.GetFileName(p),name,StringComparison.OrdinalIgnoreCase)||String.Equals(Path.GetFileNameWithoutExtension(p),name,StringComparison.OrdinalIgnoreCase)).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
   string key=matches.Length==1&&occurrence==0?matches[0]:"@desktop-icon:"+Uri.EscapeDataString(name)+":"+occurrence;
   Pt position=Position(i),screen=ToScreen(position.X,position.Y);list.Add(new DesktopItem(key,name,position.X,position.Y,screen.X,screen.Y));indices[key]=Tuple.Create(i,name);
  }return list;
 }
 public Pt Move(string key,int x,int y){
  if(AutoArrange)throw new Exception("桌面开启了自动排列，当前不能移动图标");Tuple<int,string> item;
  if(!indices.TryGetValue(key,out item)||Name(item.Item1)!=item.Item2){List();if(!indices.TryGetValue(key,out item)||Name(item.Item1)!=item.Item2)throw new Exception("图标已改名或不存在，请刷新");}
  if(indices.Values.Count(v=>v.Item2==item.Item2)>1)throw new Exception("存在同名图标，暂不搬动以避免拿错");
  WriteStruct(new Pt(x,y));Message(0x1031,item.Item1,memory);return Position(item.Item1);
 }
 public Pt ToClient(int x,int y){var p=new Pt(x,y);if(!Win.ScreenToClient(hwnd,ref p))throw new Exception("无法转换桌面坐标");return p;}
 public Pt ToScreen(int x,int y){var p=new Pt(x,y);if(!Win.ClientToScreen(hwnd,ref p))throw new Exception("无法转换桌面坐标");return p;}
 public void Dispose(){if(disposed)return;disposed=true;VirtualFreeEx(process,memory,UIntPtr.Zero,0x8000);CloseHandle(process);}
}
}
