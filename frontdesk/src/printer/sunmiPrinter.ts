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

export const sunmiPrinter = {
  isAvailable: () => Platform.OS === 'android' && Boolean(moduleRef),
  printReceipt: async (content: string) => {
    if (!moduleRef) {
      throw new Error('SunmiPrinterModule is not available.');
    }
    await moduleRef.initPrinter?.();
    await moduleRef.setAlignment?.(0);
    await moduleRef.printText?.(content);
    await moduleRef.lineWrap?.(3);
    await moduleRef.cutPaper?.();
  },
  playAlert: async () => {
    Vibration.vibrate(500);
    if (moduleRef?.beep) {
      await moduleRef.beep();
    }
  },
};
