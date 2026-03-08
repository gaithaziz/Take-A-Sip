import { NativeModules, Platform, Vibration } from 'react-native';

type SunmiPrinterNativeModule = {
  initPrinter?: () => Promise<void>;
  setAlignment?: (alignment: number) => Promise<void>;
  printText?: (text: string) => Promise<void>;
  lineWrap?: (lines: number) => Promise<void>;
  cutPaper?: () => Promise<void>;
  beep?: () => Promise<void>;
};

const moduleRef = NativeModules.SunmiPrinterModule as SunmiPrinterNativeModule | undefined;

const withTimeout = async <T>(promise: Promise<T> | undefined, timeoutMs: number, step: string) => {
  if (!promise) {
    return;
  }
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${step} timed out`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
};

export const sunmiPrinter = {
  isAvailable: () => Platform.OS === 'android' && Boolean(moduleRef),
  printReceipt: async (content: string) => {
    if (!moduleRef) {
      throw new Error('SunmiPrinterModule is not available.');
    }
    try {
      await withTimeout(moduleRef.initPrinter?.(), 4000, 'Printer init');
    } catch {
      throw new Error('Printer init failed');
    }
    try {
      await withTimeout(moduleRef.setAlignment?.(0), 3000, 'Printer alignment');
    } catch {
      throw new Error('Printer alignment failed');
    }
    try {
      await withTimeout(moduleRef.printText?.(content), 7000, 'Printer text output');
    } catch {
      throw new Error('Printer text output failed');
    }
    try {
      await withTimeout(moduleRef.lineWrap?.(3), 3000, 'Printer line wrap');
    } catch {
      // Some device firmwares can fail line wrap after successful print.
    }
    try {
      await withTimeout(moduleRef.cutPaper?.(), 3000, 'Printer cut');
    } catch {
      // Sunmi V2 variants usually have no cutter; ignore cut errors.
    }
  },
  playAlert: async () => {
    Vibration.vibrate(500);
    if (moduleRef?.beep) {
      try {
        await moduleRef.beep();
      } catch {
        // Keep vibration as fallback if beep fails.
      }
    }
  },
};
