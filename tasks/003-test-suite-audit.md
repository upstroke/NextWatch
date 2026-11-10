# 003 — Test Suite Audit

## Status

Planned

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

## Audit-Fragen

1. Ist die aktuelle Testanzahl angemessen, aufgebläht oder unzureichend?
2. Ist die Verteilung zwischen Unit- und Integration-Tests sinnvoll?
3. Welche Tests erzeugen Schein-Coverage?
4. Welche Tests sind redundant?
5. Welche Tests sind brittle und brechen bei Refactorings unnötig?
6. Welche Bereiche brauchen mehr Tests, welche weniger?
7. Welche Tests sollten gelöscht, zusammengeführt oder umgeschrieben werden?

## Bewertungskriterien

### 1. Test-to-Code Ratio & Balance

- Testumfang relativ zum Funktionsumfang bewerten, nicht nur zur LOC-Zahl.
- Verteilung zwischen Unit- und Integration-Tests im Kontext der Architektur bewerten.
- Prüfen, ob die Suite eher Test-Pyramide oder Test-Trophy entspricht.
- Risikolage berücksichtigen: externe TMDb-Grenze, HTTP-Vertrag, Fehlerpfade.

### 2. Coverage Health

- Statement Coverage ist das verbindliche Qualitätsziel.
- Branch Coverage ist optional und kein Selbstzweck.
- Schein-Coverage identifizieren: Tests, die Code ausführen, aber keine
  Geschäftsregel, keinen Fehlerpfad oder kein Edge-Case absichern.
- Bewerten, welche Bereiche stärker getestet werden sollten:
  Services, Mapper, Fehlerpfade.
- Bewerten, welche Bereiche schwächer getestet werden sollten:
  reine Schemas, Boilerplate.
- Prüfen, ob Coverage-Intent-Kommentare zum tatsächlichen Testinhalt passen.

### 3. Maintenance Overhead

- Brittle Tests identifizieren: Tests, die bei Refactorings brechen,
  weil sie Implementierungsdetails statt Verhalten prüfen.
- Duplikate zwischen Unit-Handler-Tests und HTTP-Integration-Tests finden.
- Mock-Aufwand, Fixture-Wiederverwendung und Test-Laufzeit bewerten.

### 4. Maßnahmenplan

- Top 3 Maßnahmen nach ROI: Fehlererkennung pro Wartungsaufwand.
- Klare Unterscheidung: löschen, zusammenführen, umschreiben, neu hinzufügen.
- Kein Default „mehr Tests“.
- Straffung priorisieren, wenn Redundanz vorliegt.

## Vorgehen

1. Ist-Zustand erheben: Testanzahl, LOC, Coverage, Laufzeit.
2. Testdateien kategorisieren: Schema, Service, Mapper, Handler, Integration.
3. Redundanzen identifizieren.
4. Schein-Coverage identifizieren.
5. Brittle Tests identifizieren.
6. Maßnahmen planen.
7. Maßnahmen umsetzen.
8. Ergebnisse validieren: Tests, Coverage, Typecheck, Build.

## Akzeptanzkriterien

- Audit ist datengestützt und nachvollziehbar.
- Jede Empfehlung hat einen konkreten Befund und eine Begründung.
- Redundanzen sind explizit benannt.
- Maßnahmen sind priorisiert.
- Keine blinden Testlöschungen.
- Keine neuen Tests ohne klaren Fehlererkennungswert.
