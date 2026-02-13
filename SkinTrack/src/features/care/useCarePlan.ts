import { useCallback, useMemo, useState } from 'react';
import {
  CareInput,
  CareResolved,
  CareSensitivity,
  resolveCarePlan,
} from '../../services/carePlanner';

export type CareFormState = {
  retinolStrength: number;
  retinolFrequency: number;
  acidFrequency: number;
  sensitivity: CareSensitivity;
};

const DEFAULT_STATE: CareFormState = {
  retinolStrength: 1,
  retinolFrequency: 1,
  acidFrequency: 0,
  sensitivity: 2,
};

export function useCarePlan(initial?: Partial<CareFormState>) {
  const [state, setState] = useState<CareFormState>({
    ...DEFAULT_STATE,
    ...initial,
  });

  const resolved: CareResolved = useMemo(() => {
    const input: CareInput = {
      retinolStrength: state.retinolStrength,
      retinolFrequency: state.retinolFrequency,
      acidFrequency: state.acidFrequency,
      sensitivity: state.sensitivity,
    };

    return resolveCarePlan(input);
  }, [state]);

  const setRetinolStrength = useCallback((value: number) => {
    setState(current => ({ ...current, retinolStrength: value }));
  }, []);

  const setRetinolFrequency = useCallback((value: number) => {
    setState(current => ({ ...current, retinolFrequency: value }));
  }, []);

  const setAcidFrequency = useCallback((value: number) => {
    setState(current => ({ ...current, acidFrequency: value }));
  }, []);

  const setSensitivity = useCallback((value: CareSensitivity) => {
    setState(current => ({ ...current, sensitivity: value }));
  }, []);

  const hydrate = useCallback((value: Partial<CareFormState>) => {
    setState(current => {
      const next = {
        ...current,
        ...value,
      };

      if (
        next.retinolStrength === current.retinolStrength &&
        next.retinolFrequency === current.retinolFrequency &&
        next.acidFrequency === current.acidFrequency &&
        next.sensitivity === current.sensitivity
      ) {
        return current;
      }

      return next;
    });
  }, []);

  return {
    state,
    resolved,
    setRetinolStrength,
    setRetinolFrequency,
    setAcidFrequency,
    setSensitivity,
    hydrate,
  };
}
