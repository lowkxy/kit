// @ts-nocheck
const config = require('../config.json')
const mc = require('mineflayer');
const { randomInt, printMsg, fetchRank, logEvent } = require('./exports')

const hostArray = ['top.pika.host', 'proxy001.pikasys.net', 'proxy002.pikasys.net'] // Add more if needed, since pika has "already connected to proxy" issues.
const version = config.MC_INFO.version
const clrRegex = /\u00A7[0-9A-FK-OR]/ig

global.bot_amount = 0

/**
 * Class that creates and manages all bots. 
 */
class Bot {

    constructor(username, password) {
        this.username = username
        this.password = password
        this.host = hostArray[randomInt(0, hostArray.length - 1)]
        this.version = version
        this.spawnCount = 0
        this.onceKit = config.VARIABLES.once
        this.hasCollected = false
        this.rank = null

        this.initialize()
    }

    async initialize() {
        printMsg('INFO', this.username, 'Performing rank check.')
        await this.initCheck()
    }

    async initCheck() {
        let currentServer = config.VARIABLES.server.toLowerCase()
        /** @type {Object} */
        let dbObject = await fetchRank(this.username)

        const rankMap = {
            "opskyblock": "opsb_rank",
            "opprison": "opp_rank",
            "opfactions": "opf_rank",
        }
                  
        if (rankMap.hasOwnProperty(currentServer)) {
            this.rank = dbObject[rankMap[currentServer]]
        } else {
            printMsg('ERROR', this.username, 'Config file contains unsupported gamemode. Only support opskyblock, opfactions & opprison. Killing process.')
            process.exit(1)
        }

        if (this.rank == null) {
            printMsg('ERROR', this.username, 'Account does not have a rank. Skipping.')
        } else {
            printMsg('INFO', this.username, `Account has a rank (${this.rank}), connecting to pika-network.`)
            this.initBot()
        }
    }

    initBot() {
        this.bot = mc.createBot({
            'username': this.username,
            'host': this.host,
            'version': this.version,
        })

        this.initEvents()
    }

