# NextWatch — Produktziel und Suchfluss

## Specification

### Zielsetzung und Ablauf

NextWatch ist eine einfache, kontrollierte Film- und Seriensuche mit einem LLM als semantischem Parser. Das Modell schlägt strukturierte Änderungen vor; die Anwendung validiert, klärt und führt aus. Es erfindet keine Provider-IDs, wählt keine Endpunkte und steuert keine autonomen Suchketten.

1. Nutzer beschreibt oder verändert einen Suchwunsch.
2. Parser schlägt Kriterien und aufzulösende Begriffe vor.
3. Anwendung validiert und aktualisiert den vorhandenen allgemeinen Suchzustand über Domain-Funktionen.
4. Serverseitige Hilfsfunktionen lösen Personen/Keywords auf; notwendige Entscheidungen werden über die Klärungslogik vorbereitet. UI-Integration bleibt gesonderte Arbeit.
5. Nutzer prüft den geklärten Wunsch und bestätigt die ausführbare Suche ausdrücklich. Offene oder nicht unterstützte Anforderungen dürfen nicht stillschweigend entfallen.
6. Server leitet Movie-/TV-Anfragen ab, führt benötigte Aufrufe aus und liefert einheitliche Ergebnisse.

Die letzte Klärungsantwort startet keine automatische Suche. Natürlichsprachliche Filterwünsche werden nicht unverändert an TMDb Search weitergereicht.

### Ein allgemeiner Suchzustand

`SearchState` aus [WP 009](009-search-state-and-filter-catalog.md) bleibt die maßgebliche Quelle: `filters` enthält unterstützte Kriterien einschließlich Medientyp, `people` bestätigte ID/Name-Paare, `pendingQueries` offene referenzierte Anfragen, `inactiveGenres` erinnerte Genre-Wünsche und `revision` den Änderungsstand. Technische Personen-IDs werden abgeleitet, nicht doppelt gespeichert.

Parser-Vorschlag, Zustand und Provider-Parameter haben verschiedene Aufgaben, sind aber keine unabhängig gepflegten Suchentwürfe. Bestätigte Kriterien und offene Wünsche bleiben unterscheidbar. Zuletzt ausgeführte Anfrage/Ergebnisse bleiben vom bearbeiteten Entwurf getrennt. Alte Ergebnisse dürfen nicht als neue Treffer erscheinen.

### Technische Referenzobjekte und Medienwechsel

Movie-/TV-Referenzobjekte beschreiben abgeleitete, validierte technische Zielformen. Gemeinsame Felder werden nur bei gleicher Bedeutung/Validierung geteilt; medienspezifische Felder bleiben explizit. [WP 012](012-search-execution-and-discover.md) definiert die Zuordnung von Jahren, Genres, Keywords, Personen, Bewertung und unterstützter Sortierung ohne Kriterienverlust. Fehlende Werte werden nicht erfunden.

Movie, TV und beide verwenden denselben Entwurf. Medienwechsel erfolgen über bestehende Domain-/Genre-Regeln, erhalten Identitäten und gültige Wünsche und erzeugen bei bestätigter Ausführung die passende technische Anfrage. Kein allgemeiner Matcher synchronisiert zwei gespeicherte Objekte. Inkompatible Genres bleiben nach den vorhandenen Regeln inaktiv erhalten; keine ungeprüfte Gleichsetzung unterschiedlicher Genres. Ein Wechsel allein startet weder Suche noch erneute Namensklärung. Antworten müssen weiterhin zum gültigen Kontext gehören.

Provider-Verträge richten sich nach der TMDb-Dokumentation. Deren Parameterkatalog erweitert nicht automatisch die Nutzerfilter um Laufzeit, Provider-Auswahl, Sprache oder Ausschlüsse.

### Gezielte Hilfsfunktionen und Ausführung

[WP 014](014-entity-resolution.md) klärt Identitäten. Eindeutigkeit, Mehrdeutigkeit, kein Treffer, Unvollständigkeit und technische Fehler werden unterschieden; das Modell wählt keine populäre Identität eigenmächtig.

[WP 012](012-search-execution-and-discover.md) verarbeitet bestätigte Kriterien:

- Movie: geeigneter Discover-Pfad mit nötiger Rollenprüfung.
- TV ohne Personen: TV Discover.
- TV mit Personen: gezielte Person-TV-Credits-Hilfsfunktion und Anwendung weiterer Kriterien.
- Beide: passende Movie-/TV-Pfade derselben bestätigten Anfrage; unabhängige Aufrufe nach Möglichkeit parallel.

