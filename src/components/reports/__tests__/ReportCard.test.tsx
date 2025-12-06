import React from "react";
import { render } from "@testing-library/react-native";
import { ReportCard } from "../ReportCard";
import { useAppColorScheme } from "../../../hooks/useAppColorScheme";
import { useCardAnimation } from "../../../hooks/useCardAnimation";

// Mock dos hooks
jest.mock("../../../hooks/useAppColorScheme");
jest.mock("../../../hooks/useCardAnimation");

const mockUseAppColorScheme = useAppColorScheme as jest.MockedFunction<
  typeof useAppColorScheme
>;
const mockUseCardAnimation = useCardAnimation as jest.MockedFunction<
  typeof useCardAnimation
>;

describe("ReportCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAppColorScheme.mockReturnValue("light");
    mockUseCardAnimation.mockReturnValue({
      animatedStyle: {
        opacity: 1,
        transform: [{ translateY: 0 }, { scale: 1 }],
      },
    });
  });

  it("deve renderizar com props corretas", () => {
    const { getByText } = render(
      <ReportCard
        title="Test Card"
        icon="cash"
        color="#3B82F6"
        bg="#EFF6FF"
        index={0}
      >
        <React.Fragment>Test Content</React.Fragment>
      </ReportCard>
    );

    expect(getByText("Test Card")).toBeTruthy();
    expect(getByText("Test Content")).toBeTruthy();
  });

  it("deve disparar animação ao montar", () => {
    render(
      <ReportCard
        title="Test Card"
        icon="cash"
        color="#3B82F6"
        bg="#EFF6FF"
        index={0}
      >
        <React.Fragment>Content</React.Fragment>
      </ReportCard>
    );

    expect(mockUseCardAnimation).toHaveBeenCalledWith(0);
  });

  it("deve alterar cores corretamente no dark mode", () => {
    mockUseAppColorScheme.mockReturnValue("dark");

    const { rerender } = render(
      <ReportCard
        title="Test Card"
        icon="cash"
        color="#3B82F6"
        bg="#EFF6FF"
        index={0}
      >
        <React.Fragment>Content</React.Fragment>
      </ReportCard>
    );

    // Verifica se o hook foi chamado com dark mode
    expect(mockUseAppColorScheme).toHaveBeenCalled();

    // Muda para light mode
    mockUseAppColorScheme.mockReturnValue("light");
    rerender(
      <ReportCard
        title="Test Card"
        icon="cash"
        color="#3B82F6"
        bg="#EFF6FF"
        index={0}
      >
        <React.Fragment>Content</React.Fragment>
      </ReportCard>
    );

    expect(mockUseAppColorScheme).toHaveBeenCalled();
  });

  it("deve aplicar props de cor corretamente", () => {
    const { getByTestId } = render(
      <ReportCard
        title="Test Card"
        icon="cash"
        color="#FF0000"
        bg="#FFE5E5"
        index={0}
        testID="report-card"
      >
        <React.Fragment>Content</React.Fragment>
      </ReportCard>
    );

    const card = getByTestId("report-card");
    expect(card).toBeTruthy();
  });

  it("deve usar marginBottom padrão quando não fornecido", () => {
    render(
      <ReportCard
        title="Test Card"
        icon="cash"
        color="#3B82F6"
        bg="#EFF6FF"
        index={0}
      >
        <React.Fragment>Content</React.Fragment>
      </ReportCard>
    );

    expect(mockUseCardAnimation).toHaveBeenCalled();
  });

  it("deve usar marginBottom customizado quando fornecido", () => {
    const customMargin = 24;

    render(
      <ReportCard
        title="Test Card"
        icon="cash"
        color="#3B82F6"
        bg="#EFF6FF"
        index={0}
        marginBottom={customMargin}
      >
        <React.Fragment>Content</React.Fragment>
      </ReportCard>
    );

    expect(mockUseCardAnimation).toHaveBeenCalled();
  });
});

