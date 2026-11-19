#!/usr/bin/env python3
"""Original showreel music, synthesized from scratch (no samples). 125 BPM, A minor, 88 beats + tail."""
import numpy as np, wave, sys
SR = 44100; BPM = 125; B = 60/BPM; NB = 88; TAIL = 2.2
N = int((NB*B + TAIL)*SR)
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(7)
def at(beat): return int(round(beat*B*SR))
def mtof(m): return 440*2**((m-69)/12)
def env_ad(n, a, d): # attack/decay in seconds, exponential decay
    t = np.arange(n)/SR; e = np.minimum(1, t/max(a,1e-4)); return e*np.exp(-t/d)
def add(buf, x, pos, g=1.0):
    if pos >= N: return
    x = x[:N-pos]; buf[pos:pos+len(x)] += g*x
def addst(x, pos, g=1.0, pan=0.0):
    add(L, x, pos, g*np.sqrt((1-pan)/2)*1.414); add(R, x, pos, g*np.sqrt((1+pan)/2)*1.414)
def fftfilt(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1/SR); H = np.ones_like(f)
    if lo: H *= 1/np.sqrt(1+(lo/np.maximum(f,1))**4)
    if hi: H *= 1/np.sqrt(1+(f/hi)**4)
    return np.fft.irfft(X*H, len(x))
def saw(freq, n, harm=None):
    t = np.arange(n)/SR; out = np.zeros(n); k = 1
    while k*freq < (harm or 9000):
        out += np.sin(2*np.pi*k*freq*t + rng.uniform(0,.2))/k; k += 1
    return out*.6
# ---------- instruments
def kick():
    n = int(.45*SR); t = np.arange(n)/SR
    f = 45 + 95*np.exp(-t/0.045); ph = 2*np.pi*np.cumsum(f)/SR
    x = np.sin(ph)*np.exp(-t/0.22); x[:200] += rng.normal(0,.5,200)*np.linspace(1,0,200)
    return np.tanh(1.6*x)
def clap():
    n = int(.35*SR); x = rng.normal(0,1,n)
    e = np.zeros(n)
    for o in (0, .011, .022): i=int(o*SR); e[i:] += np.exp(-np.arange(n-i)/SR/0.012)
    e += .5*np.exp(-np.arange(n)/SR/0.12)
    return fftfilt(x*e, lo=900, hi=7000)*1.4
def hat(open_=False):
    n = int((.32 if open_ else .06)*SR); x = rng.normal(0,1,n)
    return fftfilt(x, lo=7500)*np.exp(-np.arange(n)/SR/(0.11 if open_ else 0.018))
def crash():
    n = int(2.2*SR); x = rng.normal(0,1,n)
    return fftfilt(x, lo=4000)*np.exp(-np.arange(n)/SR/0.7)*.6
def boom(): # cinematic impact
    n = int(3.5*SR); t = np.arange(n)/SR
    f = 32 + 40*np.exp(-t/0.12); x = np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t/1.1)
    nz = fftfilt(rng.normal(0,1,n), hi=1800)*np.exp(-t/0.5)*.35
    return np.tanh(1.3*(x+nz))
def riser(beats):
    n = int(beats*B*SR); t = np.linspace(0,1,n); x = rng.normal(0,1,n); out = np.zeros(n)
    seg = 4096
    for i in range(0, n, seg):
        c = 300 + 9000*t[min(i,n-1)]**2
        out[i:i+seg] = fftfilt(x[i:i+seg], lo=c*.4, hi=c)
    tone = np.sin(2*np.pi*np.cumsum(220+660*t**2)/SR)*.15
    return (out*.9+tone)*t**2.2
def pluck(m, dur):
    n = int(dur*SR); x = saw(mtof(m), n, 6000)
    x = fftfilt(x, hi=3200)*env_ad(n, .002, .16)
    return x
def pad(notes, dur):
    n = int(dur*SR); x = np.zeros(n)
    for m in notes:
        for det in (-.12, -.05, .05, .12):
            x += saw(mtof(m)*2**(det/12), n, 4000)
    x = fftfilt(x, hi=1400)/ (len(notes)*4)
    t = np.arange(n)/SR; e = np.minimum(1, t/.5)*np.minimum(1, (dur-t)/.4).clip(0)
    return x*e
def bassnote(m, dur):
    n = int(dur*SR); x = saw(mtof(m), n, 1200) + .6*np.sin(2*np.pi*mtof(m)*np.arange(n)/SR)
    return fftfilt(x, hi=500)*env_ad(n, .004, .25)
# ---------- arrangement (bars of 4 beats)
CH = [(57,60,64),(53,57,60),(48,52,55),(55,59,62)]   # Am F C G
ROOT = [45,41,36,43]
K, C, H, HO, CR = kick(), clap(), hat(), hat(True), crash()
def section(b): # which part a beat belongs to
    if b < 8: return 'intro'
    if b < 36: return 'A'
    if b < 52: return 'break'
    if b < 80: return 'B'
    return 'end'
