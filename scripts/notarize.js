const { notarize } = require('@electron/notarize');
const { execSync } = require('child_process');

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;

  // Only notarize macOS builds
  if (electronPlatformName !== 'darwin') {
    return;
  }

  // Skip if notarization env vars aren't set
  if (!process.env.APPLE_ID || !process.env.APPLE_APP_SPECIFIC_PASSWORD) {
    console.log('Skipping notarization: APPLE_ID or APPLE_APP_SPECIFIC_PASSWORD not set');
    return;
  }

  // Resolve @keychain: references to actual password
  let password = process.env.APPLE_APP_SPECIFIC_PASSWORD;
  if (password.startsWith('@keychain:')) {
    const serviceName = password.replace('@keychain:', '');
    try {
      password = execSync(
        `security find-generic-password -s "${serviceName}" -a "${process.env.APPLE_ID}" -w`,
        { encoding: 'utf8' }
      ).trim();
    } catch (err) {
      console.error(`Failed to read password from keychain service "${serviceName}":`, err.message);
      return;
    }
  }

  const appName = context.packager.appInfo.productFilename;

  console.log(`Notarizing ${appName}...`);

  try {
    await notarize({
      appBundleId: 'com.gritsoftware.owninvoice',
      appPath: `${appOutDir}/${appName}.app`,
      appleId: process.env.APPLE_ID,
      appleIdPassword: password,
      teamId: process.env.APPLE_TEAM_ID,
    });
    console.log('Notarization complete!');
  } catch (err) {
    // If stapling fails but notarization succeeded, continue anyway
    // macOS will verify the notarization ticket online
    if (err.message && err.message.includes('staple')) {
      console.log('Notarization succeeded but stapling failed (ticket may not have propagated yet).');
      console.log('The app is still notarized — macOS will verify online.');
    } else {
      throw err;
    }
  }
};
