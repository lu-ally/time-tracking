# AllyTimeTracking

MVP fuer Zeiterfassung und Urlaubsplanung mit Next.js App Router, TypeScript, Tailwind und PostgreSQL.

## Setup (lokal)

1. Abhaengigkeiten installieren

```bash
npm install
```

2. `.env` aus Vorlage erstellen

```bash
cp .env.example .env
```

3. Datenbank migrieren + Seed

```bash
npm run prisma:migrate
npm run seed
```

4. Dev-Server starten

```bash
npm run dev
```

## Tests

```bash
npm run test:unit
npm run test:e2e
```

## Architekturueberblick

- **Next.js App Router** fuer Server Components und Route Handlers
- **Prisma + PostgreSQL** fuer Datenhaltung
- **Auth**: E-Mail + Passwort (bcrypt), Session-Tabelle + HttpOnly Cookie
- **Zeitlogik**: Alle Datumswerte als `YYYY-MM-DD` (Berlin). Berechnungen explizit in `Europe/Berlin`.
- **Wochendefinition**: ISO-8601, Woche startet Montag.

## Domain-Entscheidungen & Annahmen

- **Zeiterfassung**: Pro Tag genau ein Eintrag (Start, Ende, Pause). Das verhindert Ueberschneidungen.
- **Sollzeit**: Minuten pro Arbeitstag (Default: 480). Wochenendtage und Feiertage setzen Sollzeit auf 0.
- **Urlaub**: Berechnung zaehlt nur Werktage (Mo-Fr), Feiertage werden nicht abgezogen. Halbtag kann fuer Start oder Ende gesetzt werden.
- **Feiertage**: Hamburg (HH) lokal berechnet und in der DB gespeichert. Erweiterung fuer weitere Bundeslaender vorbereitet.
- **User-Onboarding**: Keine Selbstregistrierung. Admins legen Accounts an.

## Wichtige Routen

- `/login`
- `/time` Zeiterfassung (Tag/Woche/Monat)
- `/leave` Urlaubsplanung (Teamkalender)
- `/admin` Userverwaltung & Korrekturen

## API (Auszug)

- `POST /api/auth/login`, `POST /api/auth/logout`
- `GET/POST /api/time`
- `GET/POST /api/leave`
- `GET /api/export` (CSV)
- `GET /api/holidays`
- `GET /api/admin/users`, `POST /api/admin/allowance`

## Naechste Schritte (optional)

- Rollenverwaltung ausbauen (Admin-UI fuer Rollen).
- Monatsabschluss fuer Zeiterfassung.
- iCal-Feed fuer Teamurlaub.
- Dark Mode.
