// lib/dev-db/push-devices.ts
import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve(process.cwd(), 'dev-db', 'device-registrations.json');

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface DeviceRegistration {
  id: string;
  userId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  pushSubscription: PushSubscription;
  registeredAt: Date;
  lastUsed: Date;
  isActive: boolean;
}

// Ensure the dev-db directory exists
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
// Initialize the file if it doesn't exist or is empty
if (!fs.existsSync(DB_FILE) || fs.readFileSync(DB_FILE, 'utf8').trim() === '') {
  fs.writeFileSync(DB_FILE, '[]', 'utf8');
}

const readDevicesFromFile = (): DeviceRegistration[] => {
  try {
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const devices: DeviceRegistration[] = JSON.parse(data);
    // Convert date strings back to Date objects
    return devices.map(device => ({
      ...device,
      registeredAt: new Date(device.registeredAt),
      lastUsed: new Date(device.lastUsed),
    }));
  } catch (error) {
    console.error('Error reading device registrations file:', error);
    return [];
  }
};

const writeDevicesToFile = (devices: DeviceRegistration[]) => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(devices, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing device registrations file:', error);
  }
};

export const getDeviceRegistrations = (): DeviceRegistration[] => {
  return readDevicesFromFile();
};

export const addDeviceRegistration = (newDevice: DeviceRegistration) => {
  const devices = readDevicesFromFile();
  devices.push(newDevice);
  writeDevicesToFile(devices);
};

export const updateDeviceRegistration = (updatedDevice: DeviceRegistration) => {
  const devices = readDevicesFromFile();
  const index = devices.findIndex(d => d.id === updatedDevice.id);
  if (index > -1) {
    devices[index] = updatedDevice;
    writeDevicesToFile(devices);
    return true;
  }
  return false;
};

export const deleteDeviceRegistration = (id: string): boolean => {
  const devices = readDevicesFromFile();
  const initialLength = devices.length;
  const updatedDevices = devices.filter(device => device.id !== id);
  if (updatedDevices.length < initialLength) {
    writeDevicesToFile(updatedDevices);
    return true;
  }
  return false;
};

export const findDeviceByEndpoint = (endpoint: string): DeviceRegistration | undefined => {
  const devices = readDevicesFromFile();
  return devices.find(device => device.pushSubscription.endpoint === endpoint);
};