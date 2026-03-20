export function textFromUnknown(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => textFromUnknown(item))
      .filter(Boolean)
      .join('\n');
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const preferredOrder = [
      'PROFESSIONAL SUMMARY',
      'CORE SKILLS',
      'PROFESSIONAL EXPERIENCE',
      'EDUCATION',
      'LANGUAGES',
      'CERTIFICATIONS',
      'VOLUNTEER EXPERIENCE',
      'AFFILIATIONS',
      'TARGET ROLE ALIGNMENT',
      'summary',
      'optimizedSkills',
      'improvedBullets',
      'rewrittenResume',
      'truthGuardNote'
    ];

    const keys = [
      ...preferredOrder.filter((key) => Object.prototype.hasOwnProperty.call(record, key)),
      ...Object.keys(record).filter((key) => !preferredOrder.includes(key))
    ];

    return keys
      .map((key) => {
        const raw = record[key];
        if (raw == null || raw === '') return '';

        if (Array.isArray(raw)) {
          const items = raw
            .flatMap((item) => {
              const rendered = textFromUnknown(item);
              return rendered ? rendered.split(/\n+/).filter(Boolean) : [];
            })
            .filter(Boolean)
            .map((item) => `• ${item}`)
            .join('\n');
          return items ? `${key.toUpperCase()}\n${items}` : '';
        }

        const rendered = textFromUnknown(raw);
        if (!rendered) return '';

        return preferredOrder.includes(key) && key === key.toUpperCase()
          ? `${key}\n${rendered}`
          : rendered;
      })
      .filter(Boolean)
      .join('\n\n');
  }

  return String(value);
}

export function stringListFromUnknown(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.map((item) => textFromUnknown(item)).filter(Boolean);
  const rendered = textFromUnknown(value);
  return rendered ? [rendered] : [];
}
