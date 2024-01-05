import html_to_json
import json

f=open("Colory Room Escape.html",'r',encoding='UTF-8')
src = f.read()

output = html_to_json.convert(src)
compactJson = {}
for loc in output['html'][0]['body'][0]['div'][0]['div'][0]['div'][0]['section'][0]['div'][2]['div']:
    locName = loc['h5'][0]['_value']
    compactJson[locName] = {}
    print(locName)
    for tr in loc['table'][0]['tbody'][0]['tr']:
        if len(tr)==0:
            continue
        content = tr['td']
        if len(content)==5:
            storeName = content[0]['_value']
            compactJson[locName][storeName]={}
            compactJson[locName][storeName][content[1]['_value']]={
                '별점':content[2]['_value'],
                '난이도':content[3]['_value'],
                '리뷰수':content[4]['_value']
            }
            print(storeName)
        else:
            compactJson[locName][storeName][content[0]['_value']]={
                '별점':content[1]['_value'],
                '난이도':content[2]['_value'],
                '리뷰수':content[3]['_value']
            }
            pass
f=open("colory.json",'w',encoding="UTF-8")
f.write(json.dumps(compactJson,ensure_ascii=False,indent="\t"))
