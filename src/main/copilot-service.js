import { execFile, spawn } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { app } from 'electron'
import { CopilotClient, RuntimeConnection } from '@github/copilot-sdk'

const execFileAsync = promisify(execFile)
const requireFromHere = createRequire(import.meta.url)
const listeners = new Set()
const cancelledLoginProcesses = new WeakSet()
const MAX_LOGIN_OUTPUT = 64 * 1024
const CODE_TIMEOUT_MS = 30_000
const LOGIN_TIMEOUT_MS = 5 * 60_000

let client
let clientPromise
let loginProcess

function copilotHome() {
  return join(app.getPath('userData'), 'copilot')
}

function cleanEnvironment() {
  const environment = { ...process.env, COPILOT_HOME: copilotHome() }
  delete environment.ELECTRON_NO_ASAR
  delete environment.ELECTRON_RUN_AS_NODE
  delete environment.NODE_OPTIONS
  delete environment.GH_TOKEN
  delete environment.GITHUB_TOKEN
  delete environment.COPILOT_GITHUB_TOKEN
  delete environment.GIT_EXTERNAL_DIFF
  delete environment.GIT_EDITOR
  delete environment.GIT_ASKPASS
  environment.GIT_PAGER = ''
  environment.GIT_TERMINAL_PROMPT = '0'

  for (const key of Object.keys(environment)) {
    if (/^GIT_CONFIG_(COUNT|KEY_\d+|VALUE_\d+)$/i.test(key)) delete environment[key]
  }

  return environment
}

function platformPackageName() {
  const platform = process.platform
  const arch = process.arch
  const supported = new Set([
    'darwin-arm64',
    'darwin-x64',
    'linux-arm64',
    'linux-x64',
    'linuxmusl-arm64',
    'linuxmusl-x64',
    'win32-arm64',
    'win32-x64'
  ])
  const key = `${platform}-${arch}`
  if (!supported.has(key)) throw new Error(`Unsupported platform: ${key}`)
  return `@github/copilot-${key}`
}

function cliPath() {
  const resolved = requireFromHere.resolve(platformPackageName())
  if (!resolved.includes('.asar')) return resolved

  const unpacked = resolved.replace(/app\.asar([/\\])/, 'app.asar.unpacked$1')
  return existsSync(unpacked) ? unpacked : resolved
}

async function ensureClient() {
  if (client) return client
  if (clientPromise) return clientPromise

  clientPromise = (async () => {
    const nextClient = new CopilotClient({
      workingDirectory: homedir(),
      baseDirectory: copilotHome(),
      env: cleanEnvironment(),
      logLevel: 'warning',
      connection: RuntimeConnection.forTcp({ port: 0 })
    })
    await nextClient.start()
    client = nextClient
    return nextClient
  })()

  try {
    return await clientPromise
  } finally {
    clientPromise = undefined
  }
}

async function resetClient() {
  const current = client
  client = undefined
  clientPromise = undefined
  if (!current) return

  try {
    await current.stop()
  } catch (error) {
    console.warn('Unable to stop Copilot client cleanly.', error)
  }
}

function emit(event) {
  for (const listener of listeners) listener(event)
}

