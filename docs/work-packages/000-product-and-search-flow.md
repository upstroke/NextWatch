# NextWatch — Produktziel und Suchfluss

## Zielsetzung

NextWatch ist eine kontrollierte Film- und Seriensuche mit einem lokalen LLM als semantischem Parser.

Der Nutzer beschreibt einen Suchwunsch in natürlicher Sprache. Das LLM übersetzt diese Eingabe in einen strukturierten Vorschlag für Filteränderungen oder meldet Klärungsbedarf. Die Anwendung validiert den Vorschlag, berechnet fachliche Folgen, ruft TMDb auf und zeigt die Ergebnisse an.

Das LLM ist kein autonomer Agent. Es wählt keine TMDb-Endpunkte aus, führt keine Suchketten aus, bewertet keine Treffer und formuliert keine freien Ergebnisantworten.

## Grundprinzip

Die Verantwortlichkeiten sind klar getrennt:

1. Der Nutzer sendet Freitext.
2. Das LLM erzeugt einen strukturierten Vorschlag.
3. Zod und Guardrails validieren den Vorschlag.
4. Die Anwendungslogik berechnet den nächsten gültigen Suchzustand.
5. Die Anwendung führt gegebenenfalls TMDb-Lookups aus.
6. Die Anwendung ruft Discover auf.
7. Die Anwendung zeigt Ergebnisse, Filter-Pillen und Statusmeldungen an.

Das LLM darf niemals unvalidierte IDs, Endpoints oder Parameter ausführen.

## Begriffsabgrenzung

### Trending

Trending ist der Startmodus der Anwendung.

Ohne konkrete URL-Kriterien zeigt NextWatch die wöchentlichen Trends für Filme und Serien. Dieser Modus benötigt keinen LLM-Aufruf.

Trending ist keine gefilterte Suche. Sobald der Nutzer individuelle Kriterien nennt, wechselt die Anwendung nach definierten Regeln in den Discover-Modus.

### Discover

Discover ist die eigentliche Ergebnissuche.

Discover erhält konkrete Filter wie Medientyp, Genre, Personen-IDs, Keyword-IDs, Bewertung und Jahresbereich. Die Anwendung ruft entweder den Movie- oder den TV-Discover-Endpoint auf.

Discover liefert die Ergebnisliste. Er entscheidet nicht über den Suchzustand, Filterkompatibilität oder den Übergang vom Trending-Modus.

### Search-Domäne

`search` bezeichnet nicht einen zusätzlichen HTTP-Endpoint, sondern die fachliche Logik für den Suchzustand.

Die künftige Search-Domäne unter `src/lib/domain/search` verwaltet:

- den aktiven Suchzustand,
- aktive Filter,
- inaktive Rückkehrwerte,
- den aktuellen Modus,
- die Revision,
- Kompatibilitätsregeln zwischen Filtern,
- Übergänge zwischen Trending und Discover.

Die Search-Domäne entscheidet, welche Discover-Abfrage als nächstes ausgeführt wird. Discover führt die Abfrage aus.

### Personen-Lookup

Personen sind kein eigener Discover-Modus.

Ein Personenname wird zunächst über die Personensuche in eine TMDb-`personId` aufgelöst. Diese ID wird anschließend als Discover-Filter verwendet.

```text
"Brad Pitt"
  → Personensuche
  → personId
  → Discover mit personIds
```

Bei mehreren plausiblen Treffern bleibt die bestehende Suche unverändert. Die Anwendung zeigt eine vorbereitete Rückfrage mit definierten Optionen an.

### Keyword-Lookup

Keywords sind ebenfalls kein eigener Discover-Modus.

Ein Begriff wird zunächst über die Keyword-Suche in eine TMDb-`keywordId` aufgelöst. Diese ID wird anschließend als Discover-Filter verwendet.

```text
"Zeitreise"
  → Keyword-Suche
  → keywordId
  → Discover mit keywordIds
```

Eine Keyword-ID darf nur verwendet werden, wenn sie zuvor über die Keyword-Suche ermittelt und serverseitig als bekannt markiert wurde. Das Modell darf keine Keyword-IDs raten.

### Multi-Search

Der Multi-Endpoint dient der Titel-Disambiguierung.

Er durchsucht Filme, Serien und Personen gleichzeitig. Er wird verwendet, wenn ein Nutzer einen Titel nennt und unklar ist, ob ein Film, eine Serie oder eine Person gemeint ist.

Der Multi-Endpoint ist kein Ersatz für Discover und kein Bestandteil des gefilterten Discover-Flows.

## Mehrdeutigkeit und Klärung

Bei wesentlicher Mehrdeutigkeit setzt die Anwendung den Status `needsClarification`.

Dabei gilt:

- Die bestehende Suche bleibt unverändert.
- Die Anwendung zeigt eine vorbereitete Frage an.
- Die Frage enthält definierte Optionen.
- Der Nutzer wählt eine Option.
- Erst nach der Auswahl wird der Suchzustand geändert.
- Erst danach wird gegebenenfalls eine neue Discover-Abfrage ausgelöst.

Nicht unterstützte Wünsche erhalten den Status `unsupported`. Die Anwendung erfindet keine Ersatzfilter und startet keine alternativen Suchketten.

## Detailansicht

Die Detailansicht lädt Basisinformationen zu einem Film oder einer Serie.

Watch-Providers sind ein separater Endpoint und kein Teil des Basis-Detailabrufs. Reviews und Similar Titles gehören zur späteren B10-Ausbaustufe und sind nicht Teil des MVP-Suchkerns.

## Architektur-Grenzen

- TMDb-Aufrufe erfolgen ausschließlich über Nitro-Server-Routen.
- Der Client ruft TMDb nicht direkt auf.
- API-Keys bleiben im Server.
- Zod ist die Single Source of Truth für Datenverträge.
- TypeScript-Typen werden über `z.infer` abgeleitet.
- Services erhalten explizite Dependencies.
- Die Search-Domäne enthält reine Logik ohne Netzwerkzugriff.
- Es gibt keine agentischen Suchabläufe, Modell-Tool-Loops oder automatische Retry-Ketten.

## Offene Umsetzung

Der aktuelle `main`-Stand enthält bereits:

- Trending,
- Movie-, TV-, Multi-, Personen- und Keyword-Suche,
- Movie- und TV-Discover,
- Movie- und TV-Details,
- Movie- und TV-Watch-Providers.

Noch nicht vorhanden ist der kontrollierte Suchfluss:

- LLM-Parser-Endpunkt,
- strukturierter Parser-Vertrag,
- Guardrails,
- Search-Domäne mit Reducer,
- Klärungsflow,
- Verbindung von Personen- und Keyword-Lookups zu Discover,
- Übergang von Trending zu Discover.

Diese Lücken sind Grundlage für die folgenden Umsetzungstasks.
