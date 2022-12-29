function openTextFile() {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "text/plain"; // 확장자가 xxx, yyy 일때, ".xxx, .yyy"
    input.onchange = function(event) {
        processFile(event.target.files[0]);
    };
    input.click();
    fileReady = true
}


var rawText

function dateValidCheck() {
    let inputStartDate = document.getElementById("inputStartDate")
    let inputEndDate = document.getElementById("inputEndDate")
    if (inputEndDate.value == "" || inputStartDate.value == "") {
        return
    }

    let tempStartDate = Date.parse(inputStartDate.value)
    let tempEndDate = Date.parse(inputEndDate.value)
    if (tempEndDate - tempStartDate > 30 * 24 * 60 * 60 * 1000 || tempStartDate > tempEndDate) {
        dateReady = false
        alert("날짜를 확인해 주세요. (1달 이내만 가능)")
        event.srcElement.value = ""
        return
    }
    let startParse = inputStartDate.value.split('-')
    let endParse = inputEndDate.value.split('-')
    startDate = new Date(startParse[0], Number(startParse[1]) - 1, startParse[2])
    endDate = new Date(endParse[0], Number(endParse[1]) - 1, Number(endParse[2]) + 1)
    dateReady = true
}


function tempBtn() {
    // ---- for debug ----- //
    dateValidCheck()
    let rawFile = new XMLHttpRequest();

    rawFile.open("GET", "3040.txt", false);
    rawFile.setRequestHeader('Content-Type', 'text/html;charset=utf-8')
    rawFile.onreadystatechange = function() {
        if (rawFile.readyState === 4) {
            if (rawFile.status === 200 || rawFile.status == 0) {
                rawText = rawFile.responseText;
            }
        }
    }

    rawFile.send(null);


    analyze()


    drawHotTime(timeParticipateMap)
}
// --- for debug --- //

let fileReady = false
let dateReady = false


let countTotalTalksPerUser = {}
let mapUserToSeqContents = {} // mapUserToSeqContents[userName] : userName이 말한 모든 talks (시간 순서대로)

let freqNameThres = 20 // 이 threshold를 넘게 불려져야 사람 이름으로 인식
let timeGranularity = 10 // 몇분을 하나의 histogram으로 볼지




let sequenceText = []
let startDate
let endDate

let callingName = {} // 사람 이름들
let idf = {} // inverse document frequent

let inRangeTalks = {} // 연속된 대화가 1분안에 이루어졌으면 count

let timeParticipateMap = {}

let appellation = ['형', '형님', '님', '누나', '언니', '오빠']
let appellationAux = ['형', '형님', '님', '누나', '언니', '오빠', '아', '야']

let allFreqWords = {}
let userInfor = []

let sortAttribute = "numOfTalks"


function separateText(line) {
    let strPart1 = line.split(",")
    let date = null
    let userName = null
    let contents = null

    let strDates = strPart1[0].split(/년|월|일|:/)

    if (strDates.length != 5) {
        contents = line
    } else {
        if (strPart1.length == 1) {
            return null
        }
        let afternoon = false
        if (strDates[3].indexOf('오후') >= 0) {
            afternoon = true
        }
        strDates[3] = strDates[3].split(' ')[2]
        if (afternoon == true) {
            strDates[3] = Number(strDates[3]) + 12
            if (strDates[3] == 24) {
                strDates[3] = "12"
            }
        } else if (strDates[3] == "12") {
            strDates[3] = 0
        }
        date = new Date(strDates[0], strDates[1] - 1, strDates[2], strDates[3], strDates[4])
        let colonLoc = strPart1[1].indexOf(":")
        userName = strPart1[1].substr(1, colonLoc - 2)
        contents = strPart1[1].substr(colonLoc + 2)
        while (contents.indexOf('ㅋㅋㅋ') >= 0) {
            contents = contents.replace(/ㅋㅋㅋ+/, ' ㅋㅋ ')
        }
        while (contents.indexOf('ㅎㅎㅎ') >= 0) {
            contents = contents.replace(/ㅎㅎㅎ+/, ' ㅎㅎ ')
        }

        contents = contents.replace(/\.+/, ' ').replace(/  +/, ' ')
        if (contents.indexOf('ㅎㅎㅎ') != -1) {
            console.log(contents)
        }
    }

    return { date: date, name: userName, contents: contents }

}


