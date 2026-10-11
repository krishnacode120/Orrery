"""Conservative local pre-publish scan; prints locations/types, never matched values."""
import re
import subprocess
from pathlib import Path
patterns={
 'private-key':re.compile(r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
 'github-token':re.compile(r'\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{50,})\b'),
 'aws-access-key':re.compile(r'\bAKIA[A-Z0-9]{16}\b'),
 'service-token':re.compile(r'\b(?:sk-proj-|sk_live_|rk_live_)[A-Za-z0-9_-]{20,}\b'),
}
names=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z']).decode().split('\0')
findings=[]
for name in filter(None,names):
 p=Path(name)
 if p.name=='.env' or p.suffix in ('.sqlite3','.pem','.key'):
  findings.append((name,'sensitive-file'))
 if p.suffix not in ('.js','.jsx','.mjs','.py','.json','.md','.yml','.yaml','.txt','.html','.env') or not p.is_file():continue
 text=p.read_text(encoding='utf-8',errors='replace')
 for kind,pattern in patterns.items():
  if pattern.search(text):findings.append((name,kind))
history=subprocess.check_output(['git','log','--all','-p','--format=','--','.',':(exclude)package-lock.json'],stderr=subprocess.DEVNULL).decode(errors='replace')
for kind,pattern in patterns.items():
 if pattern.search(history):findings.append(('Git history',kind))
for name,kind in findings:print(kind+': '+name)
print('Secret-pattern scan: '+str(len(findings))+' findings. This is not a guarantee that no secret exists.')
raise SystemExit(1 if findings else 0)
