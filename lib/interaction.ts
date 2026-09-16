import type { TextStyle, ViewStyle } from 'react-native';

// Native stub. iOS and Android have no tap delay to remove and no text
// selection to suppress on ordinary labels — the web build gets the real
// styles from interaction.web.ts.
export const tappable: ViewStyle = {};
export const selectableText: TextStyle = {};
