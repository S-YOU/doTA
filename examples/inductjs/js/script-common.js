var ROW_DISPLAY_DEFAULT = USE_NESTED ? 300 : 1500,
    ROW_ADDITION_INCREMENT = 30,
    ITEMS_PER_ROW = 15;

/* Words to choose from to display */
var words = ['he', 'be', 'and', 'of', 'a', 'in', 'to', 'have', 'to','it', 'I','that', 'for','you', 'he', 'with','on', 'do','say', 'this', 'they', 'at', 'but', 'we', 'his', 'from', 'that', 'not', 'by', 'she', 'or','as','what','go','their','can','who','get','if', 'all','my','make','about','know','will','as','up','one','time','there','year','so','think','when','which','them','some','me','people','take','out','into','just','see','him','your','come','could','now','than','like','other','how','then','its','our','two','more','these','want','way','look','first','also','new', 'more','use','no','man','find','here','thing','give','many','well','only','those','tell','one','very','her','even','back','any','good','woman','through','us','life','child','there','work','down','may','after','should','call','world','over','school','still','try','in','as','last','ask','need','too','feel','three','when','state','never','become','between','high','really','something','most','another','much','family','own','out','leave','put','old','while', 'keep','student','why','let', 'great', 'same','big','group','begin','seem','country','help','talk','where','turn','problem','every','start','hand','might','American','show','part','about','against','place','over','such','again','few','case','most','week','company','where','system','each','right','program','hear','so','question','during','work','play','government','run','small','number','off','always','move','like','night','live','Mr','point','believe','hold','today','bring','happen','next','without','before','large','all','million','must','home','under','water','room','write','mother', 'area'];

if (!USE_TEXT) {
    words = words.map(function (word, idx) {
        return idx % 2 === 0 ? '<b>' + word + '</b>' : word;
    })
}

var iterationCount; /* Number of iterations to average over for performance measurements */

/* Get a row of data to display (enforcing uniqueness for nested version) */
function getDataRow() {
    var ret, usedWords = [], newWord;
    ret = USE_NESTED ? [] : '';
    for (var j = 0; j < ITEMS_PER_ROW; j++) {
        do {
            newWord = words[Math.floor(Math.random() * words.length)];
        } while (usedWords.indexOf(newWord) >= 0);
        usedWords.push(newWord);
        if (USE_NESTED)
            ret.push(newWord + ' ');
        else
            ret += newWord + ' ';
    }
    return ret;
}

/* Load with initial data */
var rerender, dataLines = [];
for (var i = 0; i < ROW_DISPLAY_DEFAULT; i++) {
    dataLines.push(getDataRow());
}
updateRowCount();
updateIterationCount();

/* Writes message to output element and to console. */
function displayMessage(msg) {
    document.getElementById("textOutput").childNodes[0].nodeValue = msg;
    console.log(msg);
}

function updateRowCount() {
    var rowCountElement = document.getElementById("rowCount");
    if (rowCountElement)
        rowCountElement.value = dataLines.length;
}

/* Generate unique list of integers NUMVALUES long with
 * each value between 0 (inclusive) and MAXVALUE (exclusive) */
function generateUniqueIntegerList(maxValue, numValues) {
    var newValue, list = [];
    while (list.length < numValues) {
        newValue = Math.floor(Math.random() * maxValue);
        if (list.indexOf(newValue) == -1)
            list.push(newValue);
    }
    return list;
}

function updateIterationCount() {
    var iterationCountElement = document.getElementById("iterationCount");
    if (iterationCountElement)
        iterationCount = parseInt(iterationCountElement.value);
}

/* Functions for modifying the displayed array in various ways */

function insertRowInMiddle() {
    var start, time = 0;
    for (var i = 0; i < iterationCount; i++) {
        dataLines.splice(Math.floor(dataLines.length / 2), 0, getDataRow());
        start = new Date().getTime();
        rerender();
        time += new Date().getTime() - start;
        if (i !== iterationCount-1)
            dataLines.splice(Math.floor(dataLines.length / 2), 1);
    }
    updateRowCount();
    displayMessage('Inserting a row in the middle (with ' + dataLines.length + ' total rows) took ' + time/iterationCount + ' ms.');
}

