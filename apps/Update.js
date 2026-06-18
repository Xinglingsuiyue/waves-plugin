import plugin from '../../../lib/plugins/plugin.js'
import { createRequire } from 'module'
import lodash from 'lodash'
import { Restart } from '../../other/restart.js'
const require = createRequire(import.meta.url)
const { exec, execSync } = require('child_process')
// 是否在更新中
let uping = false
/**
 * 处理插件更新
 */
export class Update extends plugin {
  constructor() {
    super({
      name: '鸣潮-更新插件',
      event: 'message',
      priority: 1009,
      rule: [
        {
          reg: '^(～|~|鸣潮)((插件)?(强制)?更新| update)$',
          fnc: 'update'
        }
      ]
    })
  }
  /**
   * rule - 更新插件
   * @returns
   */
  async update() {
    if (!this.e.isMaster) return false
    /** 检查是否正在更新中 */
    if (uping) {
      await this.reply('已有命令更新中..请勿重复操作')
      return
    }
    /** 检查git安装 */
    if (!(await this.checkGit())) return
    const isForce = this.e.msg.includes('强制')
    /** 执行更新 */
    try {
      await this.runUpdate(isForce)
    } catch (err) {
      logger.error(`[waves-plugin] 更新过程出错: ${err.message}`)
      // 如果是强制更新且已经拉取了代码，仍然尝试重启
      if (isForce && this.isUp) {
        await this.reply('更新过程出现异常，但代码已更新，即将重启')
      } else {
        await this.reply(`更新失败: ${err.message}`)
        return
      }
    }
    /** 是否需要重启 */
    if (this.isUp) {
      await this.reply('更新完成，正在重启')
      setTimeout(() => this.restart(), 2000)
    }
  }
  restart() {
    new Restart(this.e).restart()
  }
  /**
   * 更新
   * @param {boolean} isForce 是否为强制更新
   * @returns
   */
  async runUpdate(isForce) {
    let command = `git -C ./plugins/waves-plugin/ pull`
    if (isForce) {
      command = `git -C ./plugins/waves-plugin/ reset --hard origin/main`
      this.e.reply('正在执行强制更新操作，请稍等')
    } else {
      this.e.reply('正在执行更新操作，请稍等')
    }
    /** 获取上次提交的commitId，用于获取日志时判断新增的更新日志 */
    this.oldCommitId = await this.getcommitId('waves-plugin')
    uping = true
    const ret = await this.execSync(command)
    uping = false
    if (ret.error) {
      logger.mark(`${this.e.logFnc} 更新失败：waves-plugin`)
      this.gitErr(ret.error, ret.stdout)
      return false
    }
    /** 通过 commitId 变化判断是否实际更新了 */
    const newCommitId = await this.getcommitId('waves-plugin')
    /** 获取插件提交的最新时间 */
    const time = await this.getTime('waves-plugin')
    if (newCommitId === this.oldCommitId) {
      await this.reply(`waves-plugin已经是最新版本\n最后更新时间：${time}`)
    } else {
      await this.reply(`waves-plugin\n最后更新时间：${time}`)
      this.isUp = true
      /** 获取waves-plugin的更新日志 */
      try {
        const log = await this.getLog('waves-plugin')
        await this.reply(log)
      } catch (err) {
        logger.error(`[waves-plugin] 获取更新日志失败: ${err.message}`)
        await this.reply('更新日志获取失败，但更新已完成，即将重启')
      }
    }
    logger.mark(`${this.e.logFnc} 最后更新时间：${time}`)
    return true
  }
  /**
   * 获取waves-plugin的更新日志
   * @param {string} plugin 插件名称
   * @returns
   */
  async getLog(plugin = '') {
    const cm = `cd ./plugins/${plugin}/ && git log  -20 --oneline --pretty=format:"%h||[%cd]  %s" --date=format:"%m-%d %H:%M"`
    let logAll
    try {
      logAll = await execSync(cm, { encoding: 'utf-8' })
    } catch (error) {
      logger.error(error.toString())
      this.reply(error.toString())
    }
    if (!logAll) return false
    logAll = logAll.split('\n')
    let log = []
    for (let str of logAll) {
      str = str.split('||')
      if (str[0] == this.oldCommitId) break
      if (str[1].includes('Merge branch')) continue
      log.push(str[1])
    }
    const line = log.length
    log = log.join('\n\n')
    if (log.length <= 0) return ''
    let end = ''
    end =
      '更多详细信息，请前往github查看\nhttps://github.com/Xinglingsuiyue/waves-plugin/commits/main'
    log = await this.makeForwardMsg(`waves-plugin更新日志，共${line}条`, log, end)
    return log
  }
  /**
   * 获取上次提交的commitId
   * @param {string} plugin 插件名称
   * @returns
   */
  async getcommitId(plugin = '') {
    const cm = `git -C ./plugins/${plugin}/ rev-parse --short HEAD`
    let commitId = await execSync(cm, { encoding: 'utf-8' })
    commitId = lodash.trim(commitId)
    return commitId
  }
  /**
   * 获取本次更新插件的最后一次提交时间
   * @param {string} plugin 插件名称
   * @returns
   */
  async getTime(plugin = '') {
    const cm = `cd ./plugins/${plugin}/ && git log -1 --oneline --pretty=format:"%cd" --date=format:"%m-%d %H:%M"`
    let time = ''
    try {
      time = await execSync(cm, { encoding: 'utf-8' })
      time = lodash.trim(time)
    } catch (error) {
      logger.error(error.toString())
      time = '获取时间失败'
    }
    return time
  }
  /**
   * 制作转发消息
   * @param {string} title 标题 - 首条消息
   * @param {string} msg 日志信息
   * @param {string} end 最后一条信息
   * @returns
   */
  async makeForwardMsg(title, msg, end) {
    let bot = this.e.bot ?? Bot
    let nickname = bot?.nickname || '鸣潮插件'
    if (this.e.isGroup) {
      try {
        // TRSS-Yunzai 兼容：getGroupMemberInfo 可能不存在，优先尝试
        let info = null
        if (typeof bot?.getGroupMemberInfo === 'function') {
          info = await bot.getGroupMemberInfo(this.e.group_id, bot.uin)
        } else if (typeof this.e.group?.pickMember === 'function') {
          // 备选方案：通过 group 对象获取成员信息（TRSS-Yunzai 通用 API）
          info = await this.e.group.pickMember(bot.uin)
        }
        if (info) {
          nickname = info.card || info.nickname
        }
      } catch (e) {
        // 所有方式均失败时使用 bot 默认昵称，不影响主流程
        logger.debug(`[waves-plugin][makeForwardMsg] 获取群名片失败: ${e.message}`)
      }
    }
    let userInfo = {
      user_id: bot?.uin || this.e.self_id || 0,
      nickname
    }
    let forwardMsg = [
      {
        ...userInfo,
        message: title
      },
      {
        ...userInfo,
        message: msg
      }
    ]
    if (end) {
      forwardMsg.push({
        ...userInfo,
        message: end
      })
    }
    /** 制作转发内容 */
    if (this.e.group?.makeForwardMsg) {
      forwardMsg = await this.e.group.makeForwardMsg(forwardMsg)
    } else if (this.e?.friend?.makeForwardMsg) {
      forwardMsg = await this.e.friend.makeForwardMsg(forwardMsg)
    } else {
      // 修复：msg 是字符串不是数组，直接返回即可
      return msg
    }
    let dec = 'waves-plugin 更新日志'
    /** 处理描述 */
    if (typeof (forwardMsg.data) === 'object') {
      let detail = forwardMsg.data?.meta?.detail
      if (detail) {
        detail.news = [{ text: dec }]
      }
    } else {
      forwardMsg.data = forwardMsg.data
        .replace(/\n/g, '')
        .replace(/<title color="#777777" size="26">(.+?)<\/title>/g, '___')
        .replace(/___+/, `<title color="#777777" size="26">${dec}</title>`)
    }
    return forwardMsg
  }
  /**
   * 处理更新失败的相关函数
   * @param {string} err
   * @param {string} stdout
   * @returns
   */
  async gitErr(err, stdout) {
    const msg = '更新失败！'
    const errMsg = err.toString()
    stdout = stdout.toString()
    if (errMsg.includes('Timed out')) {
      const remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, '')
      await this.reply(msg + `\n连接超时：${remote}`)
      return
    }
    if (/Failed to connect|unable to access/g.test(errMsg)) {
      const remote = errMsg.match(/'(.+?)'/g)[0].replace(/'/g, '')
      await this.reply(msg + `\n连接失败：${remote}`)
      return
    }
    if (errMsg.includes('be overwritten by merge') || errMsg.includes('本地修改将被合并操作覆盖')) {
      await this.reply(
        msg +
        `存在冲突：\n${errMsg}\n` +
        '请解决冲突后再更新，或者执行~强制更新，放弃本地修改'
      )
      return
    }
    if (stdout.includes('CONFLICT') || stdout.includes('冲突')) {
      await this.reply([
        msg + '存在冲突\n',
        errMsg,
        stdout,
        '\n请解决冲突后再更新，或者执行~强制更新，放弃本地修改'
      ])
      return
    }
    await this.reply([errMsg, stdout])
  }
  /**
   * 异步执行git相关命令
   * @param {string} cmd git命令
   * @returns
   */
  async execSync(cmd) {
    return new Promise((resolve, reject) => {
      exec(cmd, { windowsHide: true }, (error, stdout, stderr) => {
        resolve({ error, stdout, stderr })
      })
    })
  }
  /**
   * 检查git是否安装
   * @returns
   */
  async checkGit() {
    const ret = await execSync('git --version', { encoding: 'utf-8' })
    if (!ret || !ret.includes('git version')) {
      await this.reply('请先安装git')
      return false
    }
    return true
  }
}