import { app, BrowserWindow } from 'electron'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'
import { createDatabase } from './db'
import * as repo from './photoRepo'
import { registerIpcHandlers } from './ipc'
import { registerSchemes, registerMediaProtocol } from './protocol'

registerSchemes()

// 数据统一存放在项目根目录下的 data 子目录，避免写入 C 盘 AppData。
// 打包（生产）时则放在可执行文件所在目录的 data 子目录，保持便携。
function resolveDataDir(): string {
  const base = app.isPackaged ? dirname(process.execPath) : app.getAppPath()
  return join(base, 'data')
}

const dataDir = resolveDataDir()
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

  const db = createDatabase(join(userData, 'photomind.db'))

  registerIpcHandlers({ db })
  registerMediaProtocol({ db, thumbDir })

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