# Headless-Chromium render probe: serve the repo root (python3 -m http.server 8765 --bind 127.0.0.1) then
# python3 tests/engine_probe/render_probe.py weare,bedford assessment,neighborhood,quality,ratio,history
# Prints path count, console errors, fill histogram, note, legend and a sample popup per town x mode.
import html, json, re, subprocess, sys
def probe(town, mode, budget=30000):
    url=f'http://127.0.0.1:8765/tests/engine_probe/engine-check.html?town={town}&mode={mode}'
    dom=subprocess.run(['chromium','--headless','--no-sandbox','--disable-gpu','--hide-scrollbars','--window-size=1280,900',f'--virtual-time-budget={budget}','--dump-dom',url],capture_output=True,text=True,timeout=400).stdout
    m=re.search(r'<div id="probe"([^>]*)></div>',dom)
    if not m or 'data-done' not in m.group(1):
        print(f'{town}/{mode}: NOT READY (dom {len(dom)} bytes) {"FAILED TEXT" if "Map failed" in dom else ""}'); return None
    a={k:html.unescape(v) for k,v in re.findall(r'data-([a-z]+)="([^"]*)"',m.group(1))}
    errs=json.loads(a['errors']); fills=json.loads(a['fills'])
    print(f'{town}/{mode}: paths={a["paths"]} consoleErrors={len(errs)} {errs[:3] if errs else ""} fail={a["failtext"]}')
    print(f'   fills: {dict(sorted(fills.items(), key=lambda kv:-kv[1]))}')
    print(f'   note: {a["note"]}'); print(f'   legend: {a["legend"][:260]}'); print(f'   popup: {a["popup"][:700]}')
    return a
if __name__=='__main__':
    towns=sys.argv[1].split(',') if len(sys.argv)>1 else ['weare']
    modes=sys.argv[2].split(',') if len(sys.argv)>2 else ['assessment','neighborhood','quality','ratio','history']
    for t in towns:
        for m in modes: probe(t,m); print()
