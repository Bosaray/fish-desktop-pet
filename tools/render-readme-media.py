from pathlib import Path
import sys
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1]
fontroot=Path('C:/Windows/Fonts')
def font(n,bold=False):return ImageFont.truetype(str(fontroot/('msyhbd.ttc' if bold else 'msyh.ttc')),n)
def text(d,xy,s,n=25,fill='#dce6f6',bold=False):d.text(xy,s,font=font(n,bold),fill=fill)
def asset(canvas,p,box):
 im=Image.open(p).convert('RGBA');bb=im.getchannel('A').point(lambda x:255 if x>20 else 0).getbbox();im=im.crop(bb);im.thumbnail((box[2],box[3]),Image.Resampling.LANCZOS);canvas.alpha_composite(im,(box[0]+(box[2]-im.width)//2,box[1]+(box[3]-im.height)//2))
props=root/'app/renderer/assets/props';out=root/'docs/media'
cover=Image.new('RGBA',(1600,700));pix=cover.load()
for y in range(700):
 for x in range(1600):
  t=(x/1600*.7+y/700*.3);pix[x,y]=(int(14+16*t),int(23+15*t),int(43+21*t),255)
d=ImageDraw.Draw(cover)
for x,y,r in [(1450,70,170),(1240,610,160),(860,130,60)]:d.ellipse((x-r,y-r,x+r,y+r),outline='#344764',width=2)
d.rounded_rectangle((75,70,355,116),radius=23,fill='#273a54');text(d,(98,78),'WINDOWS DESKTOP PET',18,'#a8d8ef',True)
text(d,(73,151),'鱼鱼桌宠',88,'#f3f3ff',True);text(d,(80,280),'住在你桌面上的小鱼鱼。',35,'#c6d6ef')
text(d,(82,357),'玩一会儿球，抱着枕头歇一歇，',25);text(d,(82,401),'饿了就去零食盒里找点吃的。',25)
for x,label,w in [(82,'本地互动',155),(253,'自主活动',155),(424,'QQ 联动',160)]:
 d.rounded_rectangle((x,487,x+w,538),radius=14,fill='#293b57',outline='#455d80');text(d,(x+23,498),label,22,'#c5d9ef')
# Original portrait is used intact; no generated replacement character.
portrait=Image.open(root/'docs/media/portrait.png').convert('RGBA');portrait=portrait.resize((256,256),Image.Resampling.LANCZOS)
d.rounded_rectangle((1065,115,1353,403),radius=28,fill='#d7e7ef');cover.alpha_composite(portrait,(1081,131))
asset(cover,props/'nest-back.png',(880,430,310,150));asset(cover,props/'snack-box.png',(1265,425,230,160));asset(cover,props/'toy-ball.png',(1180,515,80,80))
text(d,(82,625),'BOSARAY  /  FISH DESKTOP PET',19,'#8298bb');text(d,(963,641),'角色与道具展示 · 非运行截图',18,'#8298bb')
cover.convert('RGB').save(out/'cover.png',optimize=True)
configs=[('play','玩一会儿','推球、追泡泡，结束后收好。','toy-ball.png'),('rest','抱枕头歇歇','回到小窝，把枕头抱在怀里。','cushion-pressed.png'),('snack','吃点零食','小鱼干和奶油蛋糕，装进盒里。','snack-box.png'),('company','待在你身边','可以拖动，也可以安静陪伴。','nest-back.png')]
for key,title,desc,img in configs:
 card=Image.new('RGBA',(760,420),'#17243b');cd=ImageDraw.Draw(card);cd.rounded_rectangle((1,1,758,418),radius=24,outline='#334b6c',width=2);text(cd,(35,30),title,34,'#edf3ff',True);text(cd,(35,86),desc,23,'#adbfda');asset(card,props/img,(180,160,400,210));text(cd,(35,380),'道具素材示意',16,'#788eaf');card.convert('RGB').save(out/(key+'.png'),optimize=True)
print('cover and four feature cards saved')