function getTimeHistogramIdx(curTime) { // curTime이 time histogram에서 몇번째 idx인지 확인
    return Math.floor((curTime - startDate) / (60000 * timeGranularity))
}


function parseText() {

    console.log("parseText start")
    let refinedText = []

    let writeStart = false
    let lines = rawText.split(/\r\n/)
    for (let idx = 4; idx < lines.length; idx++) {
        parsedStr = (separateText(lines[idx]))
        if (parsedStr == null) continue;
        if (parsedStr.name != null) {
            if (parsedStr.date >= startDate) {
                writeStart = true
            }
            if (parsedStr.date > endDate) {
                break
            }
            if (writeStart == false) {
                continue
            }
            if (parsedStr.name == "") {
                continue
            }
            refinedText.push(parsedStr)
        } else if (writeStart == true) {
            refinedText[refinedText.length - 1].contents += "\n" + parsedStr.contents

        }
    }
    rawText = ""
    sequenceText.push({ name: refinedText[0].name, date: refinedText[0].date, contents: refinedText[0].contents })
    for (let idx = 1; idx < refinedText.length; idx++) {
        if (refinedText[idx].name == refinedText[idx - 1].name) {
            sequenceText[sequenceText.length - 1].contents += "\n" + refinedText[idx].contents
        } else {
            sequenceText.push({ name: refinedText[idx].name, date: refinedText[idx].date, contents: refinedText[idx].contents })
        }

    }

    refinedText.forEach(element => {
        if (countTotalTalksPerUser[element.name] == undefined) {
            countTotalTalksPerUser[element.name] = 0
        }
        countTotalTalksPerUser[element.name] += 1

    });



    let prevTime
    let prevUser

    sequenceText.forEach(element => {

        let idx = getTimeHistogramIdx(element.date)
        let mapEntry = timeParticipateMap[idx]
        if (mapEntry == undefined) {
            mapEntry = {}
            timeParticipateMap[idx] = mapEntry
        }
        mapEntry[element.name] = 0

        if (mapUserToSeqContents[element.name] == undefined) {
            mapUserToSeqContents[element.name] = []
        }
        if (element.date - prevTime <= 60000) {
            let map = inRangeTalks[element.name]
            if (map == undefined) {
                map = {}
                inRangeTalks[element.name] = map
            }
            if (map[prevUser] == undefined) {
                map[prevUser] = 0
            }
            map[prevUser] += 1
        }
        mapUserToSeqContents[element.name].push({ date: element.date, contents: element.contents })
        prevTime = element.date
        prevUser = element.name
    });

    let arrTimeParticipateMap = []
    for (let key in timeParticipateMap) {
        arrTimeParticipateMap.push({
            startTime: (new Date(startDate.getTime() + key * 60000 * timeGranularity)),
            endTime: (new Date(startDate.getTime() + (Number(key) + 1) * 60000 * timeGranularity)),
            count: Object.keys(timeParticipateMap[key]).length,
            member: timeParticipateMap[key]
        })
    }

    arrTimeParticipateMap.sort((a, b) => {
        if (a.count > b.count) {
            return -1
        }
        return 1
    })
    timeParticipateMap = undefined
    timeParticipateMap = arrTimeParticipateMap

    for (let name in mapUserToSeqContents) {

        let infor = mapUserToSeqContents[name]
        let userIdf = {}
        infor.forEach(el => {
            let words = el.contents.split(/ |\n|\r|\~|\!|\?|\.|:|;|\/|\(|\)/)
            if (words != undefined) {
                words.forEach(e2 => {
                    if (e2.length == 0) {
                        return
                    }
                    if (userIdf[e2] == undefined) {
                        userIdf[e2] = 0
                        if (idf[e2] == undefined) {
                            idf[e2] = 1
                        } else {
                            idf[e2] += 1
                        }
                    }
                    for (let idx in appellation) {
                        let callingWord = appellation[idx]
                        if (e2.length >= callingWord.length + 1 && e2.indexOf(callingWord) == e2.length - 1 - (callingWord.length - 1)) {
                            let tempName = e2.substr(0, e2.indexOf(callingWord))
                            if (tempName.length != 0 && tempName != "아") {
                                if (callingName[tempName] == undefined) {
                                    callingName[tempName] = 1
                                } else {
                                    callingName[tempName] += 1
                                }
                                break
                            }

                        }
                    }

                });
            }
        });
    }

    let freCallingName = {}
    for (let name in callingName) {
        if (callingName[name] > freqNameThres) {
            freCallingName[name] = callingName[name]
        }
    }

    callingName = null
    callingName = freCallingName

    for (let name in mapUserToSeqContents) {

        let sname = name.split('/')[0]

        if (sname.length != 0) {
            if (callingName[sname] == undefined) {
                callingName[sname] = 1
            } else {
                callingName[sname] += 1
            }
        }
    }

    console.log("parseText end")
}

