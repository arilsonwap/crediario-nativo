import React from "react";
import { ReportRow } from "./ReportRow";
import { ViewStyle } from "react-native";

type ReportSectionRowProps = {
  children: React.ReactNode;
  style?: ViewStyle;
  justifyContent?: "space-between" | "flex-start" | "flex-end" | "center";
  alignItems?: "center" | "flex-start" | "flex-end" | "stretch";
};

/**
 * ✅ Wrapper simplificado usando ReportRow
 * Mantém compatibilidade com API anterior
 */
export const ReportSectionRow = React.memo<ReportSectionRowProps>(
  ({ children, style, justifyContent = "space-between", alignItems = "center" }) => {
    return (
      <ReportRow justify={justifyContent} align={alignItems} style={style}>
        {children}
      </ReportRow>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.children === nextProps.children &&
      prevProps.justifyContent === nextProps.justifyContent &&
      prevProps.alignItems === nextProps.alignItems &&
      prevProps.style === nextProps.style
    );
  }
);

ReportSectionRow.displayName = "ReportSectionRow";



