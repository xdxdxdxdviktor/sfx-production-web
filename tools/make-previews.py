#!/usr/bin/env python3
"""Make web previews from full-length videos (run locally, not in CI).
For each project: a ~10 s teaser (5 short cuts, no audio, 720p) and a poster image.
Usage: python3 tools/make-previews.py "<folder with source videos>" <ffmpeg> <ffprobe>
"""
import subprocess, sys, os, json
SRC, FF, FP = sys.argv[1], sys.argv[2], sys.argv[3]
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'assets', 'portfolio')
os.makedirs(OUT, exist_ok=True)

# id, source file, poster position (0–1), vertical
JOBS = [
 ('innotactical-cbrn', '16_9.mp4', .44, False), ('zavodni-okruh', 'CDS_1.MP4', .19, False),
 ('lhota-u-trebenic', 'LUT.mp4', .44, False), ('roudnice-pozemek', 'Roudnice_Pozemek_4K.mp4', .31, False),
 ('severni-terasa', 'Severni_Terasa.mp4', .31, False), ('ustek-dum', 'U.S.T.E.K.mp4', .19, False),
 ('usti-byt', 'UL_4K.mp4', .19, False), ('cizkovice-byt', 'cizkovice_byt.mp4', .31, False),
 ('bar-drinky', 'drinky.mp4', .81, True), ('hlas-obcanu', 'hlasobcanu_4k.mp4', .44, False),
 ('litomerice-dum', 'ltm_0001.mp4', .69, False), ('litomerice-byt', 'ltm_4K.mp4', .19, False),
 ('treninkovy-areal-3d', 'olesko_V1.mp4', .69, False), ('akcni-film', 'skalice_UHD.mp4', .19, False),
 ('kavarna-snidane', 'snidane.mp4', .19, True), ('praha-stodulky', 'stodulky_final.mp4', .56, False),
 ('trebusin-chata', 'trebusin_finale1.mp4', .44, False),
]
only = set(sys.argv[4:])
meta = {}
for pid, f, pos, vert in JOBS:
    if only and pid not in only: continue
    src = os.path.join(SRC, f)
    dur = float(subprocess.check_output([FP,'-v','error','-show_entries','format=duration','-of','csv=p=0', src]).decode())
    seg = 1.8 if vert else 2.0
    starts = [dur*p for p in ([.10,.30,.50,.68,.84] if vert else [.14,.30,.46,.62,.78])]
    # detect black letterbox bars (e.g. 2.39:1 film) and crop them away before scaling
    cd = subprocess.run([FF,'-v','info','-ss',f'{dur*.4:.2f}','-t','4','-i',src,'-vf','cropdetect=24:2:0','-f','null','-'], capture_output=True, text=True).stderr
    crops = [l.split('crop=')[1].split()[0] for l in cd.splitlines() if 'crop=' in l]
    crop = ''
    if crops:
        cw, ch, cx, cy = map(int, crops[-1].split(':'))
        W0, H0 = map(int, subprocess.check_output([FP,'-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','csv=p=0:s=x', src]).decode().strip().split('x'))
        if ch < H0 * .94 or cw < W0 * .94: crop = f'crop={cw}:{ch}:{cx}:{cy},'
    scale ='scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280' if vert else 'scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720'
    args = [FF, '-v', 'error', '-y']
    for s in starts: args += ['-ss', f'{s:.2f}', '-t', f'{seg}', '-i', src]
    fc = ''.join(f'[{i}:v]{crop}{scale},fps=25,setsar=1,format=yuv420p[v{i}];' for i in range(len(starts)))
    fc += ''.join(f'[v{i}]' for i in range(len(starts))) + f'concat=n={len(starts)}:v=1:a=0[out]'
    mp4 = os.path.join(OUT, pid + '.mp4')
    args += ['-filter_complex', fc, '-map', '[out]', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-profile:v', 'high', '-movflags', '+faststart', mp4]
    subprocess.run(args, check=True)
    poster = os.path.join(OUT, pid + '.jpg')
    subprocess.run([FF,'-v','error','-y','-ss',f'{dur*pos:.2f}','-i',src,'-frames:v','1','-vf',crop+('scale=900:1600:force_original_aspect_ratio=increase,crop=900:1600' if vert else 'scale=1600:900:force_original_aspect_ratio=increase,crop=1600:900'),'-q:v','3',poster], check=True)
    meta[pid] = {'crop': crop, 'file': f, 'duration': round(dur), 'vertical': vert, 'mb': round(os.path.getsize(mp4)/1e6, 2)}
    print(pid, meta[pid], flush=True)
print(json.dumps(meta))
