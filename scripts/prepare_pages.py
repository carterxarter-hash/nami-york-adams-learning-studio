from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import json, random, re

ROOT=Path(__file__).resolve().parents[1]
LOGO=ROOT/'public/resources/nami-york-adams-logo.png'
ICONS=ROOT/'icons'
ICONS.mkdir(exist_ok=True)
base=Image.open(LOGO).convert('RGBA')

def make_icon(n):
    random.seed(2909+n)
    im=Image.new('RGBA',(n,n),(0,3,0,255))
    d=ImageDraw.Draw(im)
    try:
        mono=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf',max(7,n//42))
    except Exception:
        mono=ImageFont.load_default()
    chars='010110101001<>[]{}+-*'
    step=max(8,n//24)
    for x in range(3,n-3,step):
        start=-random.randint(0,n//3)
        length=random.randint(11,24)
        for j in range(length):
            y=start+j*max(6,step//2)
            if y>=n: break
            a=max(30,160-j*6)
            c=random.choice(chars)
            d.text((x,y),c,font=mono,fill=(32,255,85,a))
            if j==length-1:
                d.line((x+2,y+step//2,x+2,min(n-3,y+step*2)),fill=(32,255,85,80),width=max(1,n//256))

    logo=base.copy()
    logo.thumbnail((int(n*.90),int(n*.72)),Image.Resampling.LANCZOS)
    px=logo.load()
    rng=random.Random(4409+n)
    for yy in range(logo.height):
        frac=yy/max(1,logo.height-1)
        for xx in range(logo.width):
            r,g,b,a=px[xx,yy]
            if a<8:
                continue
            if r>235 and g>235 and b>235:
                px[xx,yy]=(0,0,0,0)
                continue
            if b>70 and b>r*1.15 and b>g*1.05:
                if frac>.68 and rng.random() < (frac-.68)*.72:
                    px[xx,yy]=(0,0,0,0)
                else:
                    px[xx,yy]=(32,255,85,a)
            else:
                px[xx,yy]=(0,0,0,0)

    lx=(n-logo.width)//2
    ly=max(8,int(n*.08))
    mask=logo.getchannel('A').filter(ImageFilter.GaussianBlur(max(1,n//90)))
    glow=Image.new('RGBA',logo.size,(32,255,85,0))
    glow.putalpha(mask.point(lambda v:min(150,v)))
    im.alpha_composite(glow,(lx,ly))
    im.alpha_composite(logo,(lx,ly))

    dd=ImageDraw.Draw(im)
    for i,x in enumerate(range(int(n*.12),int(n*.90),max(7,n//28))):
        top=int(n*.68)+(i*17)%max(12,n//10)
        length=max(10,n//20)+(i*11)%max(12,n//8)
        dd.line((x,top,x,min(n-8,top+length)),fill=(32,255,85,105),width=max(1,n//256))
        if i%2==0:
            dd.text((x-max(2,n//120),min(n-15,top+length)),random.choice(chars),font=mono,fill=(160,255,180,150))
    dd.rounded_rectangle((5,5,n-6,n-6),radius=max(18,n//10),outline=(32,255,85,125),width=max(1,n//180))
    im.convert('RGB').save(ICONS/f'icon-{n}.png',optimize=True,quality=95)

for size in (180,192,512):
    make_icon(size)

index=ROOT/'index.html'
s=index.read_text(encoding='utf-8')
s=re.sub(r'<link rel="apple-touch-icon"[^>]*>', '<link rel="apple-touch-icon" href="./icons/icon-180.png?v=6">', s, count=1)
s=re.sub(r'<link rel="icon"[^>]*>', '<link rel="icon" type="image/png" sizes="192x192" href="./icons/icon-192.png?v=6">', s, count=1)
s=s.replace("./icons/matrix-nami.svg?v=3","./icons/icon-180.png?v=6")
s=s.replace("matrixFav.type='image/svg+xml'","matrixFav.type='image/png'")
index.write_text(s,encoding='utf-8')

manifest=ROOT/'manifest.webmanifest'
m=json.loads(manifest.read_text(encoding='utf-8'))
m['name']='NAMI York Adams'
m['short_name']='NAMI York Adams'
m['icons']=[
    {'src':'./icons/icon-192.png?v=6','sizes':'192x192','type':'image/png','purpose':'any maskable'},
    {'src':'./icons/icon-512.png?v=6','sizes':'512x512','type':'image/png','purpose':'any maskable'}
]
manifest.write_text(json.dumps(m,indent=2)+'\n',encoding='utf-8')

sw=ROOT/'sw.js'
w=sw.read_text(encoding='utf-8')
w=re.sub(r"const CACHE = '[^']+';","const CACHE = 'nami-learning-studio-2026-09-29-v6-pages';",w,count=1)
w='\n'.join(line for line in w.splitlines() if 'matrix-nami.svg' not in line)+'\n'
sw.write_text(w,encoding='utf-8')
