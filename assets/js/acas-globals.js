const repositoryURL = 'https://github.com/Hakorr/Userscripts/tree/main/Other/A.C.A.S';
const repositoryRawURL = 'https://raw.githubusercontent.com/Hakorr/Userscripts/main/Other/A.C.A.S';

const log = {
    info: (...message) => console.log(`[A.C.A.S]%c ${message.join(' ')}`, 'color: #67a9ef;'),
    success: (...message) => console.log(`[A.C.A.S]%c ${message.join(' ')}`, 'color: #67f08a;')
};

const UciUtils = {
    separateMoveCodes: moveCode => {
        moveCode = moveCode.trim();

        let move = moveCode.split(' ').pop();

        return [move.slice(0,2), move.slice(2,4)];
    },
    extractInfo: str => {
        const keys = ['time', 'nps', 'depth'];

        return keys.reduce((acc, key) => {
            const match = str.match(`${key} (\\d+)`);

            if (match) {
                acc[key] = Number(match[1]);
            }

            return acc;
        }, {});
    }
}

function getSkillLevelFromElo(elo) {
    if (elo <= 500) {
        return -20;
    } else if (elo >= 2850) {
        return 19;
    } else {
        const range = (elo - 500) / (2850 - 500);

        return Math.round(-20 + (range * (19 - -20)));
    }
}

// maybe should start using math to calculate it... oh well
function getDepthFromElo(elo) {
    return elo >= 2999 ? 22
    : elo >= 2970 ? 18
    : elo >= 2950 ? 15
    : elo >= 2900 ? 14
    : elo >= 2800 ? 11
    : elo >= 2700 ? 9
    : elo >= 2600 ? 8
    : elo >= 2400 ? 7
    : elo >= 2200 ? 6
    : elo >= 2000 ? 5
    : elo >= 1800 ? 4
    : elo >= 1600 ? 3
    : elo >= 1400 ? 2
    : elo >= 1200 ? 1
    : 1;
}

function allowOnlyNumbers(e) {
    return e.charCode >= 48 && e.charCode <= 57;
}

function getBasicFenLowerCased(fenStr) {
    return fenStr
        ?.replace(/\[.*?\]/g, '') // remove [] (and anything between) 
        ?.split(' ')?.[0]
        ?.toLowerCase();
}

function getBoardDimensionsFromFenStr(fenStr) {
    const formattedFen = getBasicFenLowerCased(fenStr);
    const extendedFen = formattedFen.replace(/\d/g, (match) => ' '.repeat(Number(match)));

    const files = extendedFen.split('/');
    const rank = files[0];

    const numRanks = rank.length;
    const numFiles = files.length;
  
    return [numRanks, numFiles];
}

function convertToCorrectType(data) {
    if (typeof data === 'string') {
        if (!isNaN(data)) {
            return parseFloat(data);
        }
        
        if (data.toLowerCase() === 'true' || data.toLowerCase() === 'false') {
            return data.toLowerCase() === 'true'; // Convert to boolean
        }
    }
    
    return data;
}

function capitalize(s) {
    return s && s[0].toUpperCase() + s.slice(1);
}

function getGmConfigValue(key, instanceID) {
    const config = USERSCRIPT.GM_getValue(USERSCRIPT.dbValues.AcasConfig);

    const instanceValue = config?.instance?.[instanceID]?.[key];
    const globalValue = config?.global?.[key];

    if(instanceValue !== undefined) {
        return instanceValue;
    }

    if(globalValue !== undefined) {
        return globalValue;
    }

    return null;
}

const hide = elem => elem.classList.add('hidden');
const show = elem => elem.classList.remove('hidden');

function eloToTitle(elo) {
    return elo >= 2900 ? "Cheater"
    : elo >= 2500 ? "Grandmaster"
    : elo >= 2400 ? "International Master"
    : elo >= 2300 ? "Fide Master"
    : elo >= 2200 ? "National Master"
    : elo >= 2000 ? "Expert"
    : elo >= 1800 ? "Tournament Player"
    : elo >= 1700 ? "Experienced"
    : elo >= 1600 ? "Experienced"
    : elo >= 1400 ? "Intermediate"
    : elo >= 1200 ? "Average"
    : elo >= 1000 ? "Casual"
    : "Beginner";
}

const getEloDescription = elo => `Approx. ${elo} (${eloToTitle(elo)})`;

