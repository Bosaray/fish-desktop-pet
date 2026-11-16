using System;
using System.IO;
using System.Linq;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Windows.Forms;
using System.Threading;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Web.Script.Serialization;
namespace FishDesktopLab {
public static class FoodWidgets {
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindow(string cls,string name);
 [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern IntPtr FindWindowEx(IntPtr parent,IntPtr after,string cls,string name);
 [DllImport("user32.dll")] static extern bool EnumWindows(Win.EnumProc callback,IntPtr p);
 [DllImport("user32.dll")] static extern IntPtr SetParent(IntPtr child,IntPtr parent);
 [DllImport("user32.dll")] static extern IntPtr GetParent(IntPtr child);
 [DllImport("user32.dll",EntryPoint="GetWindowLongPtrW")] static extern IntPtr GetStyle(IntPtr h,int index);
 [DllImport("user32.dll",EntryPoint="SetWindowLongPtrW")] static extern IntPtr SetStyle(IntPtr h,int index,IntPtr value);
 [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr h);
 [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int w,int height,uint flags);
 static readonly object gate=new object();static Thread thread;static WidgetForm form;static ManualResetEvent ready;
 static List<DesktopItem> items=new List<DesktopItem>();static string error="",busyId="",lastPhase="",lastKind="";static bool desktopLayer;static bool topmost;static int layerChanges;
 static DateTime busyUntil,feedbackUntil;static Click waiting;static bool enabled;
 public class Click {public string id,kind;public long at;}
 public static string Profile {get{return Environment.GetEnvironmentVariable("FISH_WIDGET_PROFILE")??Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),"FishDesktopPet");}}
 public static void SetTopmost(bool value){topmost=value;var f=form;if(f!=null&&!f.IsDisposed)f.Invoke((Action)(()=>{f.AttachDesktop();f.Publish();}));}
 public static void Ensure(){
  lock(gate){enabled=true;if(thread==null||!thread.IsAlive){ready=new ManualResetEvent(false);thread=new Thread(()=>{
   try{Application.EnableVisualStyles();form=new WidgetForm();var h=form.Handle;ready.Set();Application.Run(form);}
   catch(Exception e){lock(gate){error=e.Message;items.Clear();}ready.Set();}
   finally{lock(gate){items.Clear();form=null;}}
  });thread.IsBackground=true;thread.SetApartmentState(ApartmentState.STA);thread.Start();}}
  if(!ready.WaitOne(1800))throw new Exception("投喂按钮启动较慢，请稍后重试");
  lock(gate)if(form==null)throw new Exception("桌面投喂按钮尚未就绪："+error);
 }
 public static List<DesktopItem> Snapshot(){
  if(enabled)try{Ensure();}catch{}
  lock(gate)return new List<DesktopItem>(items);
 }
 public static object State(){lock(gate)return new{ready=items.Count==2,count=items.Count,busy=busyId!="",phase=lastPhase,desktopLayer,layerChanges,topmost=topmost&&form!=null&&form.TopMost,error};}
 public static Click TakeClick(){lock(gate){var result=waiting;waiting=null;if(result!=null&&DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()-result.at>10000)return null;return result;}}
 static bool Begin(string kind,bool manual,out string id){lock(gate){
  id="";if(items.Count!=2||busyId!="")return false;
  id=Guid.NewGuid().ToString("N");busyId=id;busyUntil=DateTime.UtcNow.AddSeconds(manual?25:12);lastPhase=manual?"pending":"accepted";lastKind=kind;
  if(manual)waiting=new Click{id=id,kind=kind,at=DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()};
  return true;
 }}
 public static object Redeem(string kind){
  string id;if(!Begin(kind,false,out id))throw new Exception("投喂按钮暂时忙，请稍后再试");
  UpdateUi();return new{kind,widget=true,id};
 }
 public static void Result(string id,string phase){lock(gate){
  if(id!=busyId||!new[]{"accepted","completed","cancelled","busy","failed"}.Contains(phase))return;
  lastPhase=phase;
  if(phase!="accepted"){busyId="";waiting=null;feedbackUntil=DateTime.UtcNow.AddSeconds(2);}
 }UpdateUi();}
 static void UpdateUi(){var f=form;if(f!=null&&!f.IsDisposed&&f.IsHandleCreated)try{f.BeginInvoke((Action)(()=>f.RefreshButtons()));}catch{}}
 public static void Close(){enabled=false;var f=form;if(f!=null&&!f.IsDisposed)try{f.BeginInvoke((Action)(()=>f.Close()));}catch{}}
 public static object Test(string kind){
  if(Environment.GetEnvironmentVariable("FISH_WIDGET_TEST")!="1")throw new Exception("未知桌面动作");Ensure();
  var f=form;f.Invoke((Action)(()=>{if(kind=="fish"||kind=="cake")f.Button(kind).PerformClick();}));
  Directory.CreateDirectory(Profile);string file=Path.Combine(Profile,"food-widget-preview.png");
  f.Invoke((Action)(()=>{using(var bitmap=new Bitmap(f.Width,f.Height)){f.DrawToBitmap(bitmap,new Rectangle(0,0,f.Width,f.Height));bitmap.Save(file);}}));
  return new{file,state=State()};
 }
 static IntPtr DesktopHost(){IntPtr host=IntPtr.Zero;EnumWindows((h,p)=>{var view=FindWindowEx(h,IntPtr.Zero,"SHELLDLL_DefView",null);if(view!=IntPtr.Zero&&Win.IsWindowVisible(h)&&Win.IsWindowVisible(view)){host=view;return false;}return true;},IntPtr.Zero);if(host==IntPtr.Zero){var p=FindWindow("Progman",null);if(Win.IsWindowVisible(p))host=p;}return host;}
 static GraphicsPath Round(Rectangle r,int radius){var p=new GraphicsPath();int d=radius*2;p.AddArc(r.Left,r.Top,d,d,180,90);p.AddArc(r.Right-d,r.Top,d,d,270,90);p.AddArc(r.Right-d,r.Bottom-d,d,d,0,90);p.AddArc(r.Left,r.Bottom-d,d,d,90,90);p.CloseFigure();return p;}
 public sealed class FoodButton:Button {
  readonly string title;readonly Image art;readonly float scale;bool hover;
  public string Status="点击投喂";
  public FoodButton(string kind,float s){scale=s;title=kind=="fish"?"小鱼干":"奶油蛋糕";AccessibleName="投喂"+title;AccessibleRole=AccessibleRole.PushButton;FlatStyle=FlatStyle.Flat;FlatAppearance.BorderSize=0;Cursor=Cursors.Hand;TabStop=true;
   string file=Path.Combine(AppDomain.CurrentDomain.BaseDirectory,"foods",kind+".png");using(var source=Image.FromFile(file))art=new Bitmap(source);
   SetStyle(ControlStyles.AllPaintingInWmPaint|ControlStyles.UserPaint|ControlStyles.OptimizedDoubleBuffer,true);
  }
  protected override void OnMouseEnter(EventArgs e){hover=true;Invalidate();base.OnMouseEnter(e);}
  protected override void OnMouseLeave(EventArgs e){hover=false;Invalidate();base.OnMouseLeave(e);}
  protected override void OnPaint(PaintEventArgs e){var g=e.Graphics;g.SmoothingMode=SmoothingMode.AntiAlias;g.InterpolationMode=InterpolationMode.HighQualityBicubic;
   using(var p=Round(new Rectangle(1,1,Width-3,Height-3),(int)(12*scale)))using(var b=new SolidBrush(hover&&Enabled?Color.FromArgb(55,71,83):Color.FromArgb(37,48,58)))using(var pen=new Pen(Color.FromArgb(75,103,113))){g.FillPath(b,p);g.DrawPath(pen,p);}
   float side=52*scale,ratio=Math.Min(side/art.Width,side/art.Height);float w=art.Width*ratio,h=art.Height*ratio;g.DrawImage(art,(Width-w)/2,8*scale+(side-h)/2,w,h);
   using(var font=new Font("Microsoft YaHei UI",11.5f*scale,FontStyle.Bold,GraphicsUnit.Pixel))using(var b=new SolidBrush(Color.FromArgb(238,243,242)))using(var format=new StringFormat{Alignment=StringAlignment.Center})g.DrawString(title,font,b,new RectangleF(0,67*scale,Width,18*scale),format);
   using(var font=new Font("Microsoft YaHei UI",9.5f*scale,FontStyle.Regular,GraphicsUnit.Pixel))using(var b=new SolidBrush(Color.FromArgb(168,193,192)))using(var format=new StringFormat{Alignment=StringAlignment.Center})g.DrawString(Status,font,b,new RectangleF(0,87*scale,Width,16*scale),format);
   if(Focused)ControlPaint.DrawFocusRectangle(g,new Rectangle(5,5,Width-10,Height-10),Color.White,Color.Transparent);
  }
  protected override void Dispose(bool disposing){if(disposing)art.Dispose();base.Dispose(disposing);}
 }
 public sealed class WidgetForm:Form {
  readonly FoodButton fish,cake;readonly Label grip;readonly float scale;readonly IntPtr host;readonly System.Windows.Forms.Timer timer;
  int S(float n){return (int)Math.Round(n*scale);}
  public FoodButton Button(string kind){return kind=="fish"?fish:cake;}
  protected override bool ShowWithoutActivation {get{return true;}}
  protected override CreateParams CreateParams{get{var p=base.CreateParams;p.ExStyle|=0x08000080;return p;}}
  public WidgetForm(){
   host=DesktopHost();if(host==IntPtr.Zero)throw new Exception("没有找到 Explorer 桌面");
   uint dpi=96;try{dpi=GetDpiForWindow(host);}catch{}scale=Math.Max(1,dpi/96f);
   Text="鱼鱼桌宠 · 投喂";FormBorderStyle=FormBorderStyle.None;ShowInTaskbar=false;AutoScaleMode=AutoScaleMode.None;BackColor=Color.FromArgb(24,33,42);ClientSize=new Size(S(210),S(142));StartPosition=FormStartPosition.Manual;
   Region=new Region(Round(new Rectangle(0,0,Width,Height),S(14)));
   grip=new Label{Text="鱼鱼投喂",ForeColor=Color.FromArgb(161,181,189),Font=new Font("Microsoft YaHei UI",S(9),FontStyle.Regular,GraphicsUnit.Pixel),Bounds=new Rectangle(S(12),S(4),S(186),S(22)),Cursor=Cursors.Default,TextAlign=ContentAlignment.MiddleLeft};Controls.Add(grip);
   fish=new FoodButton("fish",scale){Bounds=new Rectangle(S(10),S(27),S(91),S(106))};cake=new FoodButton("cake",scale){Bounds=new Rectangle(S(109),S(27),S(91),S(106))};Controls.Add(fish);Controls.Add(cake);
   fish.Click+=(s,e)=>Clicked("fish");cake.Click+=(s,e)=>Clicked("cake");
   timer=new System.Windows.Forms.Timer{Interval=500};timer.Tick+=(s,e)=>{
    if(topmost?!Pinned():Win.IsWindow(host)&&Win.IsWindowVisible(host)&&(GetParent(Handle)!=host||!Win.IsWindowVisible(Handle)))AttachDesktop();
    PinPosition();Publish();
    bool changed=false;lock(gate){if(busyId!=""&&DateTime.UtcNow>busyUntil){busyId="";waiting=null;lastPhase="";changed=true;}if(lastPhase!=""&&busyId==""&&DateTime.UtcNow>feedbackUntil){lastPhase="";changed=true;}}
    if(changed)RefreshButtons();
   };timer.Start();
  }
  protected override void OnHandleCreated(EventArgs e){base.OnHandleCreated(e);SetParent(Handle,host);long style=FoodWidgets.GetStyle(Handle,-16).ToInt64();FoodWidgets.SetStyle(Handle,-16,new IntPtr((style&~0x80000000L)|0x40000000L));
   desktopLayer=GetParent(Handle)==host;if(!desktopLayer)throw new Exception("投喂按钮没有接入桌面层");
   PinPosition();
  }
  bool Pinned(){return GetParent(Handle)==IntPtr.Zero&&(FoodWidgets.GetStyle(Handle,-20).ToInt64()&8)!=0&&Win.IsWindowVisible(Handle);}
  public void AttachDesktop(){
   if(topmost){if(Pinned())return;layerChanges++;SetParent(Handle,IntPtr.Zero);long s=FoodWidgets.GetStyle(Handle,-16).ToInt64();FoodWidgets.SetStyle(Handle,-16,new IntPtr((s&~0x40000000L)|0x80000000L));TopMost=true;SetWindowPos(Handle,new IntPtr(-1),Left,Top,Width,Height,Win.IsWindowVisible(Handle)?0x0010u:0x0050u);desktopLayer=false;return;}
   TopMost=false;
   // Form.Show may restore a top-level window's styles after HandleCreated.
   // Attach only after Show, then assert the actual native visibility/parent.
   long style=FoodWidgets.GetStyle(Handle,-16).ToInt64();FoodWidgets.SetStyle(Handle,-16,new IntPtr((style&~0x80000000L)|0x40000000L));SetParent(Handle,host);
   SetWindowPos(Handle,IntPtr.Zero,Left,Top,Width,Height,0x0050);desktopLayer=GetParent(Handle)==host&&Win.IsWindowVisible(Handle);
  }
  protected override void OnShown(EventArgs e){base.OnShown(e);AttachDesktop();Publish();}
  void PinPosition(){var area=Screen.PrimaryScreen.WorkingArea;var point=new Pt(Math.Max(area.Left,area.Right-Width-S(16)),area.Top+S(16));if(!topmost)Win.ScreenToClient(host,ref point);if(Left!=point.X||Top!=point.Y)SetWindowPos(Handle,IntPtr.Zero,point.X,point.Y,Width,Height,0x0010);}
  public void Publish(){var result=new List<DesktopItem>();desktopLayer=GetParent(Handle)==host&&Win.IsWindowVisible(Handle);if(desktopLayer||topmost&&GetParent(Handle)==IntPtr.Zero&&Win.IsWindowVisible(Handle))foreach(string kind in new[]{"fish","cake"}){var button=Button(kind);var p=button.PointToScreen(new Point(button.Width/2,button.Height-S(14)));result.Add(new DesktopItem("fish-widget:"+kind,kind=="fish"?"鱼鱼-小鱼干":"鱼鱼-奶油蛋糕",0,0,p.X-S(24),p.Y-S(20)));}lock(gate)items=result;}
  void Clicked(string kind){string id;if(Begin(kind,true,out id))RefreshButtons();}
  public void RefreshButtons(){lock(gate){fish.Enabled=cake.Enabled=busyId=="";fish.Status=cake.Status="点击投喂";if(lastKind=="fish"||lastKind=="cake")Button(lastKind).Status=busyId!=""?"投喂中…":lastPhase=="completed"?"已完成":lastPhase!=""?"暂时未完成":"点击投喂";}fish.Invalidate();cake.Invalidate();}
  protected override void Dispose(bool disposing){if(disposing)timer.Dispose();base.Dispose(disposing);}
 }
}
}