    initEvents() {
        this.bot.once('login', () => {
            printMsg('SUCCESS', this.bot.username, `Connected to ${this.host} successfully!`)
        })

        this.bot.on('spawn', async () => {
            this.spawnCount++

            if (this.spawnCount == 1) {
                printMsg('INFO', this.bot.username, `Spawned in login lobby!`)
                this.bot.chat(`/login ${this.password}`)
            } else if (this.spawnCount % 2 == 0) {
                printMsg('INFO', this.bot.username, `Account in hub!`)
                this.bot.chat(`/server ${config.VARIABLES.server}`)
                // Waits 20 seconds, before retrying, doubt queues can make you wait longer.
                this.joinTimeout = setTimeout(() => {
                    this.bot.quit()
                    this.initBot()
                    printMsg('ERROR', this.bot.username, `Looks like you had problems connecting, retrying!`)
                }, 20 * 1000)
            } else {
                clearTimeout(this.joinTimeout)
                printMsg('INFO', this.bot.username, `Joined!`)
                this.bot.chat('/kit donator')
            }
        })

        this.bot.on('windowOpen', async (window) => {
            const windowTitle = window.title?.toUpperCase()

            if (windowTitle?.includes('KIT')) {
                // Checks if it's not opskyblock's or opfaction's kit menu.
                let menuCheck = window.containerItems().find((i) => {
                    return i.customName?.toUpperCase().includes('DONATOR')
                })
                if (!menuCheck) {
                    let rankedKit = window.containerItems().find((j) => {
                        return j.customName && j.customName.replace(clrRegex, '').toUpperCase().includes(this.rank?.toUpperCase())
                    })
                    rankedKit && await this.bot.clickWindow(rankedKit.slot, 0, 0)
                } else {
                    await this.bot.clickWindow(menuCheck.slot, 0, 0)
                }
            } else if (windowTitle?.includes(this.rank?.toUpperCase())) {
                let kitSlot = window.containerItems().find((k) => {
                    if (this.onceKit && this.hasCollected) {
                        return k.customName && (k.customName.replace(clrRegex, '').toUpperCase().includes(this.rank?.toUpperCase()) && k.customName.replace(clrRegex, '').toUpperCase().includes('ONCE'))
                    } else {
                        return k.customName && (k.customName.replace(clrRegex, '').toUpperCase().includes(this.rank?.toUpperCase()) && !k.customName.replace(clrRegex, '').toUpperCase().includes('ONCE'))
                    }
                })
                kitSlot && printMsg('INFO', this.bot.username, `Collected ${kitSlot.customName?.replace(clrRegex, '')}!`)
                kitSlot && await this.bot.clickWindow(kitSlot.slot, 0, 0)
            } else if (windowTitle?.includes('DONATOR')) {
                let kit = window.containerItems().find((f) => {
                    if (this.onceKit && this.hasCollected) {
                        return f.customName && f.customName.replace(clrRegex, '').toUpperCase().includes(`${this.rank?.toUpperCase()}ONCE`)
                    } else {
                        return f.customName && f.customName.replace(clrRegex, '').toUpperCase().includes(this.rank?.toUpperCase())
                    }
                })
                kit && printMsg('INFO', this.bot.username, `Collected ${kit.customName?.replace(clrRegex, '')}!`)
                kit && await this.bot.clickWindow(kit.slot, 0, 0)
            } else if (windowTitle?.includes('SELECT ITEMS TO SEND')) {
                let itemArr = []
                
                window.items().forEach((j) => {
                    if (j.customName && (j.customName.replace(clrRegex, '').toUpperCase().includes('KIT VOUCHER') || j.customName.replace(clrRegex, '').toUpperCase().includes('CRATE KEY'))) {
                        itemArr.push(j.slot)
                    }
                })

                if (itemArr.length == 0) {
                    printMsg('ERROR', this.bot.username, 'No kits collected, most likely still on cooldown. Disconnecting.')
                    this.bot.quit()
                } else {
                    let temp_value = itemArr.length
                    printMsg('INFO', this.bot.username, `There\'s kits/keys in your inventory, gifting!`)
                    for (let i = 1; i <= temp_value; i++) {
                        setTimeout(() => {
                            let shifted_slot = itemArr.shift()
                            this.bot.clickWindow(shifted_slot, 0, 0)
                            if (i == temp_value) this.bot.closeWindow(window)
                        }, i * 200) // If you have slow wifi, increase this delay to 1000 or more.
                    }
                }
            } else if (windowTitle?.includes('ARE YOU SURE?')) {
                this.giftInterval = setInterval(() => {
                    let confirm = window.containerItems().find((k) => {
                        return k.customName?.toUpperCase().includes('CONFIRM')
                    })
                    confirm && this.bot.clickWindow(confirm.slot, 0, 0)
                }, 3000) // Will keep looping until the server registers the click, won't lose kits this way.
            }
        })

        this.bot.on('windowClose', async (window) => {
            const windowTitle = window.title?.toUpperCase()
            if ((windowTitle?.includes(this.rank?.toUpperCase()) || windowTitle?.includes('DONATOR'))) {
                if (this.onceKit && !this.hasCollected) {
                    this.bot.chat('/kit')
                } else {
                    this.bot.chat(`/gift ${config.VARIABLES.main_acc}`)
                }
                this.hasCollected = true
            } else if (windowTitle?.includes('ARE YOU SURE?')) {
                clearInterval(this.giftInterval)
                printMsg('SUCCESS', this.bot.username, 'Kits gifted successfully!')
                this.bot.quit()
            }
        })

        this.bot.on('end', (reason) => {
            global.bot_amount--
            if (reason == 'disconnect.quitting' || 'socketClosed') return
            printMsg('ERROR', this.bot.username, 'Disconnected. Reconnecting.\n')
            setTimeout(() => {
                this.initBot()
            }, 3000)
        })

        this.bot.on('kicked', (reason) => {
            printMsg('ERROR', this.username, 'You were kicked, more information in log. Skipping account.')
            logEvent(`[${this.username}] Kicked for the following reason:\n${reason}`)
        })

        this.bot.on('error', (err) => {
            global.bot_amount--
            // @ts-ignore
            if (err.code === 'ECONNREFUSED') {
                printMsg('ERROR', this.username, 'Login Denied.')
            } else {
                printMsg('ERROR', this.username, 'Unhandled exception, more information in log. Skipping account.')
                logEvent(`[${this.username}] Unhandled exception:\n${err}`)
            }
        })
    }
}

module.exports = { Bot }