Mehrere Personen verlangen gemeinsame qualifizierte Schauspielbeteiligung. TV-Serien-IDs werden dedupliziert und geschnitten; dieselbe Episode ist nicht erforderlich. Crew-Arbeit und Auftritte als man selbst zählen nicht. Unzureichende Rolleninformationen dürfen nicht als sicher klassifiziert gelten.

Credits und Zwischenmengen sind Ausführungsdaten, keine dauerhaften Entwurfsfelder oder erfundenen TV-Discover-Parameter. Zusätzliche Informationen werden gezielt serverseitig beschafft. Filter dürfen wegen eines anderen Ausführungspfads nicht entfallen.

### Ergebnisse und angrenzende Funktionen

Gemeinsame Ergebnisse behalten Medientyp und Provider-ID als kombinierte Identität und vereinheitlichen Titel-/Datumsfelder für die Anzeige. Die Oberfläche koordiniert keine TMDb-Aufrufe.

WP 012 definiert Pagination, Sortierung, Nachladen, Budgets und Fehlerbehandlung vor Implementierung. Keine verlorenen/duplizierten Treffer durch Abschneiden. Eine Sortierung geladener Ergebnisse garantiert nicht automatisch globale Reihenfolge über ungelesene Seiten. Provider-Zahlen vor zusätzlichen Abgleichen sind nicht ungeprüft Endergebniszahlen. Teilausfälle und begrenzte Verarbeitung sind weder vollständige noch verifiziert leere Ergebnisse.

Trending bleibt der Startmodus ohne individuelle Kriterien und benötigt kein LLM. `discover` bezeichnet die kriterienbasierte Suche, nicht zwingend einen einzelnen Provider-Aufruf oder eine Ausführungsfreigabe. TMDb Search unterstützt Lookups; Multi-Search ersetzt die Filtersuche nicht. [WP 013](013-title-disambiguation-and-providers.md) behandelt Titeldisambiguierung und Provider-Informationen zum gewählten Titel. Die Detailansicht lädt separat über unsere API.

### Einfachheit, Umsetzung und Bereinigung

- Kleine explizite Funktionen für Zustand, Auflösung, Abbildung und Ausführung; kein spekulatives Koordinationsframework.
- Nur nötiger temporärer Klärungs-/Ausführungskontext; zusätzliche Stores/Registries benötigen nachgewiesenen Bedarf und gesonderte Zustimmung.
- Reine Domain-Logik ohne Netzwerk. Provider-Aufrufe/Zugangsdaten bleiben serverseitig. Parser-/Provider-Daten werden validiert; Typen aus Zod abgeleitet.
- Reihenfolge WP 011 → WP 014 → WP 012; WP 009/010 liefern die vorhandene Grundlage.
- Betroffene Dateien vor Implementierung als behalten, anpassen, zusammenführen oder entfernen einordnen. Vorhandene Abstraktionen sind kein Selbstzweck; notwendiges Verhalten und Schutzregeln bleiben.
- Überholte Schemas, Tests und Dokumente mit ihren Aufrufern/Verweisen bereinigen. Tests schützen Verhalten statt ausgedienter Struktur. Keine Löschung zur Beschönigung von Tests/Coverage.
- Kleine zusammenhängende Änderungen an Code, Aufrufern, Tests und Dokumentation. „Grün“ umfasst Tests, Coverage, ESLint und Typecheck; Dokumentationsbeschlüsse sind keine Implementierungsnachweise.

## Execution status

- 2026-11-17: Zielbild und WP 011/014/012 dokumentarisch ausgerichtet; README, angrenzende Dokumente und geprüfte Verweise bereinigt. Dies ist keine vollständige repositoryweite Referenzinventur.
- WP 009/010 bilden die abgeschlossene Implementierungsgrundlage. Nutzer bestätigt alle zuvor offenen Validierungen vor WP 011 als erfolgreich; kein neuer Assistant-/CI-Lauf oder exakter Coverage-Wert behauptet.
- Produktive Parser-/Auflösungs-/Suchintegration und UI bleiben ausstehend. Nächster Umsetzungsschritt ist eine gezielte WP-011-Code-/Test-Bestandsaufnahme mit dateigenauem Plan vor Implementierung.
- Diese Änderung betrifft nur Dokumentation. Keine Laufzeitdateien, Schemas oder Tests geändert; keine Validierungskommandos ausgeführt.
