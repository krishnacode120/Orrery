"""Original schematic artwork, not an astronomical measurement or simulation screenshot."""
from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
scale=2
im=Image.new('RGB',(1200*scale,630*scale),'#0b1017')
d=ImageDraw.Draw(im)
def font(size):
    for p in [Path('C:/Windows/Fonts/segoeui.ttf'),Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]:
        if p.exists(): return ImageFont.truetype(str(p),size*scale)
    return ImageFont.load_default(size=size*scale)
def text(x,y,t,size,color): d.text((x*scale,y*scale),t,font=font(size),fill=color)
def line(points,color,width=1): d.line([(x*scale,y*scale) for x,y in points],fill=color,width=width*scale)
def ellipse(box,color,width=1,fill=None): d.ellipse(tuple(v*scale for v in box),outline=color,width=width*scale,fill=fill)
for r in [100,165,225,285,350]:
    ellipse((870-r,332-r*.59,870+r,332+r*.59),'#344454')
line([(64,84),(1136,84)],'#32404b')
text(64,37,'ORRERY',27,'#e4eaee')
text(64,133,'INTERACTIVE SPACE PHYSICS',15,'#cdb480')
text(60,184,'A universe', 60,'#edf1f4')
text(60,253,'to explore.',60,'#edf1f4')
text(64,357,'Solar System · Orbital mechanics',21,'#b7c5cf')
text(64,393,'Rockets · Satellites · What-If experiments',18,'#a0b1be')
for r in range(37,17,-1):
    color=(int(70+(37-r)*6),int(48+(37-r)*4),24)
    ellipse((870-r,332-r,870+r,332+r),color,fill=color)
ellipse((852,314,888,350),'#ffdfa0',fill='#efbc66')
for x,y,r,c in [(785,292,5,'#9c958c'),(1008,312,9,'#b99c78'),(1023,458,24,'#426985'),(692,435,11,'#b57251')]:
    ellipse((x-r,y-r,x+r,y+r),c,fill=c)
# Earth: restrained schematic continents, not a geographically accurate map.
d.polygon([(1010*scale,443*scale),(1028*scale,439*scale),(1038*scale,450*scale),(1026*scale,457*scale),(1024*scale,475*scale),(1015*scale,466*scale)],fill='#8eaca0')
path=[]
for k in range(121):
    a=math.pi*.1+k/120*math.pi*1.4
    path.append((865+195*math.cos(a),366+127*math.sin(a)))
for i in range(0,len(path)-2,5):line(path[i:i+3],'#d0b987',2)
x,y=path[40]
d.polygon([((x+8)*scale,y*scale),((x-7)*scale,(y-5)*scale),((x-3)*scale,(y+8)*scale)],fill='#eef3f5')
text(64,551,'EXPLORE  /  SIMULATE  /  ANALYZE',14,'#ceb78b')
text(864,567,'Schematic orbital illustration',11,'#8999a5')
out=root/'public/social';out.mkdir(parents=True,exist_ok=True)
im=im.resize((1200,630),Image.Resampling.LANCZOS)
im.save(out/'orrery-preview.png',optimize=True)
im.save(out/'orrery-preview.webp',quality=86,method=6)
source=root/'docs/screenshots/reference-mission-replay.jpg'
if source.exists():
    Image.open(source).convert('RGB').save(root/'public/site/mission-replay.webp',quality=82,method=6)
print('Created local PNG/WebP launch assets')
