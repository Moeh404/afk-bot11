const mineflayer = require('mineflayer')
const Movements = require('mineflayer-pathfinder').Movements
const pathfinder = require('mineflayer-pathfinder').pathfinder
const { GoalBlock } = require('mineflayer-pathfinder').goals

const config = require('./settings.json')
const express = require('express')

const app = express()

app.get('/', (req, res) => {
  res.send('Bot has arrived')
})

app.listen(8000, () => {
  console.log('Server started')
})

function createBot () {
  const bot = mineflayer.createBot({
    username: config['bot-account']['username'],
    password: config['bot-account']['password'],
    auth: config['bot-account']['type'],
    host: config.server.ip,
    port: config.server.port
    // ❌ لا تحط version
  })

  bot.loadPlugin(pathfinder)
  const mcData = require('minecraft-data')(bot.version)
  const defaultMove = new Movements(bot, mcData)
  bot.settings.colorsEnabled = false

  let pendingPromise = Promise.resolve()

  function sendRegister (password) {
    return new Promise((resolve, reject) => {
      bot.chat(`/register ${password} ${password}`)
      console.log('[Auth] Sent /register command.')

      bot.once('chat', (username, message) => {
        console.log(`[ChatLog] <${username}> ${message}`)

        if (message.includes('successfully registered')) {
          console.log('[INFO] Registration confirmed.')
          resolve()
        } else if (message.includes('already registered')) {
          console.log('[INFO] Bot already registered.')
          resolve()
        } else {
          reject(`[ERROR] Register failed: ${message}`)
        }
      })
    })
  }

  function sendLogin (password) {
    return new Promise((resolve, reject) => {
      bot.chat(`/login ${password}`)
      console.log('[Auth] Sent /login command.')

      bot.once('chat', (username, message) => {
        console.log(`[ChatLog] <${username}> ${message}`)

        if (message.includes('successfully logged in')) {
          console.log('[INFO] Login successful.')
          resolve()
        } else {
          reject(`[ERROR] Login failed: ${message}`)
        }
      })
    })
  }

  bot.once('spawn', () => {
    console.log('[AfkBot] Bot joined the server')

    if (config.utils['auto-auth'].enabled) {
      const password = config.utils['auto-auth'].password
      pendingPromise = pendingPromise
        .then(() => sendRegister(password))
        .then(() => sendLogin(password))
        .catch(err => console.log(err))
    }

    if (config.utils['anti-afk'].enabled) {
      setInterval(() => {
        bot.setControlState('jump', true)
        setTimeout(() => bot.setControlState('jump', false), 500)
      }, 30000)
    }

    if (config.position.enabled) {
      const pos = config.position
      bot.pathfinder.setMovements(defaultMove)
      bot.pathfinder.setGoal(new GoalBlock(pos.x, pos.y, pos.z))
    }
  })

  if (config.utils['auto-reconnect']) {
    bot.on('end', () => {
      setTimeout(() => {
        console.log('[INFO] Reconnecting...')
        createBot()
      }, config.utils['auto-recconect-delay'])
    })
  }

  bot.on('kicked', reason => {
    console.log('[AfkBot] Kicked:', reason)
  })

  bot.on('error', err => {
    console.log('[ERROR]', err.message)
  })
}

createBot()
