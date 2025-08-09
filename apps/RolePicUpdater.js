import plugin from '../../../lib/plugins/plugin.js'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import child_process from 'child_process'

const require = createRequire(import.meta.url)
const exec = promisify(child_process.exec)
const mkdir = promisify(fs.mkdir)
const copyFile = promisify(fs.copyFile)
const rmdir = promisify(fs.rm)

export class RolePicUpdater extends plugin {
  constructor() {
    super({
      name: '鸣潮-角色面板图图片更新',
      event: 'message',
      priority: 1009,
      rule: [
        {
          reg: '^(～|~|鸣潮)(面板图更新|更新面板图|远程拉取面板图)$',
          fnc: 'updateRolePics'
        }
      ]
    })
    
    // 插件资源路径
    this.pluginResources = path.join(process.cwd(), 'plugins/waves-plugin/resources')
    this.rolePicPath = path.join(this.pluginResources, 'rolePic')
    // 临时仓库路径
    this.tempRepoPath = path.join(this.pluginResources, 'temp/mcimg')
  }

  async updateRolePics() {
    if (!this.e.isMaster) return false
    
    try {
      await this.e.reply('开始更新角色图片，请稍候...')
      
      // 1. 检查git安装
      if (!(await this.checkGit())) return
      
      // 2. 准备目录
      await this.prepareDirs()
      
      // 3. 克隆或更新仓库
      await this.cloneOrUpdateRepo()
      
      // 4. 合并图片文件夹
      await this.mergeRolePics()
      
      // 5. 清理临时文件
      await this.cleanup()
      
      await this.e.reply('角色图片更新完成！')
    } catch (err) {
      logger.error(`角色图片更新失败: ${err}`)
      await this.e.reply(`更新失败: ${err.message}`)
    }
    return true
  }

  /** 检查git安装 */
  async checkGit() {
    try {
      await exec('git --version')
      return true
    } catch {
      await this.e.reply('请先安装git')
      return false
    }
  }

  /** 准备目录 */
  async prepareDirs() {
    // 创建角色图片目录
    await mkdir(this.rolePicPath, { recursive: true })
    
    // 创建临时目录
    await mkdir(this.tempRepoPath, { recursive: true })
  }

  /** 克隆或更新仓库 */
  async cloneOrUpdateRepo() {
    const repoUrl = 'https://github.com/zqyaila/mcimg.git'
    const rolePicDir = path.join(this.tempRepoPath, 'rolePic')
    
    // 检查仓库是否已存在
    if (fs.existsSync(path.join(this.tempRepoPath, '.git'))) {
      // 更新现有仓库
      await exec(`git -C "${this.tempRepoPath}" pull origin main`)
    } else {
      // 克隆新仓库（浅克隆节省时间）
      await exec(`git clone --depth 1 --filter=blob:none --sparse ${repoUrl} "${this.tempRepoPath}"`)
      // 设置稀疏检出只获取rolePic目录
      await exec(`git -C "${this.tempRepoPath}" sparse-checkout set rolePic`)
    }
    
    // 确保rolePic目录存在
    if (!fs.existsSync(rolePicDir)) {
      throw new Error('仓库中未找到rolePic目录')
    }
  }

  /** 合并角色图片 */
  async mergeRolePics() {
    const srcDir = path.join(this.tempRepoPath, 'rolePic')
    const destDir = this.rolePicPath
    
    // 获取所有角色文件夹
    const roleDirs = fs.readdirSync(srcDir).filter(item => {
      const itemPath = path.join(srcDir, item)
      return fs.statSync(itemPath).isDirectory()
    })
    
    if (roleDirs.length === 0) {
      throw new Error('未找到任何角色图片文件夹')
    }
    
    let updatedCount = 0
    
    // 遍历并合并每个角色文件夹
    for (const dir of roleDirs) {
      const srcRoleDir = path.join(srcDir, dir)
      const destRoleDir = path.join(destDir, dir)
      
      // 创建目标文件夹（如果不存在）
      if (!fs.existsSync(destRoleDir)) {
        fs.mkdirSync(destRoleDir, { recursive: true })
      }
      
      // 获取所有图片文件
      const images = fs.readdirSync(srcRoleDir).filter(file => 
        ['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(file).toLowerCase())
      )
      
      // 复制图片
      for (const file of images) {
        const srcFile = path.join(srcRoleDir, file)
        const destFile = path.join(destRoleDir, file)
        
        // 只复制新文件或更新过的文件
        if (!fs.existsSync(destFile) || 
            fs.statSync(srcFile).mtimeMs > fs.statSync(destFile).mtimeMs) {
          await copyFile(srcFile, destFile)
          updatedCount++
        }
      }
    }
    
    if (updatedCount === 0) {
      await this.e.reply('角色图片已是最新版本')
    } else {
      await this.e.reply(`成功更新 ${updatedCount} 张角色图片`)
    }
  }

  /** 清理临时文件 */
  async cleanup() {
    try {
      await rmdir(this.tempRepoPath, { recursive: true, force: true })
    } catch (err) {
      logger.warn(`清理临时文件失败: ${err}`)
    }
  }
}