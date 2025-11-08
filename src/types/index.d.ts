declare module 'react-native-vector-icons/MaterialIcons' {
  import { Component } from 'react';
  import { TextProps } from 'react-native';

  export interface IconProps extends TextProps {
    name: string;
    size?: number;
    color?: string;
  }

  export default class Icon extends Component<IconProps> {}
}

declare module 'react-native-haptic-feedback' {
  export interface HapticOptions {
    enableVibrateFallback?: boolean;
    ignoreAndroidSystemSettings?: boolean;
  }

  export type HapticFeedbackTypes =
    | 'selection'
    | 'impactLight'
    | 'impactMedium'
    | 'impactHeavy'
    | 'rigid'
    | 'soft'
    | 'notificationSuccess'
    | 'notificationWarning'
    | 'notificationError';

  const ReactNativeHapticFeedback: {
    trigger: (type: HapticFeedbackTypes, options?: HapticOptions) => void;
  };

  export default ReactNativeHapticFeedback;
}

declare module 'react-native-html-to-pdf' {
  export interface Options {
    html: string;
    fileName: string;
    directory?: string;
    base64?: boolean;
    height?: number;
    width?: number;
    padding?: number;
    bgColor?: string;
  }

  export interface PDF {
    filePath: string;
    base64?: string;
  }

  const RNHTMLtoPDF: {
    convert: (options: Options) => Promise<PDF>;
  };

  export default RNHTMLtoPDF;
}
