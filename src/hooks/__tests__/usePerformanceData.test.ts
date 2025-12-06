import { renderHook } from "@testing-library/react-hooks";
import { usePerformanceData } from "../usePerformanceData";

describe("usePerformanceData", () => {
  const mockThemeColors = {
    success: "#10B981",
    danger: "#EF4444",
  };

  it("deve retornar dados corretos para crescimento", () => {
    const crescimento = {
      percentual: 15.5,
      cresceu: true,
    };

    const { result } = renderHook(() =>
      usePerformanceData(crescimento, mockThemeColors)
    );

    expect(result.current.icon).toBe("caret-up");
    expect(result.current.color).toBe(mockThemeColors.success);
    expect(result.current.percentual).toBe(15.5);
    expect(result.current.label).toBe("crescimento");
  });

  it("deve retornar dados corretos para retração", () => {
    const crescimento = {
      percentual: -10.2,
      cresceu: false,
    };

    const { result } = renderHook(() =>
      usePerformanceData(crescimento, mockThemeColors)
    );

    expect(result.current.icon).toBe("caret-down");
    expect(result.current.color).toBe(mockThemeColors.danger);
    expect(result.current.percentual).toBe(10.2); // Math.abs aplicado
    expect(result.current.label).toBe("retracao");
  });

  it("deve retornar zero quando percentual é zero", () => {
    const crescimento = {
      percentual: 0,
      cresceu: false,
    };

    const { result } = renderHook(() =>
      usePerformanceData(crescimento, mockThemeColors)
    );

    expect(result.current.percentual).toBe(0);
  });

  it("deve tratar NaN e retornar zero", () => {
    const crescimento = {
      percentual: NaN,
      cresceu: false,
    };

    const { result } = renderHook(() =>
      usePerformanceData(crescimento, mockThemeColors)
    );

    expect(result.current.percentual).toBe(0);
    expect(result.current.icon).toBe("caret-down");
  });

  it("deve tratar Infinity e retornar zero", () => {
    const crescimento = {
      percentual: Infinity,
      cresceu: true,
    };

    const { result } = renderHook(() =>
      usePerformanceData(crescimento, mockThemeColors)
    );

    expect(result.current.percentual).toBe(0);
  });

  it("deve tratar percentual undefined e retornar zero", () => {
    const crescimento = {
      percentual: undefined as any,
      cresceu: false,
    };

    const { result } = renderHook(() =>
      usePerformanceData(crescimento, mockThemeColors)
    );

    expect(result.current.percentual).toBe(0);
  });
});

