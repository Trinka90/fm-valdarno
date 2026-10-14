# FM del Valdarno: app Android e iOS

Questa cartella è il progetto completo dell'app:

- `game/` contiene il gioco: sorgenti, database dei giocatori e script di build.
- `android/` e `ios/` sono le app native, fatte con Capacitor.
- `www/` è la versione web installabile (PWA), che funziona anche offline.
- `.github/workflows/` contiene le build automatiche, che compilano l'APK sui server di GitHub. Non devi installare Android Studio.

---

## 1. Android: APK da installare sul telefono (gratis)

1. Crea un account su https://github.com se non ce l'hai.
2. Crea un nuovo repository vuoto, per esempio `fm-valdarno`, impostato come **Public**.
   - Public serve per la versione web gratuita. Per l'APK va bene anche Private.
   - Non aggiungere README o licenza.
3. Dalla cartella del progetto, nel terminale (Git Bash o PowerShell con Git installato):
   ```
   git remote add origin https://github.com/TUO-UTENTE/fm-valdarno.git
   git push -u origin main
   ```
   Il primo commit è già pronto: basta fare push.
4. Su GitHub apri la scheda **Actions**. Il workflow **App Android** parte da solo e impiega 5–8 minuti.
5. Quando è verde, apri **Releases** dalla pagina principale del repository e cerca la release più recente.
6. Dal telefono Android apri quella pagina e scarica **FM-Valdarno.apk**, poi aprilo.
   La prima volta Android chiede di consentire l'installazione da browser o file manager: accetta.

A ogni modifica che carichi su GitHub viene creato da solo un nuovo APK.
Per aggiornare l'app sul telefono, installa il nuovo APK sopra il vecchio: la carriera salvata resta.

## 2. iPhone (e Android) senza store: versione web installabile (gratis)

1. Nel repository vai in **Settings → Pages → Build and deployment → Source** e scegli **GitHub Actions**.
2. Il workflow **Versione web** pubblica il gioco su `https://TUO-UTENTE.github.io/fm-valdarno/`.
   Se non parte da solo, avvialo da Actions con **Run workflow**.
3. **Su iPhone:** apri il link con **Safari**, tocca **Condividi → Aggiungi alla schermata Home**.
4. **Su Android con Chrome:** menu **⋮ → Installa app**.

Ottieni un'icona sulla schermata Home e il gioco a schermo intero. Funziona anche senza internet e la carriera si salva sul telefono.

## 3. Google Play Store (facoltativo)

1. Crea la chiave di firma una sola volta e conservala: senza quella non potrai più aggiornare l'app.
   ```
   keytool -genkeypair -v -keystore fmv.keystore -alias fmv -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Converti la chiave in testo:
   - Linux o Mac: `base64 -w0 fmv.keystore`
   - Windows PowerShell: `[Convert]::ToBase64String([IO.File]::ReadAllBytes("fmv.keystore"))`
3. Su GitHub, in **Settings → Secrets and variables → Actions → New repository secret**, aggiungi:
   - `FMV_KEYSTORE_BASE64` = il testo ottenuto al punto 2
   - `FMV_KEYSTORE_PASSWORD` = la password del keystore
   - `FMV_KEY_ALIAS` = `fmv`
   - `FMV_KEY_PASSWORD` = la password della chiave
4. Alla build successiva la Release contiene anche **FM-Valdarno-PlayStore.aab**.
5. Iscriviti alla Google Play Console (25 $ una tantum) e carica il file `.aab`.
   - Per un account personale nuovo, Google chiede un test chiuso con almeno 12 tester per 14 giorni prima della pubblicazione.

## 4. App Store iOS (facoltativo)

Per pubblicare o installare l'app nativa su iPhone servono:

- un account **Apple Developer** (99 $ l'anno);
- un Mac con Xcode, oppure un servizio di build nel cloud come Codemagic, che ha un piano gratuito e firma con il tuo account Apple.

Con il Mac:
```
npm ci
npm run build
npx cap open ios
```
In Xcode scegli il tuo Team in **Signing & Capabilities**, poi **Product → Archive → Distribute App**.

Il workflow **App iOS** (da avviare a mano in Actions) verifica soltanto che il progetto compili, senza firma.

## Aggiornare il gioco

- Le modifiche al gioco si fanno in `game/src/`: `engine.js`, `ui.js`, `style.css`.
- Le rose si aggiornano con `game/importa-rose.py`.
- Poi:
  ```
  npm run build
  git commit -am "aggiornamento" && git push
  ```
  GitHub ricompila APK e versione web da solo.

## Dati

- I nomi dei giocatori, dove presenti, vengono da elenchi pubblicati da società e portali.
- Non sono liste ufficiali di tesserati.
- Abilità, valori e stipendi sono simulati.
