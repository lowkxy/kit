// @ts-check
const { dim, redBright, cyanBright, greenBright, whiteBright } = require('chalk')
const fs = require('fs')
const prompt = require('prompt-sync')()
const os = require('os')
const path = require('path')
const database = require('better-sqlite3')
const axios = require('axios').default

/**
 * Print a well formatted message to console, main purpose to avoid repetitive code.
 * @param {'SUCCESS' | 'INFO' | 'ERROR'} type - The type of message to print.
 * @param {string | null} user - The bot's username or null.
 * @param {string} msg - Message to be printed.
 */
function printMsg(type, user, msg) {
    const symbols = { SUCCESS: '✔︎', ERROR: '✖︎', INFO: 'ℹ︎' }
    const colors = { SUCCESS: greenBright, ERROR: redBright, INFO: cyanBright }
    console.log(`${dim.white('[')}${colors[type.toUpperCase()](symbols[type.toUpperCase()])}${dim.white(']')} ${whiteBright(msg)} ${user ? `${dim.white('[')}${whiteBright(user)}${dim.white(']')}` : ''}`)
}

/**
 * Function that generates a random integer between the parameters provided.
 * @param {number} min Minimum value.
 * @param {number} max Maximum value.
 * @returns Random integer.
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

/**
 * Logs an event to a text file, with further details.
 * @param {string} msg Message to log.
 */
function logEvent(msg) {
    fs.appendFileSync('../log.txt', `[${timeNow()}] ${msg}\n`)
}

/**
 * Function to get the current time in a 24-hour format.
 * @returns Device time.
 */
function timeNow() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

/**
 * Checks if config file exists, if not, creates one with the desired values.
 */
function configCheck() {
    if (fs.existsSync('../config.json')) return printMsg('INFO', null, 'Config file found.')

    const default_config = {
        "VARIABLES": {
            "main_acc": "",
            "password": "",
            "server": "",
            "once": false,
            "delay": 3
        },
        "MC_INFO": {
            "version": "1.9"
        }
    }

    printMsg('INFO', null, 'This will be used as a default pass if you haven\'t specified a different password.\nIf a few of your accounts have a different password use \"username:password\" for those accounts in usernames.txt!\n')
    let pw = prompt(whiteBright('Enter the default password for all your alts: '), 'not_specified')
    let main = prompt(whiteBright('Enter the main account all your kits should be sent to: '), 'not_specified')
    let oncePrompt = prompt(whiteBright('Would you also like to collect once kits? Enter y or n: '), 'n')
    printMsg('INFO', null, 'Make sure to enter the specific mode (opprison, opskyblock, opfactions), no shortforms.\nThis can be changed at anytime in your config.json file.\n')
    let sv = prompt(whiteBright('Enter the server you\'d like to collect kits from: '), 'opprison')
    printMsg('INFO', null, 'If you would like to change values, open config.json with notepad and do the required.')

    default_config.VARIABLES.main_acc = main; default_config.VARIABLES.password = pw; default_config.VARIABLES.server = sv;

    /y/i.test(oncePrompt) ? default_config.VARIABLES.once = true : default_config.VARIABLES.once = false

    fs.writeFileSync('../config.json', JSON.stringify(default_config))
    printMsg('SUCCESS', null, 'Config file created.')
}

/**
 * Checks if the application is ran for the first time.
 */
function firstRun() {
    const filePath = path.join(os.tmpdir(), 'first_run.txt');

    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, new Date().toDateString())
        printMsg('INFO', null, 'Detected first run.\nThis program currently does not break rules, however, that may change in the future.\nI will not be responsible for any bans, if used in a malicious way or if the rules change.\n\nMake sure your delay is higher in config if you\'re collecting after reset. (10 Seconds)\nTo avoid flooding the chat with welcome messages and being mistaken for botting.\n')
    }
}

/**
 * Checks if usernames.txt exists, if not it will create one.
 * @returns Organized array of usernames.
 */
function usernamesCheck() {
    if (fs.existsSync('../usernames.txt')) {
        printMsg('INFO', null, 'Usernames text file found.')
        let usernames = fs.readFileSync('../usernames.txt', 'utf-8')
        if (usernames.length < 1) {
            printMsg('INFO', null, 'Looks like you don\'t have any usernames, made a dummy file for you. Edit it with your accounts.')
            fs.writeFileSync('../usernames.txt', 'Account1\nAccount2\nAccount3\nAccount4:MyPasswordIsDifferent\nAccount5')
        }
        let returnedArr = usernames.split('\n').filter(i => i !== '')
        return returnedArr
    } else {
        printMsg('INFO', null, 'Usernames text file not found.\nMade a dummy file for you. Edit it with your accounts.')
        fs.writeFileSync('../usernames.txt', 'Account1\nAccount2\nAccount3\nAccount4:MyPasswordIsDifferent\nAccount5')
        process.exit(0)
    }
}

/**
 * Checks the ranks of the accounts using pika-network's public API.
 * @param {Array} usernameArray - Username array.
 */
async function rankChecker(usernameArray) {
    printMsg('INFO', null, 'Fetching user ranks from pika-network API. May take a while if you have alot of accounts.')
    const db = new database('../user_data.db')
    db.exec(`CREATE TABLE IF NOT EXISTS users (username TEXT PRIMARY KEY, opsb_rank TEXT NULL, opf_rank TEXT NULL, opp_rank TEXT NULL)`)
    const insertUser = db.prepare('INSERT OR REPLACE INTO users (username, opsb_rank, opf_rank, opp_rank) VALUES (?, ?, ?, ?)')

    // If ratelimits are introduced to the API add a timeout.
    for (let i = 0; i < usernameArray.length; i++) {
        let temp_user = usernameArray[i]
        temp_user.includes(':') ? temp_user = temp_user.split(/:/)[0] : null
        await axios.get(`https://stats.pika-network.net/api/profile/${temp_user}`).then((response) => {
            let opp_rank = null; let opsb_rank = null; let opf_rank = null;
            response.data.ranks.forEach((e) => {
                if (e.server.toLowerCase().includes('opprison')) {
                    opp_rank = e.displayName
                } else if (e.server.toLowerCase().includes('opsb')) {
                    opsb_rank = e.displayName
                } else if (e.server.toLowerCase().includes('opf')) {
                    opf_rank = e.displayName
                }
            })
            insertUser.run(temp_user, opsb_rank, opf_rank, opp_rank)
            printCounter(i + 1, usernameArray.length)
        })
    }
}

/**
 * Fetches user information from sqlite database.
 * @param {string} username - Username to fetch.
 * @returns - User information from database.
 */
async function fetchRank(username) {
    const db = new database('../user_data.db')
    const fetchUser = db.prepare('SELECT username, opsb_rank, opf_rank, opp_rank FROM users WHERE username = ?')
    return await fetchUser.get(username)
}

/**
 * Provides user with live counter.
 * @param {number} current 
 * @param {number} total 
 */
function printCounter(current, total) {
    process.stdout.clearLine(0)
    process.stdout.cursorTo(0)
    process.stdout.write(`${dim.white('[')}${cyanBright('ℹ︎')}${dim.white(']')} ${whiteBright(`${current}/${total}`)}`)
    if (current == total) console.log()
}

module.exports = { configCheck, firstRun, usernamesCheck, rankChecker, randomInt, printMsg, fetchRank, logEvent }