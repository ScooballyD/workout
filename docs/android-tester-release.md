# Android Tester Release

Use Google Play internal testing for Megalifts tester builds. It distributes an
Android App Bundle (AAB) through Google Play, supports up to 100 internal
testers, and makes new internal releases available within minutes. Direct APK
installation is a temporary fallback only.

## Release Identity

- App name: `Megalifts`
- Package ID: `com.megalifts.app`
- Initial version: code `1`, name `1.0`

Do not change the package ID after the first Play upload. Increment
`versionCode` for every Play upload in `android/app/build.gradle`; update
`versionName` to the corresponding tester-facing version.

## One-Time Signing Setup

The upload keystore is the durable identity used for future app updates. Store
it in a password manager or organization-controlled secret storage, never in
the repository or OneDrive project directory.

1. Generate the keystore in a secure non-repository location:

```powershell
& 'C:\Program Files\Android\Android Studio\jbr\bin\keytool.exe' -genkeypair -v -keystore C:/secure-path/megalifts-upload.jks -alias megalifts-upload -keyalg RSA -keysize 4096 -validity 10000
```

If a separately installed JDK already exposes `keytool` on `PATH`, the leading
absolute executable path can be replaced with `keytool`. Android Studio's
bundled JBR is the supported fallback on this workstation.

2. Record the keystore path, alias, and both passwords in the approved secret
   manager. Back up the keystore securely; losing it prevents future updates
   with the same signing identity.

3. Create the local Gradle properties file if it does not already exist:

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE/.gradle" | Out-Null
notepad "$env:USERPROFILE/.gradle/gradle.properties"
```

4. Copy the entries from
   [release-signing.properties.example](C:/Users/carve/OneDrive/Projects/workout/android/release-signing.properties.example)
   into `%USERPROFILE%/.gradle/gradle.properties`, replacing every placeholder.
   Use forward slashes in the Windows keystore path.

The release build intentionally fails when any `MEGALIFTS_RELEASE_*` property
is missing. Debug builds do not require these values.

## Build And Verify

Run the web checks before packaging:

```powershell
npm test
npm run lint
npm run build:android:web
npm run sync:android
```

If Gradle rejects generated Capacitor assets as OneDrive reparse points, copy
the current checkout to a disposable folder directly under `C:\\`, install its
dependencies, then run the commands there. The keystore remains outside the
copy and is supplied through the local Gradle user properties.

Build the Play artifact:

```powershell
Set-Location android
.\gradlew.bat bundleRelease
```

The signed bundle is at `android/app/build/outputs/bundle/release/app-release.aab`.
Verify its signature before upload:

```powershell
jarsigner -verify -verbose -certs app/build/outputs/bundle/release/app-release.aab
```

For the exceptional direct-install fallback, build and verify a release APK:

```powershell
.\gradlew.bat assembleRelease
& "$env:ANDROID_HOME/build-tools/<installed-version>/apksigner.bat" verify --verbose app/build/outputs/apk/release/app-release.apk
```

Keep the last verified artifact and its version metadata until the replacement
release has completed tester validation.

## Google Play Internal Testing

1. In Play Console, create the app using `com.megalifts.app` and opt into Play
   App Signing when prompted.
2. Go to **Test and release > Testing > Internal testing**, create a release,
   and upload `app-release.aab`.
3. Add up to 100 trusted testers by email or an approved Google Group. Provide
   the project feedback address or channel, save, and publish the internal
   release.
4. Copy the opt-in link and share the tester instructions below.

Internal-track releases normally become available within minutes. A tester
enrolled in internal testing cannot receive an open or closed test until they
opt out of internal testing.

## Tester Instructions

1. Open the supplied Google Play opt-in link using the Google account invited
   to the test.
2. Join the test and install or update **Megalifts** from Google Play.
3. Before uninstalling or switching devices, open **Settings** and export a
   backup. App data is device-local.
4. Report the app version, Android device model/version, reproduction steps,
   screenshots, and whether a backup was exported.

For a rollback, publish the previous signed AAB as a new internal release with
a higher `versionCode`; Play does not allow lowering the installed version.
