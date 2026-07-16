import { Router } from 'express';
import { letters } from '../../utils/sampleData.js';
import { knownInstitutionNames } from '../../utils/institutions.js';

export const institutionsRouter = Router();

const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

// Returns ONLY the institution names a user actually typed in under "Other".
// Those are stored on the letter as `customInstitution`, so nothing else — no
// people's names, no directorates, no internal offices — can leak into the list.
institutionsRouter.get('/', (req, res) => {
  const builtIn = new Set(knownInstitutionNames().map((name) => name.toLowerCase()));
  const seen = new Map();

  letters.forEach((letter) => {
    const name = normalize(letter.customInstitution);
    if (!name) return;
    // Must be real wording, and not something already in the built-in list.
    if ((name.match(/[A-Za-z]/g) || []).length < 2) return;
    const key = name.toLowerCase();
    if (builtIn.has(key) || seen.has(key)) return;
    seen.set(key, name);
  });

  const custom = [...seen.values()].sort((a, b) => a.localeCompare(b));
  res.json({ custom, total: custom.length });
});
