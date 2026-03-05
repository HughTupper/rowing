"use client";

import { useCallback, useRef, useState } from "react";
import {
  ConnectionStatus,
  FTMS_SERVICE,
  ROWER_DATA_UUID,
  RowingMetrics,
  Split500m,
  SplitAccumulator,
  checkSplitBoundary,
  freshAccumulator,
  parseFTMSRowerData,
} from "@/lib/rowing";

const HISTORY_MAX = 60;

export interface RowingMachineState {
  status: ConnectionStatus;
  deviceName: string | null;
  metrics: RowingMetrics;
  history: RowingMetrics[];
  splits: Split500m[];
  connect: () => Promise<void>;
  disconnect: () => void;
}

export function useRowingMachine(): RowingMachineState {
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<RowingMetrics>({});
  const [history, setHistory] = useState<RowingMetrics[]>([]);
  const [splits, setSplits] = useState<Split500m[]>([]);

  const serverRef = useRef<BluetoothRemoteGATTServer | null>(null);
  const splitAccRef = useRef<SplitAccumulator>(freshAccumulator(1));

  const handleCharacteristicChange = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    if (target.uuid.toLowerCase() === ROWER_DATA_UUID) {
      const parsed = parseFTMSRowerData(value);
      setMetrics((prev) => {
        const next = { ...prev, ...parsed };

        // Split tracking
        const completed = checkSplitBoundary(next, splitAccRef.current);
        if (completed) {
          setSplits((s) => [...s, completed]);
          splitAccRef.current = {
            ...freshAccumulator(completed.splitNumber + 1),
            startElapsedTime: next.elapsedTime ?? 0,
            startStrokeCount: next.strokeCount ?? 0,
          };
        }

        setHistory((h) => {
          const updated = [...h, next];
          return updated.length > HISTORY_MAX
            ? updated.slice(updated.length - HISTORY_MAX)
            : updated;
        });
        return next;
      });
    }
  }, []);

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setStatus("error");
      return;
    }

    setStatus("connecting");
    setMetrics({});
    setHistory([]);
    setSplits([]);
    splitAccRef.current = freshAccumulator(1);

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          FTMS_SERVICE,
          "generic_access",
          "generic_attribute",
          "device_information",
        ],
      });

      setDeviceName(device.name ?? "Unknown");

      device.addEventListener("gattserverdisconnected", () => {
        setStatus("disconnected");
        serverRef.current = null;
      });

      const server = await device.gatt!.connect();
      serverRef.current = server;

      let allServices: BluetoothRemoteGATTService[];
      try {
        allServices = await server.getPrimaryServices();
      } catch {
        const ftmsService = await server.getPrimaryService(FTMS_SERVICE);
        allServices = [ftmsService];
      }

      for (const service of allServices) {
        let chars: BluetoothRemoteGATTCharacteristic[] = [];
        try {
          chars = await service.getCharacteristics();
        } catch {
          continue;
        }

        for (const char of chars) {
          if (char.properties.notify || char.properties.indicate) {
            try {
              await char.startNotifications();
              char.addEventListener(
                "characteristicvaluechanged",
                handleCharacteristicChange
              );
            } catch {
              // Some chars may not be subscribable in all machine states
            }
          }
        }
      }

      setStatus("connected");
    } catch (e) {
      if (e instanceof Error && e.name === "NotFoundError") {
        setStatus("idle");
      } else {
        setStatus("error");
      }
    }
  }, [handleCharacteristicChange]);

  const disconnect = useCallback(() => {
    if (serverRef.current?.connected) {
      serverRef.current.disconnect();
    }
    serverRef.current = null;
    setDeviceName(null);
    setMetrics({});
    setHistory([]);
    setSplits([]);
    splitAccRef.current = freshAccumulator(1);
    setStatus("idle");
  }, []);

  return { status, deviceName, metrics, history, splits, connect, disconnect };
}