function updateRows(percentOfRows) {
    var start, time = 0, numRows = percentOfRows/100*dataLines.length, rowsToChange;

    for (var i = 0; i < iterationCount; i++) {
        rowsToChange = generateUniqueIntegerList(dataLines.length, numRows);
        rowsToChange.forEach(function (rowIndex) {
            dataLines[rowIndex] = getDataRow();
        });
        start = new Date().getTime();
        rerender();
        time += new Date().getTime() - start;
    }
    displayMessage('Changing ' + numRows + ' rows took ' + time/iterationCount + ' ms.');
}

function updateElements(percentOfElements) {
    var start, time = 0, newWord, row, elementsToChange,
        numElements = percentOfElements/100*dataLines.length*ITEMS_PER_ROW;
    for (var i = 0; i < iterationCount; i++) {
        elementsToChange = generateUniqueIntegerList(dataLines.length * ITEMS_PER_ROW, numElements);
        elementsToChange.forEach(function (elementNumber) {
            row = dataLines[Math.floor(elementNumber / ITEMS_PER_ROW)];
            do {
                newWord = words[Math.floor(Math.random() * words.length)] + ' ';
            } while (row.indexOf(newWord) >= 0);
            /* Be sure to maintain uniqueness */
            row[elementNumber % ITEMS_PER_ROW] = newWord;
        });
        start = new Date().getTime();
        rerender();
        time += new Date().getTime() - start;
    }
    displayMessage('Changing ' + numElements + ' elements took ' + time/iterationCount + ' ms.');
}

function addOrRemoveRows(nRows, insertAtEnd) {
    var start, time = 0, numRows = nRows * ROW_ADDITION_INCREMENT;
    for (var i = 0; i < iterationCount; i++) {
        if (numRows > 0) {
            for (var j = 0; j < numRows; j++)
                if (insertAtEnd) {
                    dataLines.push(getDataRow());
                } else {
                    dataLines.splice(0, 0, getDataRow());
                }
        } else {
            dataLines.splice(insertAtEnd ? dataLines.length + numRows : 0, Math.abs(numRows));
        }
        start = new Date().getTime();
        rerender();
        time += (new Date().getTime()) - start;
        if (i !== iterationCount-1) {
            if (numRows < 0) {
                for (j = 0; j < Math.abs(numRows); j++)
                    if (insertAtEnd) {
                        dataLines.push(getDataRow());
                    } else {
                        dataLines.splice(0, 0, getDataRow());
                    }
            } else {
                dataLines.splice(insertAtEnd ? dataLines.length - numRows : 0, numRows);
            }
        }
    }
    updateRowCount();
    displayMessage(((numRows < 0) ? "Deleting " : "Adding ") + Math.abs(numRows) + ' rows at the ' + (insertAtEnd ? "end" : "start") +
    ' (with ' + dataLines.length + ' total rows) took ' + time/iterationCount + ' ms.');
}

function changeRowCount() {
    var time, rowCount = parseInt(document.getElementById("rowCount").value);
    dataLines.splice(0, dataLines.length);
    for (var i = 0; i < rowCount; i++)
        dataLines.push(getDataRow());
    time = -(new Date().getTime());
    rerender();
    time += (new Date().getTime());
    displayMessage('Updating to ' + dataLines.length + ' rows took ' + time + ' ms.');
}

function changeRowInMiddle() {
    var start, time = 0;
    for (var i = 0; i < iterationCount; i++) {
        dataLines[Math.floor(dataLines.length / 2)] = getDataRow();
        start = new Date().getTime();
        rerender();
        time += (new Date().getTime()) - start;
    }
    displayMessage('Changing one row in the middle (with ' + dataLines.length + ' total rows) took ' + time/iterationCount + ' ms.');
}

function rerenderNoChange() {
    var start, time = 0;
    for (var i = 0; i < iterationCount; i++) {
        start = new Date().getTime();
        rerender();
        time += (new Date().getTime()) - start;
    }
    displayMessage('Rerendering with no actual changes (with ' + dataLines.length + ' total rows) took ' + time/iterationCount + ' ms.');
}

/* No longer used
function changeRowValuesInMiddle() {
 var time, changingRow = Math.floor(dataLines.length/2),
 newRow = getDataRow();
 for (var i = 0; i < ITEMS_PER_ROW; i++) {
   dataLines[changingRow][i] = newRow[i];
 }
 time = -(new Date().getTime());
 rerender();
 time += (new Date().getTime());
 displayMessage('Changing values for one row in the middle (with ' + dataLines.length + ' total rows) took ' + time + ' ms.');
}
 */