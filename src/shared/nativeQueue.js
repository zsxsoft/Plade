const os = require('os')
const bluebird = require('bluebird')
const cp = require('child_process')
const path = require('path')

module.exports = class NativeQueue {
  constructor (forkPath) {
    this.forkPath = forkPath
  }

  startQueue (list, queuingCallback, succeedCallback, rejectCallback, messageCallback) {
    const cpuCount = os.cpus().length
    const memoryFreeCount = Math.floor(os.totalmem() / 1024 / 1024 / 512)
    const queueCount = cpuCount < memoryFreeCount ? cpuCount : memoryFreeCount
    bluebird.map(list, (item, index) => new Promise((resolve, reject) => {
      const event = cp.fork(path.resolve(this.forkPath), item)
      queuingCallback(item, index)
      event.on('message', (message) => {
        try {
          if (message.message === 'ok') {
            resolve()
            if (succeedCallback) succeedCallback(item, index, message)
          } else if (message.message === 'data') {
            if (messageCallback) messageCallback(item, index, message)
          } else {
            resolve() // reject(message)
            if (rejectCallback) rejectCallback(item, index, message)
          }
        } catch (e) {
          resolve()
          if (rejectCallback) rejectCallback(item, index, message)
        }
      })
      event.on('error', resolve)
    }), {concurrency: queueCount})
  }
}
