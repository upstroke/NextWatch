# 003 — Test Suite Audit

## Status

Completed

## Ziel

Wir entfernen unnötige Tests — nicht, um eine bestimmte Testzahl zu erreichen,
sondern weil Zod, TypeScript und die Integration-Tests einen Großteil der
Validierung bereits abdecken.

Das Ziel ist eine schlanke, wartbare Test-Suite mit hohem
Fehlererkennungswert. Coverage ist ein Sicherheitsnetz, kein Ziel.

## Prinzip

Ein Test bleibt nur bestehen, wenn er mindestens einen dieser Werte liefert:

- Er prüft unsere Geschäftslogik, nicht Zod- oder Framework-Verhalten.
- Er prüft Transformationslogik (String → Array, Defaults).
- Er prüft Cross-Field-Regeln (z. B. yearFrom ≤ yearTo).
- Er prüft Fehler-Mapping (Zod-Fehler → 400/502/503).
- Er prüft Service-Orchestrierung (Request-Verhalten, Language-Forwarding).
- Er prüft Mapper (Normalisierung, Optional-Fields).
- Er prüft HTTP-Vertrag (Status, Header, Serialisierung, Sanitizing).

Ein Test wird entfernt, wenn er nur Zod- oder Framework-Verhalten spiegelt.

## Ausgangslage

- 342 Tests insgesamt
- 326 Unit-Tests
- 16 Integration-Tests
- Statement Coverage: 98.14% (Ziel: mindestens 80%)
- Branch Coverage: 99.21% (optional, kein hartes Ziel)
- Testdauer: 640ms
- Typecheck: passed

## Findings

### 1. Schema-Tests: Zod-Verhalten wird getestet

Viele Schema-Tests prüfen Zod-Basisverhalten (falscher Typ, fehlendes Feld,
unbekannter Wert), das Zod bereits garantiert. Das ist redundant.

- Betroffene Dateien: tmdb-search, discover-query, locale, search, tmdb,
  tmdb-watch-providers, discover, runtime-config
- Gesamt: ~25 Tests, die nur Zod-Verhalten spiegeln

### 2. Handler-Tests: Invalid-Fälle duplizieren Integration

- Search-Routen: 4 Invalid-Query-Fälle pro Route (identischer Schema-Pfad)
- Watch-Provider-Routen: 4 Invalid-ID-Fälle + 5 Invalid-Region-Fälle pro Route
- Integration-Tests decken bereits 1 Invalid-Fall pro Route ab
- Gesamt: ~25 redundante Tests über 7 Handler-Dateien

### 3. Service-Tests: Cross-Layer-Duplikate

- discover.spec.ts: 6 Schema-Tests duplizieren Schema-Datei
- detail.spec.ts: 6 Schema-Tests duplizieren Schema-Datei
- tmdb-layers.spec.ts: 5 Error-Mapping-Tests duplizieren errors.spec.ts
- search.spec.ts: 5 Invalid-Fälle duplizieren Handler-Tests
- errors.spec.ts: 4 Recognition-Invalid-Fälle redundant
- Gesamt: ~25 redundante Tests über 5 Service-Dateien

### 4. Bereits optimal

- Integration-Tests: 16 Tests, 1-4 pro Endpoint-Gruppe, keine Redundanz
- Utils-Tests: 14 Tests, kompakt und präzise, keine Redundanz
- Service-Tests (watch-providers, discover-params, search-mappers): 17 Tests,
  reine Service-/Mapping-Logik, keine Redundanz
- Trending-Handler: 5 Tests, klar abgegrenzt, keine Redundanz
- Detail-Handler: 4 Tests, klar abgegrenzt, keine Redundanz

## Maßnahmenplan (nach ROI)

### Maßnahme 1: Schema-Tests radikal straffen (ROI: hoch)

- Betroffene Dateien: alle 8 Schema-Dateien
- Änderung: Nur Happy Path + Transform + Cross-Field behalten,
  Zod-Basisfälle (falscher Typ, fehlendes Feld, unbekannter Wert) entfernen
- Tests gespart: ~25
- Begründung: Zod garantiert diese Verhalten bereits

### Maßnahme 2: Handler-Invalid-Fälle auf 0-1 reduzieren (ROI: hoch)

- Betroffene Dateien: 7 Handler-Dateien
- Änderung: 4 Invalid-Query-Fälle → 0-1 Fall (Search),
  4 Invalid-ID + 5 Invalid-Region → 0-1+0-1 (Watch Providers)
- Tests gespart: ~25
- Begründung: Integration-Tests decken denselben Pfad ab

### Maßnahme 3: Service-Cross-Layer-Duplikate entfernen (ROI: hoch)

