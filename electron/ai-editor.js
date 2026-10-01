/**
 * Asks an OpenAI chat model to act as the video editor: for every scene it
 * picks camera motion, transition, color grade, sound effect, emphasis words and
 * optional on-screen text. The answer is forced into a strict JSON schema whose
 * enums are the template ids the editor actually supports, so the renderer can
 * apply it without guessing.
 */

const OPENAI_URL = 'https://api.openai.com/v1';
const REQUEST_TIMEOUT_MS = 180000;

const EFFECT_BOOSTS = ['none', 'vignette', 'filmGrain', 'lightLeak', 'vhs', 'glitch', 'oldFilm', 'flicker'];

function buildSchema(options) {
  const str = (enumValues) => ({ type: 'string', enum: enumValues });
  return {
    type: 'object',
    additionalProperties: false,
    required: ['video_title', 'title_subtitle', 'caption_template', 'scenes'],
    properties: {
      video_title: { type: 'string', description: 'Short, catchy intro title (max 6 words), same language as the narration' },
      title_subtitle: { type: 'string', description: 'Optional small line under the title, or empty string' },
      caption_template: str(options.captionTemplates),
      scenes: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: [
            'index',
            'motion',
            'transition_in',
            'color_filter',
            'sfx',
            'overlay_text',
            'overlay_template',
            'emphasis_words',
            'effect_boost',
          ],
          properties: {
            index: { type: 'integer' },
            motion: str(options.motions),
            transition_in: str(options.transitions),
            color_filter: str(options.colorFilters),
            sfx: str([...options.sfx, 'none']),
            overlay_text: { type: 'string', description: 'Max 5 words of on-screen text for a key moment, or empty string' },
            overlay_template: str(options.titleTemplates),
            emphasis_words: { type: 'array', items: { type: 'string' }, description: '0-3 important words taken from this scene narration' },
            effect_boost: str(EFFECT_BOOSTS),
          },
        },
      },
    },
  };
}

function buildMessages({ style, scenes, title, sfxHints }) {
  const system = [
    'You are a senior YouTube video editor working for faceless automation channels.',
    'You receive the narration of a video split into scenes (each scene shows one image or clip while the voiceover plays).',
    'Decide the edit for every scene so the video feels professional and keeps viewers watching.',
    '',
    'Rules:',
    '- Follow the STYLE RECIPE. Prefer its transitions, motions and color grade; only deviate when a scene clearly needs it.',
    '- Vary camera motion between neighbouring scenes; never repeat the same motion 3 times in a row.',
    '- transition_in of scene 0 is how the video opens.',
    '- Use sound effects with purpose and follow the recipe frequency. Use "none" when nothing fits. Big impacts only on real reveals.',
    '- overlay_text: only for key moments (a number, a name, a date, a shocking fact). At most one overlay every 4 scenes. Max 5 words. Otherwise "".',
    '- emphasis_words: 0-3 words copied exactly from that scene\'s narration that deserve highlight in the captions (numbers, names, strong words).',
    '- effect_boost: extra effect for dramatic moments only, otherwise "none".',
    '- Write video_title and overlay_text in the same language as the narration.',
    '- Return exactly one entry per scene, with the same index values you were given.',
  ].join('\n');

  const recipe = {
    style: style.name,
    description: style.description,
    preferred_transitions: style.transitions,
    preferred_motions: style.motions,
    color_filter: style.colorFilter,
    caption_template: style.captionTemplate,
    sfx_on_cut: style.sfxOnCut,
    sfx_frequency: style.sfxOnCut ? `about every ${style.sfxEveryNthCut} cut(s)` : 'rarely',
    overlay_template: style.overlayTemplate,
  };

  const user = [
    `VIDEO TOPIC: ${title}`,
    '',
    `STYLE RECIPE: ${JSON.stringify(recipe)}`,
    '',
    `SOUND EFFECTS AVAILABLE: ${sfxHints}`,
    '',
    'SCENES:',
    ...scenes.map(
      (s) =>
        `[${s.index}] (${s.seconds.toFixed(1)}s) ${s.text.slice(0, 400)}${s.visual ? `  | visual: ${s.visual.slice(0, 160)}` : ''}`
    ),
  ].join('\n');

  return [
    { role: 'system', content: system },
    { role: 'user', content: user },
  ];
}

async function openaiFetch(apiKey, pathName, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${OPENAI_URL}${pathName}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      // non-JSON error body
    }
    if (!res.ok) {
      const message = json?.error?.message || text.slice(0, 300) || res.statusText;
      if (res.status === 401) throw new Error(`AI API key is invalid (401). ${message}`);
      if (res.status === 429) throw new Error(`AI rate limit or balance reached (429). ${message}`);
      if (res.status === 404) throw new Error(`AI model not found (404). Check the model name in Settings. ${message}`);
      throw new Error(`AI error ${res.status}: ${message}`);
    }
    return json;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('AI request timed out.');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function testConnection(apiKey, model) {
  if (!apiKey) throw new Error('No AI API key saved.');
  await openaiFetch(apiKey, `/models/${encodeURIComponent(model)}`);
  return true;
}

/**
 * @param {object} request { style, scenes: [{index, text, visual, seconds}], title, options, sfxHints }
 */
async function planEdit(apiKey, model, request) {
  if (!apiKey) throw new Error('No AI API key saved. Add it in Settings.');
  const schema = buildSchema(request.options);
  const json = await openaiFetch(apiKey, '/chat/completions', {
    model,
    messages: buildMessages(request),
    response_format: {
      type: 'json_schema',
      json_schema: { name: 'video_edit_plan', strict: true, schema },
    },
  });

  const choice = json?.choices?.[0];
  if (choice?.message?.refusal) throw new Error(`The model refused: ${choice.message.refusal}`);
  const content = choice?.message?.content;
  if (!content) throw new Error('AI returned an empty response.');
  try {
    return { plan: JSON.parse(content), usage: json.usage || null, model: json.model || model };
  } catch {
    throw new Error('AI returned an invalid response.');
  }
}

module.exports = { planEdit, testConnection };
