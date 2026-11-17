# NextWatch — Produktziel und Suchfluss

## Specification

### Zielsetzung

NextWatch ist eine einfache, kontrollierte Film- und Seriensuche mit einem LLM als semantischem Parser. Der Nutzer beschreibt seinen Suchwunsch in natürlicher Sprache. Die Anwendung bildet diesen Wunsch auf einen allgemeinen Suchzustand ab, klärt notwendige Angaben und erzeugt erst für die bestätigte Suche die passenden technischen Anfragen.

Das LLM ist kein autonomer Agent. Es schlägt strukturierte Änderungen vor, erfindet keine Provider-IDs, wählt keine Endpunkte aus und führt keine Suchketten aus. Validierung, Zustandsänderungen, Auflösung und Suchausführung liegen bei der Anwendung.

### Verbindlicher Ablauf

1. Der Nutzer beschreibt oder verändert einen Suchwunsch.
2. Der Parser liefert einen strukturierten Vorschlag für Kriterien und noch aufzulösende Begriffe.
3. Die Anwendung validiert den Vorschlag und übernimmt gültige Änderungen über die vorhandenen Domain-Funktionen.
4. Serverseitige Hilfsfunktionen lösen Personen und Keywords auf. Bei notwendiger Nutzerentscheidung verwendet die Anwendung die vorhandene Klärungslogik; deren UI-Integration bleibt gesonderte Arbeit.
5. Die Anwendung zeigt den geklärten Suchwunsch zur abschließenden Prüfung. Offene oder nicht unterstützte Anforderungen dürfen nicht stillschweigend entfallen.
6. Der Nutzer bestätigt die ausführbare Suche ausdrücklich. Die letzte Klärungsantwort startet nicht automatisch die Suche.
7. Der Server leitet die Movie- und/oder TV-Anfragen ab, führt die benötigten Aufrufe aus und liefert einheitliche Ergebnisse.

Ein natürlichsprachliches Eingabefeld ist nicht gleichbedeutend mit einer unveränderten Weitergabe des Textes an TMDb Search. Filterwünsche werden zuerst strukturiert.

### Ein allgemeiner Suchzustand

Der vorhandene `SearchState` aus [WP 009](009-search-state-and-filter-catalog.md) ist die maßgebliche Quelle für den Suchentwurf. Es entsteht kein zweiter parallel gepflegter Entwurf.

- `filters` hält die unterstützten Filterkriterien einschließlich Medientyp.
- `people` hält bestätigte Personen mit ID und Anzeigename. Technische Personen-ID-Listen werden daraus abgeleitet, nicht zusätzlich im Zustand gespeichert.
- `pendingQueries` hält strukturierte, noch offene Personen- und Keyword-Anfragen.
- `inactiveGenres` erhält im aktuellen Medientyp nicht aktive Genre-Wünsche nach den bestehenden Kompatibilitätsregeln.
- `revision` ordnet Änderungen und asynchrone Antworten dem passenden Zustand zu.

Die Darstellung eines allgemeinen Objekts in Beispielen ersetzt nicht das vorhandene Schema. Parser-Ausgabe, fachlicher Zustand und technische Provider-Parameter haben unterschiedliche Aufgaben, bilden aber keine unabhängig gepflegten Kopien derselben Suche.

Bestätigte Kriterien und offene Wünsche bleiben unterscheidbar. Der bearbeitete Suchentwurf und die zuletzt ausgeführte Anfrage mit ihren Ergebnissen bleiben ebenfalls unterscheidbar; alte Ergebnisse dürfen nach einer Änderung nicht als neue Treffer erscheinen.

### Movie- und TV-Referenzobjekte

Die technischen Referenzobjekte beschreiben die zulässigen Zielformen für Movie- beziehungsweise TV-Anfragen. Gemeinsame Felder werden gemeinsam definiert, soweit Bedeutung und Validierung tatsächlich übereinstimmen. Medienspezifische Felder bleiben explizit. Sie werden aus dem allgemeinen Suchzustand abgeleitet und nicht unabhängig von ihm bearbeitet oder gespeichert.

