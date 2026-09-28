const fs = require('fs');
const path = require('path');
const { app, safeStorage } = require('electron');

/**
 * Editor settings in <userData>/editor-settings.json.
 * The OpenAI API key is encrypted with the OS keychain (safeStorage) and never
 * sent to the renderer – the renderer only learns whether a key is set.
 */

const DEFAULT_MODEL = 'gpt-4.1-mini';

const settingsFile = () => path.join(app.getPath('userData'), 'editor-settings.json');

function readRaw() {
  try {
    return JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
  } catch {
    return {};
  }
}

function writeRaw(data) {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(data, null, 2), 'utf8');
}

function getOpenAIKey() {
  const raw = readRaw();
  if (!raw.openaiKey) return null;
  try {
    if (raw.openaiKeyEncrypted && safeStorage.isEncryptionAvailable()) {
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
    encryptionAvailable: safeStorage.isEncryptionAvailable(),
  };
}

function updateSettings({ openaiKey, openaiModel } = {}) {
  const raw = readRaw();
  if (typeof openaiKey === 'string') {
    const key = openaiKey.trim();
    if (!key) {
      delete raw.openaiKey;
      delete raw.openaiKeyEncrypted;
    } else if (safeStorage.isEncryptionAvailable()) {
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
