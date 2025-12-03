// src/components/CustomInput.tsx
import React, { forwardRef } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from "react-native";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  labelStyle?: TextStyle;
  left?: React.ReactNode;
  right?: React.ReactNode;
};

const CustomInput = forwardRef<TextInput, Props>(
  (
    {
      label,
      error,
      helperText,
      containerStyle,
      inputStyle,
      labelStyle,
      left,
      right,
      editable = true,
      ...rest
    },
    ref
  ) => {
    const disabled = !editable;

    return (
      <View style={[styles.wrapper, containerStyle]}>
        {label ? <Text style={[styles.label, labelStyle]}>{label}</Text> : null}

        <View
          style={[
            styles.field,
            disabled && styles.fieldDisabled,
            error && styles.fieldError,
          ]}
        >
          {left ? <View style={styles.adornment}>{left}</View> : null}

          <TextInput
            ref={ref}
            style={[styles.input, inputStyle]}
            placeholderTextColor="#9aa0a6"
            editable={editable}
            {...rest}
          />

          {right ? <View style={styles.adornment}>{right}</View> : null}
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : helperText ? (
          <Text style={styles.helperText}>{helperText}</Text>
        ) : null}
      </View>
    );
  }
);

export default CustomInput;

/* ========================= Styles ========================= */
const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4a5568",
    marginBottom: 8,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    // sombra leve cross-platform
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  fieldDisabled: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
  },
  fieldError: {
    borderColor: "#ef4444",
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  adornment: {
    minWidth: 24,
    minHeight: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    marginTop: 6,
    fontSize: 12,
    color: "#b91c1c",
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    color: "#6b7280",
  },
});