Die genaue Feldzuordnung und die Validierung der ausführbaren Anfragen gehören zu [WP 012](012-search-execution-and-discover.md). Dort werden insbesondere Jahresgrenzen, Genres, Keywords, Personen, Mindestbewertung und unterstützte Sortierung ohne stillen Kriterienverlust abgebildet. Fehlende optionale Werte werden nicht vorsorglich mit erfundenen Werten ergänzt.

Die TMDb-Dokumentation bestimmt die Provider-Verträge, erweitert aber nicht automatisch den Produktumfang. Laufzeit, Provider-Auswahl, Sprache oder Ausschlüsse werden nicht allein deshalb zu neuen Nutzerfiltern, weil ein Endpunkt entsprechende Parameter kennt.

### Medienwechsel und Auswahl beider Medientypen

Movie, TV und die Auswahl beider Medientypen verwenden denselben fachlichen Suchentwurf. Ein Medienwechsel ändert den Medientyp über die vorhandenen Domain-Regeln. Die technische Anfrage wird daraus neu abgeleitet; es ist kein allgemeiner Matcher zur Synchronisierung zweier gespeicherter Suchobjekte erforderlich.

- Bestätigte Personen und weiterhin gültige Wünsche bleiben erhalten.
- Genre-Kompatibilität und inaktive Rückkehrwerte verwenden die bestehenden Regeln. Keine ungeprüfte Gleichsetzung unterschiedlicher Genres.
- Ein Wechsel allein löst weder eine erneute Namensklärung noch eine Suche aus. Asynchrone Antworten müssen weiterhin zum gültigen Kontext gehören.
- Bei der Auswahl beider Medientypen erzeugt der Server die beiden passenden Ausführungspfade aus derselben bestätigten Anfrage.

### Gezielte serverseitige Hilfsfunktionen

Identitätsauflösung und Ergebnissuche sind getrennte Aufgaben.

[WP 014](014-entity-resolution.md) löst Personennamen und Keyword-Begriffe in vertrauenswürdig zugeordnete Identitäten auf. Mehrdeutigkeit, kein Treffer und technische Fehler sind unterschiedliche Ergebnisse. Das Modell darf keine IDs raten oder einen populären Treffer eigenmächtig auswählen.

[WP 012](012-search-execution-and-discover.md) verarbeitet die bestätigten Identitäten für die Suche:

- Movie verwendet den dafür geeigneten Discover-Pfad mit erforderlicher Rollenprüfung.
- TV ohne Personen verwendet den TV-Discover-Pfad.
- TV mit Personen verwendet eine gezielte Hilfsfunktion auf Basis der Person-TV-Credits und wendet die weiteren angefragten Kriterien an.
- Bei mehreren Personen gilt gemeinsame qualifizierte Schauspielbeteiligung. Serien-IDs werden dedupliziert und zwischen den Personen geschnitten; dieselbe Episode ist nicht erforderlich. Crew-Arbeit und Auftritte als man selbst erfüllen diese Bedingung nicht. Unzureichende Rolleninformationen dürfen nicht als sicher klassifiziert gelten.

TV-Credits sind Ausführungsdaten, kein dauerhaftes zusätzliches Feld im Suchentwurf und kein erfundener TV-Discover-Parameter. Benötigte weitere Daten werden gezielt serverseitig beschafft. Kein angefragter Filter darf wegen des anderen Ausführungspfads stillschweigend verloren gehen.

### Ergebnisse und Pagination

Die API liefert eine gemeinsame Ergebnisdarstellung mit Medientyp und Provider-ID; die Kombination identifiziert den Treffer. Titel- und Datumsfelder werden für die Darstellung vereinheitlicht. Die Oberfläche muss keine TMDb-Aufrufe koordinieren.

Für die Auswahl beider Medientypen werden unabhängige Aufrufe nach Möglichkeit parallel ausgeführt. Geladene Treffer dürfen gemeinsam sortiert werden; dies ist ohne weitergehende Umsetzung keine Garantie einer globalen Rangfolge über alle noch nicht geladenen Treffer.

WP 012 definiert Pagination, Nachladen, Anfragebudgets und Fehlerbehandlung vor der Implementierung. Treffer dürfen nicht durch Abschneiden und Nachladen verloren gehen. Provider-Trefferzahlen dürfen nicht ungeprüft als Trefferzahlen nach zusätzlichen Abgleichen ausgegeben werden. Ein Teilausfall oder eine vorzeitig begrenzte Verarbeitung ist kein verifiziert leeres oder vollständiges Ergebnis.

