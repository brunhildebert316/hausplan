# Unser Haus – Essensplan, Neuigkeiten & Befehle

Alle können die Seite lesen. Wer das Admin-Passwort kennt, kann bearbeiten.

## 1. Veröffentlichen (einmalig)

1. Auf github.com ein neues **Public**-Repository erstellen (z. B. `haus`).
2. Diese Dateien hochladen: `index.html`, `style.css`, `script.js`, `config.js`, `data.json`, `setup.html`.
3. **Settings → Pages → Branch `main` / `/ (root)` → Save**.
4. Nach ca. 1 Minute: `https://DEIN-NAME.github.io/haus/`

## 2. GitHub-Token erstellen (einmalig, nur du)

Profilbild → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
- Repository access: *Only select repositories* → dein Haus-Repo
- Permissions → **Contents: Read and write**
- Token kopieren (wird nur einmal angezeigt)

## 3. Passwort festlegen (einmalig)

1. `https://DEIN-NAME.github.io/haus/setup.html` öffnen.
2. Token einfügen und ein eigenes Passwort wählen (12+ Zeichen empfohlen) → **Verschlüsseln**.
3. Die erzeugte Zeile kopieren und in `config.js` einfügen (die Datei auf GitHub mit dem Stift-Symbol bearbeiten, Inhalt ersetzen, Commit).

## 4. Bearbeiten

Auf der Seite 🔒 antippen, Passwort eingeben, dann erscheint der **+ Knopf**.
Alles ändern und unten auf **Speichern** tippen.

Das Passwort gilt für alle Admins. Wer es hat, kann bearbeiten.
