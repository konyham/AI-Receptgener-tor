import { AppCommand, AppView, FormCommand, VoiceCommand, VoiceCommandResult } from '../types';

// A map of keywords to their corresponding navigation targets.
const navTargets: Record<string, AppView> = {
  'generátor': 'generator',
  'generátorhoz': 'generator',
  'kedvencek': 'favorites',
  'kedvencekhez': 'favorites',
  'mentett receptek': 'favorites',
  'mentett receptekhez': 'favorites',
  'bevásárlólista': 'shopping-list',
  'bevásárlólistára': 'shopping-list',
  'bevásárlólistához': 'shopping-list',
  'kamra': 'pantry',
  'kamrába': 'pantry',
  'kamrát': 'pantry',
  'felhasználók': 'users',
  'felhasználókhoz': 'users',
};

// A map of simple phrases/regex to specific commands.
const simpleCommands: { regex: RegExp; command: AppCommand }[] = [
    { regex: /\b(görgess le|lejjebb|lapozz le)\b/, command: { action: 'scroll_down', payload: null } },
    { regex: /\b(görgess fel|feljebb|lapozz fel)\b/, command: { action: 'scroll_up', payload: null } },
    { regex: /\b(ugorj|menj)\s*(?:a|az)\s+(oldal|lap)\s+(tetejére|elejére)\b/, command: { action: 'scroll_top', payload: null } },
    { regex: /\b(ugorj|menj)\s*(?:a|az)\s+(oldal|lap)\s+(aljára|végére)\b/, command: { action: 'scroll_bottom', payload: null } },
    { regex: /\b(töröl|töröld)\s*(?:a|az)\s+kipipáltakat\b/, command: { action: 'clear_checked_shopping_list', payload: null } },
    { regex: /\b(töröl|töröld)\s*(?:a|az)\s+(egész|teljes)\s+listát\b/, command: { action: 'clear_all_shopping_list', payload: null } },
];

/**
 * Interprets a voice transcript for simple, local commands without an API call.
 * This is faster and reduces API quota usage.
 * @param transcript The user's voice command.
 * @returns An AppCommand object if a local match is found, otherwise null.
 */
export const interpretLocalAppCommand = (transcript: string): AppCommand | null => {
  const lowerTranscript = transcript.toLowerCase().trim();

  // Check for direct navigation target match first for robustness
  if (navTargets[lowerTranscript]) {
    return { action: 'navigate', payload: navTargets[lowerTranscript] };
  }

  // Check for simple, direct commands.
  for (const { regex, command } of simpleCommands) {
    if (regex.test(lowerTranscript)) {
      return command;
    }
  }

  // Check for navigation commands with a verb (e.g., "menj a kedvencekhez").
  const navMatch = lowerTranscript.match(/\b(menj|irány|mutasd|nyisd meg|navigálj)\s*(?:a|az)\s+(.+)/);
  if (navMatch && navMatch[2]) {
    const target = navMatch[2].trim();
    if (navTargets[target]) {
      return { action: 'navigate', payload: navTargets[target] };
    }
  }

  // If no local command matches, return null to indicate fallback to Gemini.
  return null;
};

export const interpretLocalFormCommand = (transcript: string): FormCommand | null => {
    const lower = transcript.toLowerCase().trim();
    const generateKeywords = ["generálj", "készítsd el", "jöhet a recept", "receptet kérek", "csinálj receptet"];

    if (generateKeywords.some(kw => lower.includes(kw))) {
        return { action: 'generate_recipe', payload: null };
    }

    return null;
};

const recipeCommands: { keywords: string[], command: VoiceCommand }[] = [
    { keywords: ["következő", "tovább", "menjünk tovább", "lapozz"], command: VoiceCommand.NEXT },
    { keywords: ["előző", "vissza", "menjünk vissza"], command: VoiceCommand.PREVIOUS },
    { keywords: ["ismételd", "olvasd újra", "mondd újra"], command: VoiceCommand.REPEAT },
    { keywords: ["állj", "leállítás", "bezárás", "elég", "vissza"], command: VoiceCommand.STOP },
    { keywords: ["olvasd a bevezetőt", "mi ez a recept", "mutasd be"], command: VoiceCommand.READ_INTRO },
    { keywords: ["olvasd a hozzávalókat", "mik a hozzávalók"], command: VoiceCommand.READ_INGREDIENTS },
    { keywords: ["főzés indítása", "főzés mód", "kezdjük a főzést"], command: VoiceCommand.START_COOKING },
];

export const interpretLocalRecipeCommand = (transcript: string): VoiceCommandResult | null => {
    const lower = transcript.toLowerCase().trim();
    
    // Check for START_TIMER first, as it's more complex
    const timerMatch = lower.match(/(?:indíts|állíts be) (?:egy\s+)?(\d+)\s+(másodperces|perces|órás)/);
    if (timerMatch) {
        const value = parseInt(timerMatch[1], 10);
        const unit = timerMatch[2];
        const payload: { hours?: number; minutes?: number; seconds?: number } = {};
        if (unit.startsWith('másodperc')) payload.seconds = value;
        if (unit.startsWith('perc')) payload.minutes = value;
        if (unit.startsWith('órás')) payload.hours = value;
        return { command: VoiceCommand.START_TIMER, payload };
    }

    // Check for simple keyword commands
    for (const { keywords, command } of recipeCommands) {
        if (keywords.some(kw => lower.includes(kw))) {
            return { command, payload: undefined };
        }
    }

    return null;
};