### Trending, Titelsuche und Detailansicht

Trending bleibt der Startmodus ohne individuelle Suchkriterien und benötigt keinen LLM-Aufruf. Der Domain-Modus `discover` bezeichnet die kriterienbasierte Suche, nicht die Zusicherung, dass technisch genau ein Discover-Aufruf genügt.

TMDb Search unterstützt Identitäts- und Titel-Lookups. Multi-Search ist kein Ersatz für die kriterienbasierte Hauptsuche. Titeldisambiguierung und Provider-Darstellung bleiben Gegenstand von [WP 013](013-title-disambiguation-and-providers.md).

Die Detailansicht lädt die Informationen zum ausgewählten Film oder zur Serie über unsere API. Sie ist vom Suchentwurf getrennt.

### Einfachheit und Verantwortlichkeiten

- Ein maßgeblicher Suchentwurf; keine separat gepflegten Movie-/TV-Entwürfe.
- Kleine, explizite Funktionen für Zustandsänderung, Auflösung, Abbildung und Ausführung statt eines spekulativen allgemeinen Koordinationsframeworks.
- Nur tatsächlich notwendiger temporärer Klärungs- und Ausführungskontext; keine zusätzlichen Stores oder Registries ohne nachgewiesenen Bedarf und gesonderte Zustimmung.
- Reine Domain-Logik ohne Netzwerkzugriff; TMDb-Aufrufe ausschließlich serverseitig, Zugangsdaten niemals im Browser.
- Validierte Parser-Ausgaben und Provider-Antworten; Zod-Verträge mit daraus abgeleiteten TypeScript-Typen.
- Keine Ausführung durch unvalidierte Modellvorschläge, keine agentischen Modell-Tool-Schleifen und keine implizite Suchfreigabe.

### Umsetzung und Bereinigung

Die Reihenfolge bleibt WP 011 → WP 014 → WP 012. WP 011 verarbeitet Parser-Vorschläge für den bestehenden Zustand; WP 014 liefert Identitätsauflösung; WP 012 erzeugt und verarbeitet die ausführbaren Anfragen. WP 010 liefert die bestehende Grundlage für Klärung und Guardrails.

Vor Implementierungsänderungen werden betroffene Dateien als behalten, anpassen, zusammenführen oder entfernen eingeordnet. Auch bestehende Abstraktionen werden geprüft; ihr bloßes Vorhandensein verpflichtet nicht zur Übernahme. Weiterhin gültiges Verhalten und Schutzregeln bleiben erhalten.

Tests sichern das gewünschte Verhalten, nicht überholte Implementierungsstrukturen. Tests entfallender Schnittstellen werden mit diesen entfernt oder angepasst; erforderliche Verhaltensprüfungen werden an die neue Grenze übernommen. Schemas ohne eigene Aufgabe, doppelte Dokumentation und veraltete Verweise werden gezielt bereinigt. Keine Löschung allein zur Herstellung grüner Tests oder besserer Coverage.

Code, Aufrufer, Tests und Dokumentation werden in kleinen zusammenhängenden Schritten aktualisiert. Für Implementierungsschritte umfasst „grün“ Tests, Coverage-Prüfung, ESLint und Typecheck. Ein Dokumentationsbeschluss ist weder Implementierung noch Validierungsnachweis.

## Execution status

- 2026-11-17: Gemeinsamer Suchzustand und daraus abgeleitete Movie-/TV-Anfragen als Zielbild festgelegt.
- WP 009 und WP 010 bilden die bestehende Implementierungsgrundlage. Diese Festlegung bestätigt keine vollständige produktive Parser-, Auflösungs-, Such- oder UI-Integration.
- Nächster Dokumentationsschritt: WP 011, WP 014 und WP 012 sowie betroffene Einstiegsdokumente gezielt an dieses Zielbild angleichen. Detailverträge und dateigenaue Bereinigung bleiben zu prüfen.
- Diese Änderung betrifft nur Dokumentation. Keine Schemas, Tests oder Laufzeitimplementierungen geändert; keine Tests, Coverage, ESLint oder Typecheck ausgeführt.
