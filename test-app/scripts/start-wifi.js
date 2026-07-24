const { execSync } = require('child_process');
const os = require('os');

const interfaces = os.networkInterfaces();
let wifiIp = '';

// Najdi IPv4 adresu aktivního Wi-Fi adaptéru
for (const name of Object.keys(interfaces)) {
  if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wlan') || name.toLowerCase().includes('bezdrát')) {
    const iface = interfaces[name].find(i => i.family === 'IPv4' && !i.internal);
    if (iface) {
      wifiIp = iface.address;
      break;
    }
  }
}

const args = process.argv.slice(2).join(' '); // předání argumentů, např. -c

if (!wifiIp) {
  console.log('Nenašel jsem Wi-Fi IP adresu. Spouštím Expo standardně...');
  execSync(`npx expo start ${args}`, { stdio: 'inherit' });
} else {
  console.log(`📡 Našel jsem Wi-Fi IP adresu: ${wifiIp}. Spouštím Expo...`);
  const env = { ...process.env, REACT_NATIVE_PACKAGER_HOSTNAME: wifiIp };
  execSync(`npx expo start ${args}`, { stdio: 'inherit', env });
}