function getAbs(a) {
    let f = 0.0
    for (let key in a) {
        f += (a[key] * a[key])
    }
    return Math.sqrt(f)
}

function getCosine(a, b) {
    let absA = getAbs(a)
    let absB = getAbs(b)
    let f = 0.0
    for (let key in a) {
        if (b[key] != undefined) {
            f += (a[key] * b[key])
        }
    }
    return f / absA / absB
}



function getInformationForAUser(userName) {
    let numOfTalks = countTotalTalksPerUser[userName]
    let numOfSeqTalks = mapUserToSeqContents[userName].length
    let freqWords = {}
    let callingFreq = {}
    let timeHistogram = {}
    let weekAndHourHist = {}
    let length = 0.0


    mapUserToSeqContents[userName].forEach(e => {

        length += e.contents.length
        let delta = Math.floor((e.date - startDate) / (60000 * timeGranularity))
        if (timeHistogram[delta] == undefined) {
            timeHistogram[delta] = 1
        } else {
            timeHistogram[delta] += 1
        }
        let weekDay = e.date.getDay()
        let getHour = e.date.getHours()
        if (weekAndHourHist[weekDay * 24 + getHour] == undefined) {
            weekAndHourHist[weekDay * 24 + getHour] = 0
        }

        weekAndHourHist[weekDay * 24 + getHour] += 1

        let words = e.contents.split(/ |\n|\r|\~|\!|\?|\.|:|;|\/|\(|\)/)
        if (words != undefined) {
            words.forEach(e2 => {

                if (e2.length == 0) {
                    return
                }
                if (freqWords[e2] == undefined) {
                    freqWords[e2] = 1
                } else {
                    freqWords[e2] += 1
                }

                for (let idx in appellationAux) {
                    let callWord = appellationAux[idx]
                    if (e2.indexOf(callWord) >= 0) {
                        for (let cName in callingName) {
                            if (e2.indexOf(cName) >= 0 && e2.indexOf(cName) + cName.length == e2.indexOf(callWord)) {
                                if (callingFreq[cName] == undefined) {
                                    callingFreq[cName] = 0
                                }
                                callingFreq[cName] += 1
                                break
                            }
                        }
                    }
                }

            });
        }
    });

    let arrCallingFreq = []
    for (let n in callingFreq) {
        arrCallingFreq.push({ name: n, count: callingFreq[n] })
    }
    arrCallingFreq.sort((a, b) => {
        if (a.count > b.count) {
            return -1
        }
        return 1
    })

    let freqWordsArr = []
    let freqTfIdfArr = []
    for (let w in freqWords) {
        if (allFreqWords[w] == undefined) {
            allFreqWords[w] = 0
        }
        allFreqWords[w] += freqWords[w]
        if (freqWords[w] < 10) {
            continue
        }
        freqWordsArr.push({ word: w, count: freqWords[w] })
        freqTfIdfArr.push({ word: w, count: freqWords[w] / idf[w] })
    }
    freqWordsArr.sort((a, b) => {
        if (a.count > b.count) {
            return -1
        }
        return 1
    })
    freqTfIdfArr.sort((a, b) => {
        if (a.count > b.count) {
            return -1
        }
        return 1
    })
    let arrInRangeTalks = []
    for (let tempName in inRangeTalks[userName]) {
        arrInRangeTalks.push({ name: tempName, count: inRangeTalks[userName][tempName] })
    }
    arrInRangeTalks.sort((a, b) => {
        if (a.count > b.count) {
            return -1
        }
        return 1;
    })
    inRangeTalks[userName] = {}
    return {
        numOfTalks: numOfTalks,
        numOfSeqTalks: numOfSeqTalks,
        freqWords: freqWordsArr,
        freqTfIdf: freqTfIdfArr,
        callingFreq: arrCallingFreq,
        timeHistogram: timeHistogram,
        totalChar: length,
        weekAndHourHist: weekAndHourHist,
        inRangeTalks: arrInRangeTalks,
        aveLength: length / numOfTalks,
        mapSimilarity: []
    }
}


