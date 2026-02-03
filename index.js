const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const { GoalBlock } = goals
const express = require('express')
const config = require('./settings.json')

/* ===== Express (عشان Railway) ===== */
const app = express()
app.get('/', (req, res) => res.send('Bot is alive'))
app.listen(8000, () => console.log('Web server started'))

/* ===== Bot Creator ===== */
function createBot () {
  const bot = mineflayer.createBot({
    host: config.server.ip,
    port: config.server.port,
    username: config['bot-account'].username,
    password: config['bot-account'].password,
    auth: config['bot-account'].type
    // ❌ لا تحط version
  })

  bot.loadPlugin(pathfinder)
  bot.settings.colorsEnabled = false

  let pendingPromise = Promise.resolve()

  /* ===== Auto Register ===== */
  function sendRegister (password) {
    return new Promise((resolve) => {
      bot.chat(`/register ${password} ${password}`)
      bot.once('chat', () => resolve())
    })
  }

  /* ===== Auto Login ===== */
  function sendLogin (password) {
    return new Promise((resolve) => {
      bot.chat(`/login ${password}`)
      bot.once('chat', () => resolve())
    })
  }

  /* ===== When Bot Joins ===== */
  bot.once('spawn', () => {
    console.log('[AfkBot] Bot joined the server')

    // ✅ المكان الصحيح لـ mcData و Movements
    const mcData = require('minecraft-data')(bot.version)
    const defaultMove = new Movements(bot, mcData)

    /* Auto Auth */
    if (config.utils['auto-auth']?.enabled) {
      const password = config.utils['auto-auth'].password
      pendingPromise = pendingPromise
        .then(() => sendRegister(password))
        .then(() => sendLogin(password))
        .catch(() => {})
    }

    /* Anti-AFK */
    if (config.utils['anti-afk']?.enabled) {
      setInterval(() => {
        bot.setControlState('jump', true)
        setTimeout(() => bot.setControlState('jump', false), 300)
      }, 30000)
    }

    /* Move to Position */
    if (config.position?.enabled) {
      bot.pathfinder.setMovements(defaultMove)
      bot.pathfinder.setGoal(
        new GoalBlock(
          config.position.x,
          config.position.y,
          config.position.z
        )
      )
    }
  })

  /* ===== Reconnect ===== */
  if (config.utils['auto-reconnect']) {
    bot.on('end', () => {
      console.log('[AfkBot] Reconnecting...')
      setTimeout(createBot, config.utils['auto-recconect-delay'] || 5000)
    })
  }

  bot.on('kicked', reason =>
    console.log('[AfkBot] Kicked:', reason)
  )

  bot.on('error', err =>
    console.log('[ERROR]', err.message)
  )
}

createBot()
