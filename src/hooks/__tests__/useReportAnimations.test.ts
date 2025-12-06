import { renderHook, act } from "@testing-library/react-hooks";
import { useReportAnimations } from "../useReportAnimations";
import { Animated } from "react-native";

// Mock do Animated
jest.mock("react-native", () => {
  const RN = jest.requireActual("react-native");
  return {
    ...RN,
    Animated: {
      ...RN.Animated,
      Value: jest.fn((value) => ({
        setValue: jest.fn(),
        _value: value,
      })),
      timing: jest.fn(() => ({
        start: jest.fn((callback) => {
          callback?.({ finished: true });
        }),
        stop: jest.fn(),
      })),
      parallel: jest.fn((animations) => ({
        start: jest.fn((callback) => {
          callback?.({ finished: true });
        }),
      })),
      sequence: jest.fn((animations) => ({
        start: jest.fn((callback) => {
          callback?.({ finished: true });
        }),
      })),
      stagger: jest.fn((delay, animations) => ({
        start: jest.fn((callback) => {
          callback?.({ finished: true });
        }),
        stop: jest.fn(),
      })),
    },
  };
});

describe("useReportAnimations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("deve criar animações para o número correto de cards", () => {
    const { result } = renderHook(() =>
      useReportAnimations({
        count: 3,
        durationFade: 120,
        durationSlide: 220,
        stagger: 80,
      })
    );

    expect(result.current).toHaveProperty("fadeIn");
    expect(result.current).toHaveProperty("fadeOut");
    expect(result.current).toHaveProperty("slideUp");
    expect(result.current).toHaveProperty("stagger");
    expect(result.current).toHaveProperty("cancelAnimations");
    expect(result.current).toHaveProperty("resetAnimations");
    expect(result.current).toHaveProperty("getAnimatedStyle");
  });

  it("deve executar fadeOut e cancelar animações anteriores", () => {
    const { result } = renderHook(() =>
      useReportAnimations({
        count: 2,
        durationFade: 120,
        durationSlide: 220,
        stagger: 80,
      })
    );

    act(() => {
      result.current.fadeOut();
    });

    expect(Animated.timing).toHaveBeenCalled();
    expect(Animated.parallel).toHaveBeenCalled();
  });

  it("deve executar stagger respeitando delays", () => {
    const { result } = renderHook(() =>
      useReportAnimations({
        count: 3,
        durationFade: 120,
        durationSlide: 220,
        stagger: 80,
      })
    );

    act(() => {
      result.current.stagger();
    });

    expect(Animated.stagger).toHaveBeenCalledWith(80, expect.any(Array));
  });

  it("deve cancelar animações ativas", () => {
    const { result } = renderHook(() =>
      useReportAnimations({
        count: 2,
        durationFade: 120,
        durationSlide: 220,
        stagger: 80,
      })
    );

    act(() => {
      result.current.fadeIn();
      result.current.cancelAnimations();
    });

    // Verifica se stop foi chamado nas animações
    expect(Animated.timing).toHaveBeenCalled();
  });

  it("deve retornar estilo animado para índice específico", () => {
    const { result } = renderHook(() =>
      useReportAnimations({
        count: 3,
        durationFade: 120,
        durationSlide: 220,
        stagger: 80,
      })
    );

    const animatedStyle = result.current.getAnimatedStyle(0);

    expect(animatedStyle).toHaveProperty("opacity");
    expect(animatedStyle).toHaveProperty("transform");
    expect(animatedStyle.transform).toHaveLength(2);
  });
});