function sortTuple(a, b) {
    if (a.content[sortAttribute] > b.content[sortAttribute]) {
        return -1
    }
    return 1
}

function drawHotTime(timeParticipateMap) {
    let tblHotTime = document.getElementById('tblHotTime')
    while (tblHotTime.childElementCount > 1) {
        tblHotTime.removeChild(tblHotTime.children[1])
    }
    let idx = 0
    let prevCount = userInfor.length + 1
    while (true) {
        let curCount = timeParticipateMap[idx].count
        if (idx > 10 && curCount != prevCount) {
            break
        }
        prevCount = curCount
        let tr = document.createElement('tr')
        tblHotTime.appendChild(tr)
        let startTimeTemp = timeParticipateMap[idx].startTime
        let td1 = document.createElement('td')
        td1.innerHTML = startTimeTemp.toLocaleDateString().replace(' ', '').replace(' ', '') + " " + startTimeTemp.toTimeString().substr(0, 5) + " ~ " +
            timeParticipateMap[idx].endTime.toTimeString().substr(0, 5)
        tr.appendChild(td1)
        let td2 = document.createElement('td')
        tr.appendChild(td2)
        td2.innerHTML = timeParticipateMap[idx].count


        let td3 = document.createElement('td')
        tr.appendChild(td3)
        for (let name in timeParticipateMap[idx].member) {
            td3.innerHTML += ("<span>" + name.substr(0, name.indexOf('/')) + "&nbsp</span>")
        }

        idx++
    }
}



function drawWeekStatistics(allWeekAndHourHist, participateWeekAndHourHist) {


    let xLabel = []
    let weekDays = ['일', '월', '화', '수', '목', '금', '토']
    arrDataset = []
    let dataset2 = []
    for (let idx = 0; idx < 7; idx++) {
        for (let idx2 = 0; idx2 < 24; idx2++) {
            xLabel.push(weekDays[idx] + " " + idx2 + "시")
        }
    }
    for (let idx = 0; idx < 24 * 7; idx++) {
        if (allWeekAndHourHist[idx] == undefined) arrDataset.push(0)
        else arrDataset.push(allWeekAndHourHist[idx])

        if (participateWeekAndHourHist[idx] == undefined) dataset2.push(0)
        else dataset2.push(participateWeekAndHourHist[idx])
    }


    let context = document.getElementById('chartWeekStatistics')
        .getContext('2d');
    let myChart = new Chart(context, {
        type: 'bar', // 차트의 형태
        data: {
            labels: xLabel,
            datasets: [{
                    label: '사람수',
                    data: dataset2,
                    borderWidth: 1,
                    yAxisID: 'y2'
                },
                {
                    label: '대화수',
                    data: arrDataset,
                    type: 'line',
                    borderWidth: 2,
                    yAxisID: 'y'
                }
            ]
        },
        options: {
            scales: {
                y: {
                    position: 'right',
                    beginAtZero: true
                },
                y2: {
                    position: 'left',
                    beginAtZero: true,
                    max: userInfor.length * 1.5
                }
            },
            responsive: true,
            plugins: {}
        }

    });

}


