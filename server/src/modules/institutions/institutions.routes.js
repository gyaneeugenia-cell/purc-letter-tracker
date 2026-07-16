import { Router } from 'express';
import { letters } from '../../utils/sampleData.js';
import { knownInstitutionNames } from '../../utils/institutions.js';

export const institutionsRouter = Router();

const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();

// Institutions typed in via "Other" are stored on the letters themselves, so any
// name that is not part of the built-in list is returned here. The register and
// search dropdowns append these under "Previously used", which means a one-off
// institution entered today is selectable from the list tomorrow.
institutionsRouter.get('/', (req, res) => {
  const builtIn = new Set(knownInstitutionNames().map((name) => name.toLowerCase()));
  const seen = new Map();

  letters.forEach((letter) => {
    [letter.senderOrganization, letter.recipient].forEach((raw) => {
      const name = normalize(raw);
      if (!name) return;
      const key = name.toLowerCase();
      if (builtIn.has(key) || seen.has(key)) return;
      seen.set(key, name);
    });
  });

  const custom = [...seen.values()].sort((a, b) => a.localeCompare(b));
  res.json({ custom, total: custom.length });
});
