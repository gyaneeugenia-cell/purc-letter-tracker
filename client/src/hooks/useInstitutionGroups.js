import { useEffect, useState } from 'react';
import { http } from '../api/http.js';
import { institutionGroups } from '../constants/institutions.js';

// Returns the built-in institution groups plus a "Previously used" group holding
// any institution someone typed in via "Other". Those are read back from the
// saved records, so a one-off name entered today is selectable from the list
// afterwards. Falls back to the built-in list if the request fails.
export function useInstitutionGroups(refreshKey = 0) {
  const [groups, setGroups] = useState(institutionGroups);

  useEffect(() => {
    let active = true;
    http.get('/institutions')
      .then(({ data }) => {
        if (!active) return;
        const custom = Array.isArray(data?.custom) ? data.custom : [];
        setGroups(custom.length
          ? [...institutionGroups, { label: 'Previously used', options: custom }]
          : institutionGroups);
      })
      .catch(() => { /* keep the built-in list */ });
    return () => { active = false; };
  }, [refreshKey]);

  return groups;
}