side = np.ones(N)   # sidechain envelope from the kick
for b in range(NB):
    sec = section(b); bar = b//4; ch = CH[bar % 4]
    p = at(b)
    if sec in ('A','B'):
        addst(K, p, .95)
        d = np.ones(int(.4*SR)); d[:] = 1 - .6*np.exp(-np.arange(len(d))/SR/.09); side[p:p+len(d)] = np.minimum(side[p:p+len(d)], d[:N-p])
        if b % 2 == 1: addst(C, p, .55)
        addst(HO, at(b+.5), .22, .3)
        for s in (0,.25,.75): addst(H, at(b+s), .13 if s else .09, -.3)
    if sec == 'break':
        if b % 4 == 2: addst(C, p, .45)          # half-time clap
        for s in (0,.5): addst(H, at(b+s), .08, -.2)
    if sec == 'intro' and b >= 4:
        for s in (0,.25,.5,.75): addst(H, at(b+s), .05*(b-3)/4, -.2)
# bass: 8ths on the root, ducked by the kick
for b in range(8, 80):
    if section(b) == 'break' and b < 48: continue
    root = ROOT[(b//4) % 4]
    for s in (0, .5):
        m = root + (12 if (s and b % 2) else 0)
        x = bassnote(m, B*.5); add(L, x, at(b+s), .34); add(R, x, at(b+s), .34)
# pads: one chord per bar for the whole piece
for bar in range(NB//4):
    ch = CH[bar % 4]; g = .55 if section(bar*4) in ('intro','break','end') else .32
    x = pad([n+12 for n in ch] + [ch[0]], 4*B + .5)
    if bar == NB//4 - 1: x = pad([57+12,60+12,64+12,45], 4*B + TAIL)   # final A minor, held
    addst(x, at(bar*4), g, -.25); addst(np.roll(x, 400), at(bar*4), g, .25)
# arpeggio: 16ths through the chord, with a stereo echo
pat = [0,1,2,1, 2,0,1,2, 0,2,1,0, 1,2,0,2]
for b in range(8, 80):
    ch = CH[(b//4) % 4]
    for i in range(4):
        st = b + i/4; idx = pat[(b*4+i) % 16]; m = ch[idx] + 24
        g = .16 if section(b) != 'break' else .2
        x = pluck(m, .35)
        addst(x, at(st), g, -.35); addst(x, at(st+.75), g*.45, .5); addst(x, at(st+1.5), g*.2, -.5)
# lead melody in the second drop
mel = [(52,69,2),(54,72,1),(55,71,1),(56,67,2),(58,69,2),(60,72,1),(61,74,1),(62,72,2),
       (64,76,2),(66,74,1),(67,72,1),(68,71,2),(70,72,2),(72,74,1),(73,76,1),(74,79,2),(76,76,4)]
for b, m, d in mel:
    n = int(d*B*SR); x = (saw(mtof(m), n, 7000)*.5 + saw(mtof(m)*1.003, n, 7000)*.5)
    x = fftfilt(x, hi=4200)*env_ad(n, .01, .9)*np.minimum(1,(d*B - np.arange(n)/SR)/.05).clip(0)
    addst(x, at(b), .11, .15); addst(x, at(b+.75), .05, -.5)
# fx: risers into the drops, impacts and crashes
addst(riser(8), 0, .35)
addst(riser(4), at(48), .45)
addst(boom(), at(0), .7); addst(boom(), at(8), .6); addst(boom(), at(52), .6); addst(boom(), at(80), .9)
for b in (8, 36, 52, 80): addst(CR, at(b), .5)
# ---------- mix
L *= side; R *= side**.9
# simple room reverb on the whole mix (exponentially decaying noise impulse)
ir_n = int(1.6*SR); ir = rng.normal(0,1,ir_n)*np.exp(-np.arange(ir_n)/SR/0.45); ir[0] = 0
ir = fftfilt(ir, lo=250, hi=6000); ir /= np.abs(ir).sum()/6
def conv(x):
    n = len(x)+len(ir); F = 1<<(n-1).bit_length()
    return np.fft.irfft(np.fft.rfft(x,F)*np.fft.rfft(ir,F), F)[:len(x)]
L = L + .22*conv(L); R = R + .22*conv(R)
# master: fade in, gentle saturation, normalise to -1 dBFS, fade out on the tail
t = np.arange(N)/SR
fade = np.minimum(1, t/0.3) * np.clip((N/SR - t)/1.6, 0, 1)
L, R = np.tanh(.8*L*fade), np.tanh(.8*R*fade)
peak = max(np.abs(L).max(), np.abs(R).max()); L, R = L/peak*.89, R/peak*.89
out = (np.stack([L,R],1)*32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(out.tobytes())
print('ok', N/SR, 's')
