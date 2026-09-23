import { app, BrowserWindow } from 'electron'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'
import { createDatabase } from './db'
import * as repo from './photoRepo'
import { registerIpcHandlers } from './ipc'
import { registerSchemes, registerMediaProtocol } from './protocol'
import { initSettings } from './settings'

registerSchemes()

// 数据统一存放在项目根目录下的 data 子目录，避免写入 C 盘 AppData。
// 打包（生产）时则放在可执行文件所在目录，保持便携。
function resolveRootDir(): string {
  return app.isPackaged ? dirname(process.execPath) : app.getAppPath()
}

const rootDir = resolveRootDir()
const dataDir = join(rootDir, 'data')
const defaultSaveDir = join(rootDir, 'savepicture')
const kushotDir = join(rootDir, 'kushot')
const backgroundDir = join(dataDir, 'backgrounds')
app.setPath('userData', dataDir)
app.setPath('sessionData', join(dataDir, 'session'))
app.setPath('logs', join(dataDir, 'logs'))
app.setPath('temp', join(dataDir, 'tmp'))

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: 'PhotoMind',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.on('ready-to-show', () => win.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  const userData = app.getPath('userData')
  const thumbDir = join(userData, 'thumbnails')

  // 确保各数据目录存在
  mkdirSync(userData, { recursive: true })
  mkdirSync(thumbDir, { recursive: true })
  mkdirSync(app.getPath('logs'), { recursive: true })
  mkdirSync(app.getPath('temp'), { recursive: true })

  // 读配置并初始化 savepicture 目录（可被用户在「设置」页自定义，配置存于 data/settings.json）
  initSettings(join(dataDir, 'settings.json'), defaultSaveDir)
  mkdirSync(kushotDir, { recursive: true })
  mkdirSync(backgroundDir, { recursive: true })

  const db = createDatabase(join(userData, 'photomind.db'))

  registerIpcHandlers({ db, thumbDir, kushotDir, backgroundDir })
  registerMediaProtocol({ db, thumbDir, kushotDir })

  // 无界面启动自检（用于 CI / 冒烟测试）：初始化后打印结果并退出
  if (process.env['PHOTOMIND_SMOKE'] === '1') {
    console.log(`[PhotoMind] SMOKE_OK db=${join(userData, 'photomind.db')} photos=${repo.countPhotos(db)}`)
    app.quit()
    return
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})