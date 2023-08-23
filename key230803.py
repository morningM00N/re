import math
import sys
import datetime
from tkinter.simpledialog import askstring

#2023-08-01 thema_code 이성훈 2069-8564 

reserveDate = None
reserveName = '이성훈'
reservePhone2 = '2211'
reservePhone3 = '4032'
reserveThemaCode = None
numOfTabs = 20
interval = 0.1

WEEKDAY = 0
FRIDAY = 1
SATURDAY = 2
SUNDAY = 3
timeTable = {}
timeTable['네드'] = {}
timeTable['네드'][WEEKDAY]={
"10:00":1470,
"11:30":1471,
"13:00":1472,
"14:30":1473,
"16:00":1474,
"17:30":1475,
"19:00":1782,
"20:30":1476,
"22:00":1477}

timeTable['네드'][FRIDAY]={
"10:00":1478,
"11:30":1479,
"13:00":1480,
"14:30":1481,
"16:00":1482,
"17:30":1483,
"19:00":1484,
"20:30":1485,
"22:00":1783}

timeTable['네드'][SATURDAY]={
    "10:00":1486,
"11:30":1487,
"13:00":1784,
"14:30":1488,
"16:00":1489,
"17:30":1490,
"19:00":1491,
"20:30":1492,
"22:00":1493,
}

timeTable['네드'][SUNDAY]={
    "10:00":1494,
"11:30":1495,
"13:00":1496,
"14:30":1497,
"16:00":1498,
"17:30":1499,
"19:00":1500,
"20:30":1785,
"22:00":1501,
}

timeTable['머머패'] = {}
timeTable['머머패'][WEEKDAY]={
    "09:30":1872,
"10:50":1873,
"12:10":1874,
"13:30":1875,
"14:50":1876,
"16:10":1877,
"17:30":1878,
"18:50":1879,
"20:10":1880,
"21:30":1881,
"22:50":1982,

}

timeTable['머머패'][FRIDAY]={
    "09:30":1882,
"10:50":1883,
"12:10":1884,
"13:30":1885,
"14:50":1887,
"16:10":1889,
"17:30":1891,
"18:50":1893,
"20:10":1895,
"21:30":1897,
"22:50":1979,
}

timeTable['머머패'][SATURDAY]={
    "09:30":1886,
"10:50":1888,
"12:10":1890,
"13:30":1892,
"14:50":1894,
"16:10":1896,
"17:30":1898,
"18:50":1899,
"20:10":1900,
"21:30":1901,
"22:50":1980,
}

timeTable['머머패'][SUNDAY]={
    "09:30":1902,
"10:50":1903,
"12:10":1904,
"13:30":1905,
"14:50":1906,
"16:10":1907,
"17:30":1908,
"18:50":1909,
"20:10":1910,
"21:30":1911,
"22:50":1981,
}

timeTable['워너고홈'] = {}
timeTable['워너고홈'][WEEKDAY]={
"10:00":1760,
"11:30":1733,
"13:00":1777,
"14:30":1734,
"16:00":1735,
"17:30":1778,
"19:00":1736,
"20:30":1737,
"22:00":1779}

timeTable['필바에'] = {}
timeTable['필바에'][WEEKDAY]=\
{"10:35":2001,
"12:10":2002,
"13:45":2003,
"15:20":2004,
"16:50":2005,
"18:20":2006,
"19:50":2007,
"21:25":2008}

timeTable['필바에'][FRIDAY]=\
{"10:00":1801,
"11:30":1802,
"13:00":1803,
"14:30":1804,
"16:00":1805,
"17:30":1806,
"19:00":1807,
"20:30":1808,
"22:00":1809}

timeTable['필바에'][SATURDAY]=\
{"10:35":1810,
"12:10":1811,
"13:45":1812,
"15:20":1813,
"16:50":1814,
"18:20":1815,
"19:50":1816,
"21:25":1817}

timeTable['필바에'][SUNDAY]=\
{"10:00":1819,
"11:30":1820,
"13:00":1821,
"14:30":1822,
"16:00":1823,
"17:30":1824,
"19:00":1825,
"20:30":1826,
"22:00":1827}

timeTable['필바밥'] = {}
timeTable['필바밥'][SATURDAY]=\
{"09:55":2000,
"11:25":1993,
"12:55":1994,
"14:30":1995,
"16:00":2031,
"17:30":2032,
"19:00":2033,
"20:30":2034,
"22:00":2035}


if len(sys.argv)>2:
    reserveDate = sys.argv[1]
    reserveThemaCode = sys.argv[2]
    if len(sys.argv)>3:
        reserveName=sys.argv[3]
    if len(sys.argv)>4:
        reservePhone2=sys.argv[4].split('-')[0]
        reservePhone3=sys.argv[4].split('-')[1]
    if len(sys.argv)>5:        
        numOfTabs = int(sys.argv[5])
