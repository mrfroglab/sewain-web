"use client";

// The whole wizard state lives in one reducer: the draft, the current step, how far the provider
// has got, and which steps already tried "Lanjut" (errors show only after the first attempt).

import { useCallback, useMemo, useReducer } from "react";
import { AREA_BY_ID } from "@/lib/data/areas";
import type { AreaId, CollateralKind, CollateralOption, CollateralRules, GeoPoint, ID } from "@/lib/types";
import { PREVIEW, blankOption, newOptionId, validateStep, type Errors, type ListingDraft, type ValidationContext } from "./draft";

interface FormState {
  draft: ListingDraft;
  step: number;
  /** furthest step the provider may jump to from the stepper */
  maxStep: number;
  attempted: boolean[];
}

type Action =
  | { type: "set"; patch: Partial<ListingDraft> }
  | { type: "area"; areaId: AreaId }
  | { type: "point"; point: GeoPoint; areaId: AreaId }
  | { type: "addOption"; kind: CollateralKind; rules: CollateralRules }
  | { type: "updateOption"; id: ID; patch: Partial<CollateralOption> }
  | { type: "removeOption"; id: ID }
  | { type: "applyPreset"; preset: Omit<CollateralOption, "id">[] }
  | { type: "goto"; step: number }
  | { type: "attempt"; step: number };

function reducer(s: FormState, a: Action): FormState {
  const draft = (patch: Partial<ListingDraft>): FormState => ({ ...s, draft: { ...s.draft, ...patch } });
  switch (a.type) {
    case "set":
      return draft(a.patch);
    case "area": {
      const area = AREA_BY_ID[a.areaId];
      return draft({ areaId: a.areaId, point: { lat: area.lat, lng: area.lng } });
    }
    case "point":
      return draft({ point: a.point, areaId: a.areaId });
    case "addOption":
      return draft({ collateral: [...s.draft.collateral, blankOption(a.kind, a.rules)] });
    case "updateOption":
      return draft({ collateral: s.draft.collateral.map((o) => (o.id === a.id ? { ...o, ...a.patch } : o)) });
    case "removeOption":
      return draft({ collateral: s.draft.collateral.filter((o) => o.id !== a.id) });
    case "applyPreset":
      return draft({ collateral: a.preset.map((p) => ({ ...p, cards: p.cards ? [...p.cards] : undefined, id: newOptionId() })) });
    case "goto": {
      const step = Math.max(0, Math.min(PREVIEW, a.step));
      return { ...s, step, maxStep: Math.max(s.maxStep, step) };
    }
    case "attempt": {
      const attempted = [...s.attempted];
      attempted[a.step] = true;
      return { ...s, attempted };
    }
  }
}

export function useListingForm(initial: ListingDraft, opts: { editing: boolean; ctx: ValidationContext }) {
  const [state, dispatch] = useReducer(reducer, null, () => ({
    draft: initial,
    step: 0,
    // Editing a complete listing: every step is reachable right away.
    maxStep: opts.editing ? PREVIEW : 0,
    attempted: [],
  }));
  const { draft, step, maxStep, attempted } = state;
  const { ctx } = opts;

  const errors: Errors = useMemo(() => (step < PREVIEW ? validateStep(step, draft, ctx) : {}), [step, draft, ctx]);
  const showErrors = !!attempted[step];

  const set = useCallback((patch: Partial<ListingDraft>) => dispatch({ type: "set", patch }), []);

  /** Validates the current step; moves on when valid. Returns the errors (empty = moved). */
  const next = useCallback((): Errors => {
    if (step >= PREVIEW) return {};
    const e = validateStep(step, draft, ctx);
    if (Object.keys(e).length) {
      dispatch({ type: "attempt", step });
      return e;
    }
    dispatch({ type: "goto", step: step + 1 });
    return e;
  }, [step, draft, ctx]);

  /** First step (up to `upTo`) that does not validate, or -1. */
  const firstInvalid = useCallback(
    (upTo = PREVIEW - 1) => {
      for (let i = 0; i <= upTo; i++) if (Object.keys(validateStep(i, draft, ctx)).length) return i;
      return -1;
    },
    [draft, ctx],
  );

  return {
    draft,
    step,
    maxStep,
    errors,
    /** errors to render inline (only after the provider pressed "Lanjut" on this step) */
    visibleErrors: showErrors ? errors : ({} as Errors),
    set,
    dispatch,
    next,
    back: () => dispatch({ type: "goto", step: step - 1 }),
    goto: (s: number) => dispatch({ type: "goto", step: s }),
    markAttempted: (s: number) => dispatch({ type: "attempt", step: s }),
    firstInvalid,
  };
}

export type ListingForm = ReturnType<typeof useListingForm>;
