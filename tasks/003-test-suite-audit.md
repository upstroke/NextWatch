# 003 — Test Suite Audit

## Status

In Progress

## Ziel

Wir prüfen die aktuelle Test-Suite nicht nach der Anzahl der Tests,
sondern nach ihrem tatsächlichen Wert: Fehlererkennung, Wartbarkeit,
Redundanz und Schutz vor Regressionen.

Das Ziel ist eine schlanke, wartbare Test-Suite mit hohem
Fehlererkennungswert — nicht maximale Testanzahl.

## Ausgangslage

- 342 Tests insgesamt
- 326 Unit-Tests
- 16 Integration-Tests
- Keine UI-Tests bisher
- Test-Stack: Vitest, Playwright, Zod
- Produktionscode und Testcode müssen im Audit quantifiziert werden
- Aktuelle Coverage-Zahlen müssen im Audit erhoben werden
- Coverage-Ziel: mindestens 80% Statement Coverage
- Branch Coverage wird mitgenommen, ist aber kein separates hartes Ziel

## Ist-Zustand

- 342 Tests (326 Unit, 16 Integration)
- 30 Unit-Testdateien
- 5 Integration-Testdateien
- Statement Coverage: 98.14%
- Branch Coverage: 99.21%
- Function Coverage: 100%
- Testdauer: 640ms
- Typecheck: passed

## Findings

### 1. Handler-Tests: Hohe Redundanz

- Search-Routen: 4 Invalid-Query-Fälle pro Route (identischer Schema-Pfad)
- Watch-Provider-Routen: 4 Invalid-ID-Fälle + 5 Invalid-Region-Fälle pro Route
- Gesamt: 29 redundante Tests über 7 Handler-Dateien
- Betroffene Dateien: search-movie, search-tv, search-multi, search-person,
  search-keyword, movie-watch-providers, tv-watch-providers

### 2. Service-Tests: Cross-Layer-Duplikate

- discover.spec.ts: 6 Schema-Tests duplizieren tests/unit/schemas/discover.spec.ts
- detail.spec.ts: 6 Schema-Tests duplizieren tests/unit/schemas/tmdb-detail.spec.ts
- tmdb-layers.spec.ts: 5 Error-Mapping-Tests duplizieren errors.spec.ts
- search.spec.ts: 5 Invalid-Fälle duplizieren Handler-Tests
- errors.spec.ts: 4 Recognition-Invalid-Fälle redundant
- Gesamt: 25 redundante Tests über 5 Service-Dateien

### 3. Schema-Tests: Leichte Redundanz

- discover-query.spec.ts: 3 Tests pro ID-Feld (Comma, Single, Array)
- "Single" ist Spezialfall von Comma-String
- Gesamt: 3 redundante Tests in 1 Schema-Datei

### 4. Bereits optimal

- Integration-Tests: 16 Tests, 1-4 pro Endpoint-Gruppe, keine Redundanz
- Utils-Tests: 14 Tests, kompakt und präzise, keine Redundanz
- Service-Tests (watch-providers, discover-params, search-mappers): 17 Tests,
  reine Service-/Mapping-Logik, keine Redundanz
- Trending-Handler: 5 Tests, klar abgegrenzt, keine Redundanz
- Detail-Handler: 4 Tests, klar abgegrenzt, keine Redundanz

## Maßnahmenplan (nach ROI)

### Maßnahme 1: Handler-Invalid-Fälle straffen (ROI: hoch)

- Betroffene Dateien: 7 Handler-Dateien
- Änderung: 4 Invalid-Query-Fälle → 1 Fall (Search),
  4 Invalid-ID + 5 Invalid-Region → 1+1 (Watch Providers)
- Tests gespart: 30
- Ergebnis: 67 → 37 Tests in Handler-Dateien

### Maßnahme 2: Cross-Layer-Schema-Duplikate entfernen (ROI: hoch)

- Betroffene Dateien: discover.spec.ts, detail.spec.ts
- Änderung: 6 Schema-Tests pro Datei entfernen
- Tests gespart: 12
- Ergebnis: 34 → 22 Tests in Service-Dateien

### Maßnahme 3: Error-Mapping- und Search-Invalid-Duplikate entfernen (ROI: mittel)

- Betroffene Dateien: errors.spec.ts, tmdb-layers.spec.ts, search.spec.ts
- Änderung: 4 Recognition-Invalid-Fälle sparen (errors),
  5 Error-Mapping-Tests entfernen (layers),
  4 Invalid-Fälle entfernen (search)
- Tests gespart: 13
- Ergebnis: 56 → 43 Tests in Service-Dateien

### Maßnahme 4: discover-query ID-Fälle straffen (ROI: niedrig)

- Betroffene Datei: discover-query.spec.ts
- Änderung: 3 Tests pro ID-Feld → 2 Tests
- Tests gespart: 3
- Ergebnis: 20 → 17 Tests in Schema-Datei

## Zusammenfassung

| Maßnahme | Tests gespart | ROI |
|---|---:|---|
| 1. Handler-Invalid-Fälle | 30 | Hoch |
| 2. Cross-Layer-Schema-Duplikate | 12 | Hoch |
| 3. Error-Mapping-/Search-Invalid-Duplikate | 13 | Mittel |
| 4. discover-query ID-Fälle | 3 | Niedrig |
| **Summe** | **58** | |

**Ergebnis:** 342 → 284 Tests, ohne Abdeckung oder Fehlererkennung zu verlieren.

## Vorgehen

1. Maßnahme 1 umsetzen: Handler-Invalid-Fälle straffen
2. Maßnahme 2 umsetzen: Cross-Layer-Schema-Duplikate entfernen
3. Maßnahme 3 umsetzen: Error-Mapping- und Search-Invalid-Duplikate entfernen
4. Maßnahme 4 umsetzen: discover-query ID-Fälle straffen
5. Ergebnisse validieren: Tests, Coverage, Typecheck, Build

## Akzeptanzkriterien

- Audit ist datengestützt und nachvollziehbar.
- Jede Empfehlung hat einen konkreten Befund und eine Begründung.
- Redundanzen sind explizit benannt.
- Maßnahmen sind priorisiert.
- Keine blinden Testlöschungen.
- Keine neuen Tests ohne klaren Fehlererkennungswert.
- Nach Umsetzung: 284 Tests, gleiche oder bessere Fehlererkennung.