else:
    inputString = askstring("정보","2023-08-01 네드|머머패|워너고홈|필바에|필바밥 홍길동 1234-5678 30(numOfTabs) 0.1(interval)")
    if inputString == None:
        sys.exit()
    inputWords = inputString.split(' ')
    reserveDate = inputWords[0]
    if (len(inputWords)>2):
        reserveName = inputWords[2]
    if (len(inputWords)>3):
        reservePhone2 = inputWords[3].split('-')[0]
        reservePhone3 = inputWords[3].split('-')[1]
    if (len(inputWords)>4):
        numOfTabs = int(inputWords[4])
    if (len(inputWords)>5):
        interval = float(inputWords[5])        
    td = datetime.datetime.fromisoformat(reserveDate)
    strTime = ""
    wd = None
    if td.weekday()<4:
        wd = WEEKDAY
    elif td.weekday()==4:
        wd = FRIDAY
    elif td.weekday()==5:
        wd = SATURDAY
    else:
        wd = SUNDAY
    for t in timeTable[inputWords[1]][wd]:
        strTime += (t + " ")
    inputTime = askstring("시간",strTime)
    reserveThemaCode = timeTable[inputWords[1]][wd][inputTime]
    print(reserveThemaCode)
     

from selenium.webdriver.chrome.options import Options
from selenium import webdriver
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import *
import time
import datetime
chrome_options = Options()
chrome_options.add_argument('--start-maximized')

nowDate = datetime.datetime.now()
thisWeekDay = nowDate.weekday()
pseudoDate = datetime.datetime.now()+datetime.timedelta(7-thisWeekDay+3)
stringPseudoDate= pseudoDate.strftime("%Y-%m-%d")
pseudoTimeCode = 558


driver = webdriver.Chrome( options=chrome_options)

driver.get("https://keyescape.co.kr/web/home.php?go=rev.make")
WebDriverWait(driver,10).until(EC.element_to_be_clickable((By.CLASS_NAME,'btnArea')))

while True:
    try:
        jsCmd = f"\
javascript:fun_zizum_select('7','7','');\
javascript:fun_days_select('{stringPseudoDate}','2');\
javascript:fun_theme_select('32','0');\
javascript:fun_theme_time_select('{pseudoTimeCode}','2');\
javascript:fun_submit();\
"

        driver.execute_script(jsCmd)
        time.sleep(0.1)
        al = driver.switch_to.alert
        al.accept()
        pseudoTimeCode+=1
    except:
        break

for i in range(numOfTabs):
    driver.execute_script('window.open("about:blank", "_blank");')

for t in driver.window_handles:
    driver.switch_to.window(t) 
    driver.get("https://keyescape.co.kr/web/home.php?go=rev.make")
    WebDriverWait(driver,10).until(EC.element_to_be_clickable((By.CLASS_NAME,'btnArea')))
    driver.execute_script(jsCmd)

captcha = askstring('captcha','captcha')
strWaitTime = askstring('time','wait time(h m s)')
times = strWaitTime.split(' ')
waitTime = 3600*int(times[0])+60*int(times[1])+int(times[2])

while True:
    rH = math.floor(waitTime/3600)
    rM = math.floor((waitTime%3600)/60)
    rS = waitTime%60
    print(f"wait {rH}H {rM}M {rS}S")
    if waitTime > 5:
        waitTime-=5
        time.sleep(5)
    else:
        time.sleep(waitTime)
        break
        
        
jsCmd = f"\
document.getElementsByName('person')[0].selectedIndex=1;\
document.getElementsByName('rev_days')[0].value='{reserveDate}';\
document.getElementsByName('theme_time_num')[0].value='{reserveThemaCode}';\
document.getElementsByName('name')[0].value='{reserveName}';\
document.getElementsByName('mobile2')[0].value='{reservePhone2}';\
document.getElementsByName('mobile3')[0].value='{reservePhone3}';\
document.getElementsByName('input_captcha')[0].value='{captcha}';\
document.getElementsByName('ck_agree')[0].checked=true;\
javascript:fun_submit()\
"


for t in driver.window_handles:
    driver.switch_to.window(t) 
    time.sleep(interval)
    try:
        driver.execute_script(jsCmd)
        time.sleep(interval)
        driver.switch_to.alert.accept()
    except Exception as e:
        print("\n\n\n\n\ninner loop")
        print(e)
        print("\n\n\n\n\n")
        try:
            driver.execute_script('javascript:fun_payment_mutong()')
            time.sleep(interval)
        except UnexpectedAlertPresentException as e:
            print("\n\n\n\n\nouter loop alert")
            print(e)
            print("\n\n\n\n\n")
            driver.switch_to.alert.accept()
        except Exception as e:
            print("\n\n\n\n\nouter loop")
            print(e)
            print("\n\n\n\n\n")
            pass


while True:
    print(f"{reserveName} {reservePhone2}-{reservePhone3}")
    print("press e to exit")
    t = input()
    if t=='e':
        break
