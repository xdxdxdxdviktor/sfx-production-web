#!/usr/bin/env python3
"""Cut the homepage showreel from the full-length source videos (run locally).
Usage: python3 tools/make-showreel.py <ffmpeg> <work dir>; shots sit on a 125 BPM grid (12 frames per beat)
so the cuts land on the beat of tools/make-showreel-music.py. Then concat, add the logo card and the music."""
import subprocess, os, sys, json
FF = sys.argv[1]; SRC = "/Users/viktorstransky/Desktop/jirka ukázka"; OUT = sys.argv[2]
W, H, FPS = 1920, 1080, 25
os.makedirs(OUT, exist_ok=True)
_crop = {}
def cropdetect(f, at):
    if f in _crop: return _crop[f]
    cd = subprocess.run([FF,'-v','info','-ss',str(at),'-t','3','-i',os.path.join(SRC,f),'-vf','cropdetect=24:2:0','-f','null','-'],capture_output=True,text=True).stderr
    c = [l.split('crop=')[1].split()[0] for l in cd.splitlines() if 'crop=' in l]
    r = ''
    if c:
        cw,ch,cx,cy = map(int,c[-1].split(':'))
        if ch < 2160*.94: r = f'crop={cw}:{ch}:{cx}:{cy},'
    _crop[f] = r; return r
# zoom: crop a centred window (fraction of the frame) to lose burned-in captions / watermarks; oy = vertical centre
def land(f, t, d, zoom=1.0, oy=.5, bars=False):
    cr = 'crop=iw:ih*0.74:0:ih*0.13,' if bars else cropdetect(f, t)
    z = ''
    if zoom > 1: z = f"crop=iw/{zoom}:ih/{zoom}:(iw-iw/{zoom})/2:(ih-ih/{zoom})*{oy},"
    return {'in':[(f,t,d)], 'vf': f"[0:v]{cr}{z}scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1,format=yuv420p[v]"}
def tri(a, b, c, d):
    ins = [(x[0], x[1], d) for x in (a,b,c)]
    w = W//3
    p = ''.join(f"[{i}:v]scale={w}:-2,crop={w}:{H},fps={FPS},setsar=1[p{i}];" for i in range(3))
    return {'in':ins, 'vf': p + f"[p0][p1][p2]hstack=3,pad={W}:{H}:(ow-iw)/2:0,format=yuv420p[v]"}
RE = dict(zoom=1.5, oy=.5)   # real-estate: lose agent name (top-left) and subtitles (bottom)
SHOTS = [
 land('CDS_1.MP4', 141.0, 1.92),
 land('CDS_1.MP4', 73.2, 1.92),
 land('CDS_1.MP4', 33.0, 1.44),
 land('CDS_1.MP4', 19.6, 0.96),
 land('skalice_UHD.mp4', 12.1, 0.96, bars=True),
 land('skalice_UHD.mp4', 75.0, 1.44, bars=True),
 land('skalice_UHD.mp4', 90.8, 1.92, bars=True),
 land('16_9.mp4', 37.0, 1.44, bars=True),
 land('16_9.mp4', 50.6, 1.44, bars=True),
 tri(('drinky.mp4',6.2),('drinky.mp4',8.0),('drinky.mp4',13.5), 2.40),
 land('olesko_V1.mp4', 20.6, 0.96),
 land('olesko_V1.mp4', 64.0, 0.96),
 land('olesko_V1.mp4', 122.5, 1.92),
 land('LUT.mp4', 42.3, 1.92, **RE),
 land('Severni_Terasa.mp4', 17.0, 0.96, **RE),
 land('Severni_Terasa.mp4', 45.0, 0.96, **RE),
 land('trebusin_finale1.mp4', 75.2, 0.96, **RE),
 land('stodulky_final.mp4', 77.0, 1.44, **RE),
 tri(('snidane.mp4',3.2),('snidane.mp4',23.8),('snidane.mp4',30.6), 2.40),
 land('Severni_Terasa.mp4', 66.6, 1.44, **RE),
 land('hlasobcanu_4k.mp4', 37.8, 1.92, zoom=1.3, oy=.6),
 tri(('DIVINE/Dermapen.mp4',9.7),('DIVINE/1.mp4',21.2),('DIVINE/1.mp4',26.0), 2.40),
 land('LUT.mp4', 87.4, 0.96, **RE),
 land('CDS_1.MP4', 167.8, 1.44),
 land('CDS_1.MP4', 181.2, 1.92),
]
files = []
for i, s in enumerate(SHOTS):
    o = os.path.join(OUT, f'{i:02d}.mp4'); files.append(o)
    if os.path.exists(o) and '--force' not in sys.argv: continue
    args = [FF,'-v','error','-y']
    for f,t,d in s['in']: args += ['-ss',f'{t:.2f}','-t',f'{d+0.3:.2f}','-i',os.path.join(SRC,f)]
    nfr = round(s['in'][0][2]*FPS)
    args += ['-filter_complex', s['vf'], '-map','[v]','-frames:v',str(nfr),'-an','-c:v','libx264','-preset','fast','-crf','14', o]
    subprocess.run(args, check=True); print('shot', i, flush=True)
json.dump(files, open(os.path.join(OUT,'list.json'),'w'))