const engineEloArr = [
    { elo: 1200, data: 'go depth 1' },
    { elo: 1300, data: 'go depth 2' },
    { elo: 1450, data: 'go depth 3' },
    { elo: 1750, data: 'go depth 4' },
    { elo: 2000, data: 'go depth 5' },
    { elo: 2200, data: 'go depth 6' },
    { elo: 2300, data: 'go depth 7' },
    { elo: 2400, data: 'go depth 8' },
    { elo: 2500, data: 'go depth 9' },
    { elo: 2600, data: 'go depth 10' },
    { elo: 2700, data: 'go movetime 1500' },
    { elo: 2800, data: 'go movetime 3000' },
    { elo: 2900, data: 'go movetime 5000' },
    { elo: 3000, data: 'go movetime 10000' }
];

function removeUciPrefix(str) {
    const index = str.indexOf(': ');

    return str.substring(index + 2);
}

function addStyles(styles) {
    var css = document.createElement('style');
    css.type = 'text/css';

    if (css.styleSheet) {
        css.styleSheet.cssText = styles;
    } else {
        css.appendChild(document.createTextNode(styles));
    }

    document.getElementsByTagName('head')[0].appendChild(css);
}

function parseUCIResponse(response) {
    const keywords = ['id', 'name', 'author', 'uciok', 'readyok', 
        'bestmove', 'option', 'info', 'score', 'pv', 'mate', 'cp',
        'depth', 'seldepth', 'nodes', 'time', 'nps', 'tbhits',
        'currmove', 'currmovenumber', 'hashfull', 'multipv',
        'refutation', 'line', 'stop', 'ponderhit', 'ucs',
        'position', 'startpos', 'moves', 'files', 'ranks',
        'pocket', 'template', 'variant', 'ponder', 'Fen:'];

    const data = {};
    let currentKeyword = null;
    
    response.split(/\s+/).forEach(token => {
        if (keywords.includes(token) || token.startsWith('info')) {
            if (token.startsWith('info')) {
                return;
            }

            currentKeyword = token;
            data[currentKeyword] = '';

        } else if (currentKeyword !== null) {
            if (!isNaN(token) && !/^[rnbqkpRNBQKP\d]+$/.test(token)) {
                data[currentKeyword] = parseInt(token);
            } else if (data[currentKeyword] !== '') {
                data[currentKeyword] += ' ';
                data[currentKeyword] += token;
            } else {
                data[currentKeyword] += token;
            }
        }
    });
    
    return data;
}

function extractVariantNames(str) {
    const regex = /var\s+([\w-]+)/g;
    const matches = str.match(regex);

    if (matches) {
        return matches.map(match => match.split(' ')[1]);
    }

    return [];
}

const isVariant960 = v => v?.toLowerCase() == 'chess960';

function formatVariant(str) {
    return str
        ?.replaceAll(' ', '')
        ?.replaceAll('-', '')
        ?.toLowerCase();
}

function formatChessFont(str) {
    return str
        ?.replaceAll(' ', '')
        ?.toLowerCase();
}

function getBoardDimensionPercentages(boardDimensionsObj) {
    const { width, height } = boardDimensionsObj;
    const isSquare = width === height;

    if (isSquare) {
        return { 'width': 100, 'height': 100 };
    }

    const newWidth = width/height * 100;
    const newHeight = height/width * 100;

    return width > height 
        ? { 'width': 100, 'height': newHeight } 
        : { 'width': newWidth, 'height': 100 };
}

function getBoardHeightFromWidth(widthPx, boardDimensionsObj) {
    return widthPx * (boardDimensionsObj.height / boardDimensionsObj.width);
}

function getPieceStyleDimensions(boardDimensionsObj) {
    const width = 100 / boardDimensionsObj.width;
    const height = 100 / boardDimensionsObj.height;

    return { width, height };
}

function getBackgroundStyleDimension(boardDimensionsObj) {
    return (100 / boardDimensionsObj.width) / (100 / 8) * 100;
}

function startHeartBeatLoop(key) {
    if(USERSCRIPT) {
        return setInterval(() => {
            USERSCRIPT.GM_setValue(key, true);
        }, 1);
    } else {
        console.error("USERSCRIPT variable not found, can't start heart beat loop!");
    }
}

function setIntervalAsync(callback, interval) {
    let running = true;

    async function loop() {
        while(running) {
            try {
                await new Promise((resolve) => setTimeout(resolve, interval));
                await callback();
            } catch (e) {
                continue;
            }
        }
    };

    loop();

    return { stop: () => running = false };
}