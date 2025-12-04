import React, { forwardRef } from "react";
import { View, TextInput, Text, StyleSheet, TextInputProps } from "react-native";
import Icon from "react-native-vector-icons/Ionicons";

type InputItemProps = TextInputProps & {
  icon: string;
  isCurrency?: boolean;
  isSuccess?: boolean; // Para destacar campos preenchidos (verde)
  error?: string; // Mensagem de erro
};

const InputItem = forwardRef<TextInput, InputItemProps>(({
  icon,
  isCurrency = false,
  isSuccess = false,
  error,
  autoCapitalize = "none",
  returnKeyType = "next",
  ...textInputProps
}, ref) => {
  const hasError = !!error;
  const iconColor = hasError 
    ? "#EF4444" 
    : isCurrency || isSuccess 
    ? "#16A34A" 
    : "#64748B";
  const hasSuccessStyle = isCurrency || isSuccess;

  return (
    <View>
      <View style={[
        styles.inputContainer,
        hasError && styles.inputContainerError
      ]}>
        <Icon name={icon} size={20} color={iconColor} />
        <TextInput
          ref={ref}
          style={[
            styles.input,
            hasSuccessStyle && styles.successText,
            hasError && styles.inputError,
          ]}
          placeholderTextColor="#94A3B8"
          autoCorrect={false}
          autoCapitalize={autoCapitalize}
          returnKeyType={returnKeyType}
          {...textInputProps}
        />
      </View>
      {hasError && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );
});

InputItem.displayName = "InputItem";

export default React.memo(InputItem);

const styles = StyleSheet.create({
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputContainerError: {
    borderBottomWidth: 1,
    borderBottomColor: "#EF4444",
    paddingBottom: 4,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#1E293B",
    paddingVertical: 4,
  },
  inputError: {
    color: "#EF4444",
  },
  successText: {
    color: "#16A34A",
    fontWeight: "700",
  },
  errorText: {
    fontSize: 12,
    color: "#EF4444",
    marginTop: 4,
    marginLeft: 30,
  },
});