function callNameChart(arrCallingArrSum) {


    let xLabel = []
    let arrDataset = []
    let sum = 0
    for (let idx = 0; idx < arrCallingArrSum.length; ++idx) {
        sum += (arrCallingArrSum[idx].count)
    }
    let curSum = 0
    for (let idx = 0; idx < 10 || (sum * 8 / 10 > curSum && idx < arrCallingArrSum.length); ++idx) {
        xLabel.push(arrCallingArrSum[idx].name)
        arrDataset.push(arrCallingArrSum[idx].count)
        curSum += arrCallingArrSum[idx].count
    }
    xLabel.push('나머지')
    arrDataset.push(sum - curSum)


    let context = document.getElementById('callNameChart')
        .getContext('2d');
    let myChart = new Chart(context, {
        type: 'pie', // 차트의 형태
        data: {
            labels: xLabel,
            datasets: [{
                label: '횟수',
                data: arrDataset,
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
            }
        }

    });

}

function drawSelectedUserSim() {
    let name1 = document.getElementById('simUser1').value
    let name2 = document.getElementById('simUser2').value
    drawWeekSimUser(name1, name2, userInfor)
}

function drawWeekSimUser(name1, name2, userInfor) {
    let divUp = document.getElementById('divForUser')
    while (divUp.childElementCount >= 5) {
        divUp.removeChild(divUp.children[4])
    }
    let canvas = document.createElement('canvas')
    divUp.appendChild(canvas)

    let xLabel = []
    let weekDays = ['일', '월', '화', '수', '목', '금', '토']
    let dataset = []
    let dataset2 = []
    for (let idx = 0; idx < 7; idx++) {
        for (let idx2 = 0; idx2 < 24; idx2++) {
            xLabel.push(weekDays[idx] + " " + idx2 + "시")
        }
    }

    let histo1 = undefined
    let histo2 = undefined
    for (let idx = 0; idx < userInfor.length; idx++) {
        if (userInfor[idx].name == name1) {
            histo1 = userInfor[idx].content.weekAndHourHist
        }
        if (userInfor[idx].name == name2) {
            histo2 = userInfor[idx].content.weekAndHourHist
        }
    }
    for (let idx = 0; idx < 24 * 7; idx++) {
        if (histo1[idx] == undefined) dataset.push(0)
        else dataset.push(histo1[idx])

        if (histo2[idx] == undefined) dataset2.push(0)
        else dataset2.push(histo2[idx])
    }

    let context = canvas.getContext('2d');
    let simVal = getCosine(histo1, histo2)
    let myChart = new Chart(context, {
        type: 'line', // 차트의 형태
        data: {
            labels: xLabel,
            datasets: [{
                    label: name1,
                    data: dataset,
                    borderWidth: 1
                },
                {
                    label: name2,
                    data: dataset2,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: name1 + "/ " + name2 + ' 대화 패턴 유사도: ' + Math.round(simVal * 1000) / 1000
                }
            }

        }

    });


}

function drawWeekSim(similarityForAllWeek, rank, userInfor) {

    rank--
    let xLabel = []
    let weekDays = ['일', '월', '화', '수', '목', '금', '토']
    let dataset = []
    let dataset2 = []
    for (let idx = 0; idx < 7; idx++) {
        for (let idx2 = 0; idx2 < 24; idx2++) {
            xLabel.push(weekDays[idx] + " " + idx2 + "시")
        }
    }

    let name1 = similarityForAllWeek[rank].pair[0]
    let name2 = similarityForAllWeek[rank].pair[1]

    let histo1 = undefined
    let histo2 = undefined
    for (let idx = 0; idx < userInfor.length; idx++) {
        if (userInfor[idx].name == name1) {
            histo1 = userInfor[idx].content.weekAndHourHist
        }
        if (userInfor[idx].name == name2) {
            histo2 = userInfor[idx].content.weekAndHourHist
        }
    }
    for (let idx = 0; idx < 24 * 7; idx++) {
        if (histo1[idx] == undefined) dataset.push(0)
        else dataset.push(histo1[idx])

        if (histo2[idx] == undefined) dataset2.push(0)
        else dataset2.push(histo2[idx])
    }


    let context = document.getElementById('sim' + rank)
        .getContext('2d');
    let myChart = new Chart(context, {
        type: 'line', // 차트의 형태
        data: {
            labels: xLabel,
            datasets: [{
                    label: name1,
                    data: dataset,
                    borderWidth: 1
                },
                {
                    label: name2,
                    data: dataset2,
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: '대화 패턴 유사도 ' + (rank + 1) + "위: " + Math.round(similarityForAllWeek[rank].similarity * 1000) / 1000
                }
            }

        }

    });

}


function drawRankingTbl(sortTupleName) {
    sortAttribute = sortTupleName
    let tbl = document.getElementById('tblSummary')

    while (tbl.childElementCount > 1) {
        tbl.removeChild(tbl.children[1])
    }

    userInfor.sort(sortTuple)
    for (let idx = 0; idx < userInfor.length; idx++) {
        let tr = document.createElement('tr')
        tbl.appendChild(tr)

        {
            let td = document.createElement('td')
            td.innerHTML = idx + 1
            tr.appendChild(td)
        }


        {
            let td = document.createElement('td')
            td.innerHTML = userInfor[idx].name
            tr.appendChild(td)
        }


        {
            let td = document.createElement('td')
            td.innerHTML = userInfor[idx].content.numOfTalks
            tr.appendChild(td)
        }


        {
            let td = document.createElement('td')
            td.innerHTML = userInfor[idx].content.numOfSeqTalks
            tr.appendChild(td)
        }

        {
            let td = document.createElement('td')
            td.innerHTML = Math.round(1000 * userInfor[idx].content.aveLength) / 1000
            tr.appendChild(td)
        }

        {
            let td = document.createElement('td')
            td.innerHTML = userInfor[idx].content.totalChar
            tr.appendChild(td)
        }

        {
            let td = document.createElement('td')
            for (let idx2 = 0; idx2 < 10 && idx2 < userInfor[idx].content.freqWords.length; idx2++) {
                td.innerHTML += userInfor[idx].content.freqWords[idx2].word + " (" + userInfor[idx].content.freqWords[idx2].count + ")<br>"
            }
            tr.appendChild(td)
        }

        {
            let td = document.createElement('td')
            for (let idx2 = 0; idx2 < 10 && idx2 < userInfor[idx].content.freqTfIdf.length; idx2++) {
                td.innerHTML += userInfor[idx].content.freqTfIdf[idx2].word + " (" + Math.round(userInfor[idx].content.freqTfIdf[idx2].count) + ")<br>"
            }
            tr.appendChild(td)
        }

        {
            let td = document.createElement('td')
            for (let idx2 = 0; idx2 < 10 && idx2 < userInfor[idx].content.callingFreq.length; idx2++) {
                td.innerHTML += userInfor[idx].content.callingFreq[idx2].name + " (" + Math.round(userInfor[idx].content.callingFreq[idx2].count) + ")<br>"
            }
            tr.appendChild(td)
        }

        {
            let td = document.createElement('td')
            for (let idx2 = 0; idx2 < 10 && idx2 < userInfor[idx].content.inRangeTalks.length; idx2++) {
                td.innerHTML += userInfor[idx].content.inRangeTalks[idx2].name.substr(0, userInfor[idx].content.inRangeTalks[idx2].name.indexOf('/')) + " (" + Math.round(userInfor[idx].content.inRangeTalks[idx2].count) + ")<br>"
            }
            tr.appendChild(td)
        }
        userInfor[idx].content.mapSimilarity.sort((a, b) => {
            if (a.sim > b.sim) { return -1 }
            return 1
        })

        {
            let td = document.createElement('td')
            for (let idx2 = 0; idx2 < 10 && idx2 < userInfor[idx].content.mapSimilarity.length; idx2++) {
                td.innerHTML += userInfor[idx].content.mapSimilarity[idx2].name.substr(0, userInfor[idx].content.mapSimilarity[idx2].name.indexOf('/')) + " (" +
                    Math.round(1000 * userInfor[idx].content.mapSimilarity[idx2].sim) / 1000 + ")<br>"
            }
            tr.appendChild(td)
        }

    }
}

function analyze() {
    if (dateReady == false) {
        alert("날짜를 설정해주세요.")
        return
    }
    if (fileReady == false) {
        alert("파일을 설정해주세요.")
        return
    }
    console.log("analyze() start")
    timeHistogramLength = (endDate - startDate) / (60000 * timeGranularity)
    parseText()


    let allWeekAndHourHist = {} // 모든 사람이 얼마나 말했는지
    let participateWeekAndHourHist = {}

    for (let name in mapUserToSeqContents) {
        let temp = getInformationForAUser(name)
        userInfor.push({ name: name, content: temp })

        for (let idx in temp.weekAndHourHist) {
            if (allWeekAndHourHist[idx] == undefined) {
                allWeekAndHourHist[idx] = 0
            }
            allWeekAndHourHist[idx] += temp.weekAndHourHist[idx]

            if (participateWeekAndHourHist[idx] == undefined) {
                participateWeekAndHourHist[idx] = 0
            }
            participateWeekAndHourHist[idx] += 1
        }
    }

    userInfor.sort(sortTuple)
    let callingAllSum = {}
    for (let idx = 0; idx < userInfor.length; idx++) {
        for (let idx2 in userInfor[idx].content.callingFreq) {
            let name = userInfor[idx].content.callingFreq[idx2].name
            if (callingAllSum[name] == undefined) {
                callingAllSum[name] = 0
            }
            callingAllSum[name] += userInfor[idx].content.callingFreq[idx2].count
        }

    }

    let arrCallingArrSum = [] // 모든 사람이 부른 횟수
    for (let key in callingAllSum) {
        arrCallingArrSum.push({ name: key, count: callingAllSum[key] })
    }
    arrCallingArrSum.sort((a, b) => {
        if (a.count > b.count) return -1
        return 1
    })

    /*
        let similarityForAllTime = []
        for (let idx = 0; idx < userInfor.length; idx++) {
            for (let idx2 = idx + 1; idx2 < userInfor.length; idx2++) {
                similarityForAllTime.push({
                    pair: [userInfor[idx].name, userInfor[idx2].name],
                    similarity: getCosine(userInfor[idx].content.timeHistogram, userInfor[idx2].content.timeHistogram)
                })
            }
        }
          similarityForAllTime.sort((a, b) => {
        if (a.similarity > b.similarity) {
            return -1
        }
        return 1
    })
        */


    let similarityForAllWeek = []
    for (let idx = 0; idx < userInfor.length; idx++) {
        for (let idx2 = idx + 1; idx2 < userInfor.length; idx2++) {
            let sim = getCosine(userInfor[idx].content.weekAndHourHist, userInfor[idx2].content.weekAndHourHist)
            similarityForAllWeek.push({
                pair: [userInfor[idx].name, userInfor[idx2].name],
                similarity: sim
            })
            userInfor[idx2].content.mapSimilarity.push({ name: userInfor[idx].name, sim: sim })
            userInfor[idx].content.mapSimilarity.push({ name: userInfor[idx2].name, sim: sim })
        }
    }


    similarityForAllWeek.sort((a, b) => {
        if (a.similarity > b.similarity) {
            return -1
        }
        return 1
    })

    let allFreqWordsTemp = []
    for (let key in allFreqWords) {
        allFreqWordsTemp.push({ word: key, count: allFreqWords[key] })
    }
    allFreqWordsTemp.sort((a, b) => {
        if (a.count > b.count) { return -1 }
        return 1
    })
    allFreqWords = undefined
    allFreqWords = allFreqWordsTemp

    //console.log(userInfor)
    //    console.log(similarityForAllTime)
    //console.log(similarityForAllWeek)

    let slt1 = document.getElementById('simUser1')
    let slt2 = document.getElementById('simUser2')

    for (let idx in userInfor) {
        let opt = document.createElement('option')
        opt.innerHTML = userInfor[idx].name
        slt1.appendChild(opt)

        let opt2 = document.createElement('option')
        opt2.innerHTML = userInfor[idx].name
        slt2.appendChild(opt2)
    }


    drawWeekStatistics(allWeekAndHourHist, participateWeekAndHourHist)
    callNameChart(arrCallingArrSum)
    for (let idx = 1; idx <= 5; idx++) {
        drawWeekSim(similarityForAllWeek, idx, userInfor)

    }

    drawRankingTbl('numOfTalks')
    drawHotTime(timeParticipateMap)

    console.log("analyze() end")
}

function processFile(file) {
    var reader = new FileReader();
    reader.onload = function() {
        rawText = reader.result;
    };
    reader.readAsText(file, /* optional */ "euc-kr");
}

//tempBtn()
