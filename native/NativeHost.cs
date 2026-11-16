using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;
namespace FishDesktopLab {
public class Request { public int id; public string op,key,text; public int x,y,tol; public long hwnd; public bool enabled; }
public static class NativeHost {
 [DllImport("user32.dll")] static extern bool SetProcessDpiAwarenessContext(IntPtr p);
 [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int w,int height,uint flags);
 [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr h);
 [DllImport("user32.dll")] static extern int GetSystemMetrics(int n);
 static IDesktopView desktop; static bool held;static Pt last;static DateTime until;static int tolerance;
 static IDesktopView Desktop {get{if(desktop!=null)return desktop;IDesktopView primary=null;try{primary=new DesktopView();primary.List();desktop=primary;}catch{if(primary!=null)primary.Dispose();desktop=new ListViewDesktop();}return desktop;}}
 static bool Interrupt {get{return Win.Escape||(Win.GetAsyncKeyState(1)&0x8000)!=0||(Win.GetAsyncKeyState(2)&0x8000)!=0;}}
 static string FoodPath(string kind){return Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),kind=="fish"?"鱼鱼-小鱼干.txt":"鱼鱼-奶油蛋糕.txt");}
 static object Execute(Request r){
  if(r.op=="snapshot"){var windows=Win.Windows();try{return new{icons=Desktop.List().Concat(FoodWidgets.Snapshot()).ToList(),autoArrange=Desktop.AutoArrange,windows,foodState=FoodWidgets.State(),backend=Desktop.Backend,desktopError=""};}catch(Exception e){if(desktop!=null){desktop.Dispose();desktop=null;}return new{icons=FoodWidgets.Snapshot(),autoArrange=true,windows,foodState=FoodWidgets.State(),backend="unavailable",desktopError=e.Message};}}
  if(r.op=="input"){Pt p;Win.GetCursorPos(out p);return new{x=p.X,y=p.Y,interrupt=Interrupt,escape=Win.Escape,feed=FoodWidgets.TakeClick()};}
  if(r.op=="cursorStart"){Pt p;Win.GetCursorPos(out p);int t=Math.Max(1,Math.Min(30,r.tol));held=!Interrupt&&Math.Sqrt(Math.Pow(p.X-r.x,2)+Math.Pow(p.Y-r.y,2))<=t;last=p;tolerance=Math.Max(14,t);until=DateTime.UtcNow.AddSeconds(3.5);return new{held};}
  if(r.op=="cursorStop"){held=false;return new{held};}
  if(r.op=="cursor"){
   Pt p;Win.GetCursorPos(out p);int minX=GetSystemMetrics(76),minY=GetSystemMetrics(77),maxX=minX+GetSystemMetrics(78),maxY=minY+GetSystemMetrics(79);
   if(!held||Interrupt||DateTime.UtcNow>until||Math.Abs(p.X-last.X)>tolerance||Math.Abs(p.Y-last.Y)>tolerance||Math.Abs(r.x-p.X)>80||Math.Abs(r.y-p.Y)>80||r.x<minX||r.x>=maxX||r.y<minY||r.y>=maxY)held=false;
   if(held){held=Win.SetCursorPos(r.x,r.y);Win.GetCursorPos(out last);}return new{held};
  }
  if(r.op=="icon"||r.op=="restoreIcon"){if(r.op=="icon"&&Interrupt)throw new Exception("已停止");var point=Desktop.ToClient(r.x,r.y);var actual=Desktop.Move(r.key,point.X,point.Y);var result=Desktop.ToScreen(actual.X,actual.Y);return new{x=result.X,y=result.Y};}
  if(r.op=="window"){
   var w=Win.Windows().FirstOrDefault(v=>v.Id==r.hwnd);if(w==null||w.Title.StartsWith("鱼鱼桌宠")||IsZoomed(new IntPtr(r.hwnd))||Interrupt)throw new Exception("窗口当前不能移动");
   if(!SetWindowPos(new IntPtr(r.hwnd),IntPtr.Zero,r.x,r.y,0,0,0x0015))throw new Exception("窗口没有移动");return new{ok=true};
  }
  if(r.op=="foodTopmost"){FoodWidgets.SetTopmost(r.enabled);return FoodWidgets.State();}
  if(r.op=="foods"){FoodWidgets.Ensure();return FoodWidgets.State();}
  if(r.op=="foodResult"){FoodWidgets.Result(r.key,r.text);return FoodWidgets.State();}
  if(r.op=="foodWidgetTest")return FoodWidgets.Test(r.text);
  if(r.op=="redeem"){
   if(r.key=="fish-widget:fish"||r.key=="fish-widget:cake")return FoodWidgets.Redeem(r.key.Substring("fish-widget:".Length));
   string kind=String.Equals(r.key,FoodPath("fish"),StringComparison.OrdinalIgnoreCase)?"fish":String.Equals(r.key,FoodPath("cake"),StringComparison.OrdinalIgnoreCase)?"cake":null;
   if(kind==null||!File.Exists(r.key)||new FileInfo(r.key).Length>4096)throw new Exception("不是鱼鱼的投喂文件");var lines=File.ReadAllLines(r.key,Encoding.UTF8);if(lines.Length<2||lines[0]!="FISH-PET-FOOD-V1"||lines[1]!=kind)throw new Exception("投喂文件内容已改变");return new{kind};
  }
  if(r.op=="essay"){
   if(String.IsNullOrWhiteSpace(r.text)||r.text.Length>12000)throw new Exception("随笔内容无效");string file=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory),"鱼鱼随笔-"+DateTime.Now.ToString("yyyyMMdd-HHmmss")+"-"+Guid.NewGuid().ToString("N").Substring(0,6)+".txt");
   using(var s=new FileStream(file,FileMode.CreateNew,FileAccess.Write))using(var w=new StreamWriter(s,new UTF8Encoding(true))){w.WriteLine("鱼鱼的随笔 · "+DateTime.Now.ToString("yyyy-MM-dd HH:mm"));w.WriteLine();w.WriteLine(r.text);}return new{file};
  }
  throw new Exception("未知桌面动作");
 }
 [STAThread] public static void Main(){
  try{SetProcessDpiAwarenessContext(new IntPtr(-4));}catch{}
  Console.InputEncoding=new UTF8Encoding(false);Console.OutputEncoding=new UTF8Encoding(false);var json=new JavaScriptSerializer{MaxJsonLength=1048576};string line;
  while((line=Console.ReadLine())!=null){Request r=null;try{if(line.Length>65536)throw new Exception("请求过长");r=json.Deserialize<Request>(line);var result=Execute(r);Console.WriteLine(json.Serialize(new{id=r.id,ok=true,result}));}catch(Exception e){held=false;Console.WriteLine(json.Serialize(new{id=r==null?0:r.id,ok=false,error=e.Message}));if(desktop!=null){desktop.Dispose();desktop=null;}}}
  held=false;FoodWidgets.Close();if(desktop!=null)desktop.Dispose();
 }
}
}
