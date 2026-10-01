const fs = require('fs');
const path = require('path');
const os = require('os');

let app = null;
let safeStorage = null;
try {
  const electron = require('electron');
  app = electron.app || null;
  safeStorage = electron.safeStorage || null;
} catch (e) {}

/**
 * Editor settings in <userData>/editor-settings.json.
 * The OpenAI API key is encrypted with the OS keychain (safeStorage) and never
 * sent to the renderer – the renderer only learns whether a key is set.
 */

const DEFAULT_MODEL = 'gpt-4o-mini';

const getUserDataDir = () => {
  if (app && typeof app.getPath === 'function') {
    try {
      return app.getPath('userData');
    } catch (e) {}
  }
  const roaming = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming');
  return path.join(roaming, 'easyaihub-video-editor');
};

const settingsFile = () => path.join(getUserDataDir(), 'editor-settings.json');

function isEncryptionAvailable() {
  try {
    return Boolean(safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable());
  } catch {
    return false;
  }
}

function readRaw() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch {
    return {};
  }
}

function writeRaw(data) {
  try {
    fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
    fs.writeFileSync(settingsFile(), JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.warn('[SettingsStore] Failed to write settings:', e.message);
  }
}

function getOpenAIKey() {
  const raw = readRaw();
  if (!raw.openaiKey) return null;
  try {
    if (raw.openaiKeyEncrypted && isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(raw.openaiKey, 'base64'));
    }
    return raw.openaiKeyEncrypted ? null : raw.openaiKey;
  } catch {
    return null;
  }
}

function getPublicSettings() {
  const raw = readRaw();
  return {
    hasOpenAIKey: !!getOpenAIKey(),
    openaiModel: raw.openaiModel || DEFAULT_MODEL,
    encryptionAvailable: isEncryptionAvailable(),
  };
}

function updateSettings({ openaiKey, openaiModel } = {}) {
  const raw = readRaw();
  if (typeof openaiKey === 'string') {
    const key = openaiKey.trim();
    if (!key) {
      delete raw.openaiKey;
      delete raw.openaiKeyEncrypted;
    } else if (isEncryptionAvailable()) {
      raw.openaiKey = safeStorage.encryptString(key).toString('base64');
      raw.openaiKeyEncrypted = true;
    } else {
      raw.openaiKey = key;
      raw.openaiKeyEncrypted = false;
    }
  }
  if (typeof openaiModel === 'string' && openaiModel.trim()) {
    raw.openaiModel = openaiModel.trim();
  }
  writeRaw(raw);
  return getPublicSettings();
}

module.exports = { getOpenAIKey, getPublicSettings, updateSettings, DEFAULT_MODEL };
