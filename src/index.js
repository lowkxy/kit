// @ts-check
const { configCheck, firstRun, usernamesCheck, rankChecker } = require('./exports');

let userArr = [];
let kitInterval = null;

(async () => {
    firstRun()
    configCheck()
    userArr = usernamesCheck()
    await rankChecker(userArr) // Comment this line out after first run if you don't have more accounts to add/update.

    const { Bot } = require('./bot')
    // @ts-ignore
    const config = require('../config.json')

    kitInterval = setInterval(() => {
        if (global.bot_amount >= 4) return // This can also be removed now since there's no more account limit. Requires stable/fast wifi.
        if (userArr.length == 0) return clearInterval(kitInterval)
    
        let user = userArr.shift().trim()
        let default_pw = config.VARIABLES.password
    
        if (user.includes(':')) {
            let split_user = user.split(/:/)
            user = split_user[0]
            default_pw = split_user[1]
        }
    
        new Bot(user, default_pw)
        global.bot_amount++
    }, config.VARIABLES.delay * 1000)
})();