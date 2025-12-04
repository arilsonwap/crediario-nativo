import React from "react";
import { View, TextInput, StyleSheet, TextInputProps } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

type InputItemProps = TextInputProps & {
  icon: string;
  isCurrency?: boolean;
};

function InputItem({
  icon,
  isCurrency = false,
  autoCapitalize = "none",
  returnKeyType = "next",
  ...textInputProps
}: InputItemProps) {
  return (
    <View style={styles.inputContainer}>
      <Icon name={icon} size={20} color={isCurrency ? "#16A34A" : "#64748B"} />
      <TextInput
        style={[styles.input, isCurrency && styles.currencyText]}
        placeholderTextColor="#94A3B8"
        autoCorrect={false}
        autoCapitalize={autoCapitalize}
        returnKeyType={returnKeyType}
        {...textInputProps}
      />
    </View>
  );
}

export default React.memo(InputItem);

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#1E293B",
    paddingVertical: 4,
  },
  currencyText: {
    color: "#16A34A",
    fontWeight: "700",
  },
});

