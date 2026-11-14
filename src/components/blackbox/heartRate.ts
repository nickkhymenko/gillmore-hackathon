"use client";

/**
 * Web Bluetooth heart rate (standard Heart Rate Service 0x180D, measurement characteristic 0x2A37).
 * Chrome on desktop and Android only. A human chest strap or watch can stand in for the collar on stage.
 */
type Characteristic = EventTarget & { value?: DataView; startNotifications(): Promise<unknown> };
type Gatt = { connected: boolean; connect(): Promise<Gatt>; disconnect(): void; getPrimaryService(s: string): Promise<{ getCharacteristic(c: string): Promise<Characteristic> }> };
type Device = EventTarget & { name?: string; gatt?: Gatt };
type Bluetooth = { requestDevice(o: { filters: { services: string[] }[] }): Promise<Device> };

export const bluetoothSupported = () => typeof navigator !== "undefined" && "bluetooth" in navigator;

/** Parses a Heart Rate Measurement value: flag bit 0 says 8-bit or 16-bit beats per minute. */
export function parseHeartRate(v: DataView) {
  const flags = v.getUint8(0);
  return flags & 1 ? v.getUint16(1, true) : v.getUint8(1);
}

export async function connectHeartRate(onBpm: (bpm: number) => void, onGone: () => void): Promise<{ name: string; disconnect: () => void }> {
  const bt = (navigator as unknown as { bluetooth: Bluetooth }).bluetooth;
  const device = await bt.requestDevice({ filters: [{ services: ["heart_rate"] }] });
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService("heart_rate");
  const ch = await service.getCharacteristic("heart_rate_measurement");
  ch.addEventListener("characteristicvaluechanged", () => ch.value && onBpm(parseHeartRate(ch.value)));
  device.addEventListener("gattserverdisconnected", onGone);
  await ch.startNotifications();
  return { name: device.name ?? "Heart rate sensor", disconnect: () => device.gatt?.connected && device.gatt.disconnect() };
}
