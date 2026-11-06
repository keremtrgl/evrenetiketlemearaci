import argparse
import ast
import hashlib
import json
from pathlib import Path
import shutil
import onnx

parser = argparse.ArgumentParser()
parser.add_argument('model', type=Path)
parser.add_argument('destination', type=Path)
parser.add_argument('--name', required=True)
args = parser.parse_args()
if not args.name or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-_' for c in args.name):
    parser.error('Model adı küçük harf, rakam, tire veya alt çizgi içermeli')
model = onnx.load(str(args.model), load_external_data=False)
meta = {p.key: p.value for p in model.metadata_props}
if meta.get('task') != 'classify':
    raise ValueError('Yalnız sınıflandırma modeli desteklenir')
names = ast.literal_eval(meta['names'])
labels = [names[i] for i in range(len(names))]
if not all(isinstance(n, str) and n.strip() for n in labels):
    raise ValueError('Geçersiz sınıf listesi')
args.destination.mkdir(parents=True, exist_ok=True)
target = args.destination / (args.name + '.onnx')
shutil.copyfile(args.model, target)
(args.destination / (args.name + '.labels.json')).write_text(json.dumps(labels, ensure_ascii=False, indent=2), encoding='utf-8')
record = {'file': target.name, 'classes': len(labels), 'imgsz': ast.literal_eval(meta['imgsz']), 'task': meta['task'], 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'bytes': target.stat().st_size}
(args.destination / (args.name + '.info.json')).write_text(json.dumps(record, indent=2), encoding='utf-8')
print(json.dumps(record))
