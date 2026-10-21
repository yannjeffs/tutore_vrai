import urllib.request, urllib.error
try:
    req = urllib.request.urlopen('http://127.0.0.1:8000/api/patients/?search=&page=1&gender=&blood_group=&created_date=')
    print(req.read().decode('utf-8')[:500])
except urllib.error.HTTPError as e:
    print(e.read().decode('utf-8'))