export function onAuthEvent(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function checkAuth() {
  try {
    const status = await (await ensureClient()).getAuthStatus()
    return {
      authenticated: status.isAuthenticated,
      username: status.login || '',
      host: status.host || 'https://github.com',
      authType: status.authType || ''
    }
  } catch (error) {
    console.warn('Unable to check GitHub Copilot authentication.', error)
    return { authenticated: false, username: '', host: 'https://github.com', authType: '' }
  }
}

export async function listModels() {
  const status = await checkAuth()
  if (!status.authenticated) throw new Error('Sign in to GitHub Copilot before loading models.')

  const models = await (await ensureClient()).listModels()
  return models
    .filter((model) => model.policy?.state !== 'disabled')
    .map((model) => ({
      id: model.id,
      name: model.name,
      supportsVision: model.capabilities?.supports?.vision === true,
      supportsReasoningEffort: model.capabilities?.supports?.reasoningEffort === true,
      supportedReasoningEfforts: model.supportedReasoningEfforts || []
    }))
}

export function cancelDeviceFlow() {
  if (!loginProcess) return
  cancelledLoginProcesses.add(loginProcess)
  loginProcess.kill()
  loginProcess = undefined
}

export function startDeviceFlow() {
  cancelDeviceFlow()

  return new Promise((resolve, reject) => {
    const processHandle = spawn(cliPath(), ['login', '--device-code'], {
      env: cleanEnvironment(),
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    })
    loginProcess = processHandle

    let output = ''
    let codeResolved = false
    let finishedWithError = false
    let timer = setTimeout(() => finishWithError('No device code was received from GitHub Copilot.'), CODE_TIMEOUT_MS)

    const finishWithError = (message) => {
      if (finishedWithError) return
      finishedWithError = true
      cancelledLoginProcesses.add(processHandle)
      clearTimeout(timer)
      if (loginProcess === processHandle) loginProcess = undefined
      try {
        processHandle.kill()
      } catch {
        // The process has already exited.
      }
      if (codeResolved) emit({ type: 'failed', reason: message })
      else reject(new Error(message))
    }

    const handleOutput = (data) => {
      if (output.length < MAX_LOGIN_OUTPUT) output += data.toString().slice(0, MAX_LOGIN_OUTPUT - output.length)
      if (codeResolved) return

      const code = output.match(/(?:code(?: is)?[:\s]+|enter\s+)([A-Z0-9]{4}-[A-Z0-9]{4})/i)
      if (!code) return

      const verificationUrl = output.match(/https:\/\/github\.com\/login\/device/i)?.[0]
      codeResolved = true
      clearTimeout(timer)
      timer = setTimeout(() => finishWithError('GitHub sign-in timed out.'), LOGIN_TIMEOUT_MS)
      resolve({ userCode: code[1].toUpperCase(), verificationUri: verificationUrl || 'https://github.com/login/device' })
    }

    processHandle.stdout?.on('data', handleOutput)
    processHandle.stderr?.on('data', handleOutput)
    processHandle.on('error', (error) => finishWithError(error.message))
    processHandle.on('close', async (exitCode) => {
      clearTimeout(timer)
      if (loginProcess === processHandle) loginProcess = undefined
      if (cancelledLoginProcesses.has(processHandle)) return

      if (!codeResolved) {
        if (exitCode === 0) {
          await resetClient()
          const status = await checkAuth()
          if (status.authenticated) {
            emit({ type: 'succeeded', username: status.username })
            resolve({ userCode: '', verificationUri: '' })
          } else {
            reject(new Error('Copilot login finished, but no authenticated account was found.'))
          }
        } else {
          reject(new Error(`Copilot login exited with code ${exitCode}: ${output.slice(-500)}`))
        }
        return
      }

      if (exitCode !== 0) {
        emit({ type: 'failed', reason: `Copilot login exited with code ${exitCode}.` })
        return
      }

      await resetClient()
      const status = await checkAuth()
      if (status.authenticated) emit({ type: 'succeeded', username: status.username })
      else emit({ type: 'failed', reason: 'Sign-in completed, but Copilot did not report an authenticated account.' })
    })
  })
}

export async function signOut() {
  cancelDeviceFlow()
  await resetClient()

  const configPath = join(copilotHome(), 'config.json')
  try {
    if (existsSync(configPath)) {
      const raw = readFileSync(configPath, 'utf8')
      const withoutComments = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
      const config = JSON.parse(withoutComments)
      delete config.logged_in_users
      delete config.last_logged_in_user
      writeFileSync(configPath, JSON.stringify(config, null, 2), { encoding: 'utf8', mode: 0o600 })
    }
  } catch (error) {
    console.warn('Unable to clear Copilot configuration.', error)
  }

  if (process.platform === 'win32') {
    try {
      const { stdout } = await execFileAsync('cmdkey', ['/list'], { windowsHide: true, timeout: 5000 })
      const targets = stdout
        .split(/\r?\n/)
        .map((line) => line.match(/Target:\s*(.*)/)?.[1]?.trim())
        .filter((target) => target?.toLowerCase().includes('copilot-cli'))
      for (const target of targets) {
        await execFileAsync('cmdkey', [`/delete:${target}`], { windowsHide: true, timeout: 5000 }).catch(() => {})
      }
    } catch {
      // Credential cleanup is best effort.
    }
  }
}

export async function stopCopilotService() {
  cancelDeviceFlow()
  await resetClient()
}
