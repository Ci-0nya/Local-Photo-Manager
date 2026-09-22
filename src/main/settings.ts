import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

// 应用配置：持久化 savepicture 文件夹位置。
// 配置文件位于 data/settings.json（data 目录统一存放于项目根目录）。
interface AppSettings {
  saveDir?: string
}

let configPath = ''
let currentSaveDir = ''

function readConfig(): AppSettings {
  try {
    if (!existsSync(configPath)) return {}
    const raw = JSON.parse(readFileSync(configPath, 'utf8'))
    return raw && typeof raw === 'object' ? (raw as AppSettings) : {}
  } catch {
    return {}
  }
}

export function initSettings(path: string, defaultSaveDir: string): void {
  configPath = path
  const settings = readConfig()
  const configured =
    settings.saveDir && typeof settings.saveDir === 'string' && settings.saveDir.trim()
      ? settings.saveDir.trim()
      : defaultSaveDir
  currentSaveDir = configured
  try {
    mkdirSync(currentSaveDir, { recursive: true })
  } catch {
    // 配置路径不可用时回退默认，保证应用仍能启动
    currentSaveDir = defaultSaveDir
    mkdirSync(currentSaveDir, { recursive: true })
  }
}

export function getSaveDir(): string {
  return currentSaveDir
}

// 持久化新路径并同步更新内存中的当前值
export function persistSaveDir(dir: string): void {
  const settings = readConfig()
  settings.saveDir = dir
  writeFileSync(configPath, JSON.stringify(settings, null, 2), 'utf8')
  currentSaveDir = dir
}