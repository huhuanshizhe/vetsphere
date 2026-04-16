import json

with open('C:/Users/admin/AppData/Local/Temp/vercel_envs.json', 'r') as f:
    data = json.load(f)

envs = [e for e in data.get('envs', []) if e.get('key', '').startswith('OSS')]
for e in envs:
    print('  ' + e['key'] + ' (target: ' + str(e['target']) + ', type: ' + e['type'] + ')')
print('Total OSS vars: ' + str(len(envs)))