- Betroffene Dateien: discover.spec.ts, detail.spec.ts, tmdb-layers.spec.ts,
  search.spec.ts, errors.spec.ts
- Änderung: Schema-Tests in Service-Dateien entfernen,
  Error-Mapping-Duplikate entfernen,
  Search-Invalid-Fälle entfernen,
  Recognition-Invalid-Fälle reduzieren
- Tests gespart: ~25
- Begründung: Duplikate zu Schema-Dateien, errors.spec.ts, Handler-Tests

### Maßnahme 4: Nach jeder Runde Coverage prüfen

- Nach jeder Maßnahme: `pnpm test:coverage` ausführen
- Statement Coverage muss bei mindestens 80% bleiben
- Wenn Coverage deutlich über 80% bleibt, nächste Runde straffen
- Wenn Coverage nahe 80% kommt, stoppen

## Zusammenfassung

| Maßnahme | Tests gespart (ca.) | ROI |
|---|---:|---|
| 1. Schema-Tests radikal straffen | ~25 | Hoch |
| 2. Handler-Invalid-Fälle | ~25 | Hoch |
| 3. Service-Cross-Layer-Duplikate | ~25 | Hoch |
| **Summe** | **~75** | |

**Ergebnis:** 342 → ~265-270 Tests, ohne Abdeckung oder Fehlererkennung zu verlieren.
Die genaue Zahl ist nicht das Ziel — entscheidend ist, dass nur unnötige Tests entfernt werden.

## Vorgehen

1. Maßnahme 1 umsetzen: Schema-Tests radikal straffen
2. Coverage prüfen
3. Maßnahme 2 umsetzen: Handler-Invalid-Fälle reduzieren
4. Coverage prüfen
5. Maßnahme 3 umsetzen: Service-Cross-Layer-Duplikate entfernen
6. Coverage prüfen
7. Ergebnisse validieren: Tests, Coverage, Typecheck, Build

## Execution status

### Maßnahme 1: Schema-Tests radikal straffen — abgeschlossen

- 45 Tests entfernt.
- Betroffene Dateien: `tmdb-search.spec.ts`, `tmdb.spec.ts`,
  `tmdb-watch-providers.spec.ts`, `discover-query.spec.ts`,
  `discover.spec.ts`, `locale.spec.ts`, `runtime-config.spec.ts`,
  `search.spec.ts`.
- Entfernt wurden ausschließlich reine Zod-/Framework-Invalid-Fälle.
- Behalten wurden Happy Paths, Transformationen, projekt-spezifische Limits,
  Cross-Field-Regeln und die Non-Mutation-Regel.
- Coverage für alle betroffenen Schema-Quelldateien blieb bei 100%.

### Maßnahme 2: Handler-Invalid-Fälle reduzieren — abgeschlossen

- 26 Tests entfernt.
- Search-Handler: 32 → 20 Tests.
- Watch-Provider-Handler: 26 → 12 Tests.
- Je Route bleibt ein repräsentativer Invalid-Fall je unterschiedlicher
  Validierungsregel; die Upstream-Fehlerfälle bleiben erhalten.
- Coverage für alle geänderten Handler blieb bei 100%.

### Maßnahme 3: Service-Cross-Layer-Duplikate entfernen — abgeschlossen

- 22 Tests entfernt.
- `services/detail.spec.ts`: 15 → 9 Tests.
- `services/tmdb-layers.spec.ts`: 13 → 8 Tests.
- `services/tmdb/search.spec.ts`: 15 → 11 Tests.
- `services/errors.spec.ts`: 28 → 21 Tests.
- `services/discover.spec.ts`: 20 → 14 Tests; vier Schema-Fälle wurden in
  `schemas/discover.spec.ts` verschoben, das dort von 5 auf 9 Tests wuchs.
- Coverage für alle betroffenen Service- und Schema-Dateien blieb bei 100%.

### Gesamtergebnis

- 93 Tests entfernt.
- Coverage blieb in allen geprüften Bereichen bei 100%.
- Vollständige Validierung abgeschlossen:
  `pnpm test:coverage` stabil, `pnpm typecheck` bestanden mit Exit Code 0.

## Akzeptanzkriterien

- Audit ist datengestützt und nachvollziehbar.
- Jede Entfernung hat einen konkreten Befund (Zod-Verhalten, Duplikat, Brittle).
- Keine blinden Testlöschungen.
- Keine neuen Tests ohne klaren Fehlererkennungswert.
- Statement Coverage bleibt bei mindestens 80%.
- Keine Ziel-Testzahl — nur unnötige Tests werden entfernt.
