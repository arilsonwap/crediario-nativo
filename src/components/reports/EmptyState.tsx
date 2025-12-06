import React from "react";
import { View, Text } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";
import { useReportTheme } from "../../theme/reportTheme";

type Props = {
  icon: string;
  message: string;
};

export const EmptyState = React.memo(({ icon, message }: Props) => {
  const theme = useReportTheme();
  
  return (
    <View style={{ paddingVertical: 32, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={icon} size={32} color={theme.color.textBody} style={{ opacity: 0.3 }} />
      <Text 
        style={{
          marginTop: 12,
          fontSize: 14,
          color: theme.color.textBody,
          fontWeight: "500",
          textAlign: 'center',
        }} 
        allowFontScaling 
        maxFontSizeMultiplier={1.3}
      >
        {message}
      </Text>
    </View>
  );
});

EmptyState.displayName = 'EmptyState';
