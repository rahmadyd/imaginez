import type { ClientTemplate } from "@/features/templates/schema";

export type SessionPhase =
  | "idle"
  | "choosing"
  | "permission"
  | "capturing"
  | "reviewing"
  | "done";

export type SessionState = {
  phase: SessionPhase;
  template: ClientTemplate | null;
  photos: (ImageBitmap | null)[];
  activeSlot: number;
  error: string | null;
};

export const initialSessionState: SessionState = {
  phase: "idle",
  template: null,
  photos: [],
  activeSlot: 0,
  error: null,
};

type Transition =
  | { type: "ENTER_CHOOSING" }
  | { type: "SELECT_TEMPLATE"; template: ClientTemplate }
  | { type: "GRANT_PERMISSION" }
  | { type: "START_CAPTURE" }
  | { type: "CAPTURE_PHOTO"; slot: number; photo: ImageBitmap }
  | { type: "CAPTURE_COMPLETE" }
  | { type: "RETAKE_SLOT"; slot: number }
  | { type: "RETAKE_ALL" }
  | { type: "FINISH" }
  | { type: "RESET" }
  | { type: "SET_ERROR"; error: string }
  | { type: "CLEAR_ERROR" };

function slotsCount(state: SessionState): number {
  return state.template?.slots.length ?? 0;
}

export function transition(state: SessionState, action: Transition): SessionState {
  switch (action.type) {
    case "ENTER_CHOOSING":
      if (state.phase === "choosing") {
        return state;
      }
      if (state.phase !== "idle" && state.phase !== "done") {
        throw new Error(`Transisi ilegal: ${state.phase} -> choosing`);
      }
      return { ...initialSessionState, phase: "choosing" };

    case "SELECT_TEMPLATE":
      if (state.phase !== "choosing") {
        throw new Error(`Transisi ilegal: ${state.phase} -> select template`);
      }
      return {
        ...state,
        template: action.template,
        photos: Array.from({ length: action.template.slots.length }, () => null),
        activeSlot: 0,
      };

    case "GRANT_PERMISSION":
      if (state.phase !== "choosing" || !state.template) {
        throw new Error(`Transisi ilegal: ${state.phase} -> permission`);
      }
      return { ...state, phase: "permission", error: null };

    case "START_CAPTURE":
      if (state.phase !== "permission") {
        throw new Error(`Transisi ilegal: ${state.phase} -> capturing`);
      }
      return { ...state, phase: "capturing", activeSlot: 0 };

    case "CAPTURE_PHOTO": {
      if (state.phase !== "capturing") {
        throw new Error(`Transisi ilegal: ${state.phase} -> capture photo`);
      }
      const count = slotsCount(state);
      if (action.slot < 0 || action.slot >= count) {
        throw new Error("Slot di luar rentang");
      }
      const photos = [...state.photos];
      photos[action.slot] = action.photo;
      return { ...state, photos, activeSlot: Math.min(action.slot + 1, count - 1) };
    }

    case "CAPTURE_COMPLETE": {
      if (state.phase !== "capturing") {
        throw new Error(`Transisi ilegal: ${state.phase} -> reviewing`);
      }
      const allFilled = state.photos.length > 0 && state.photos.every((p) => p !== null);
      if (!allFilled) {
        throw new Error("Transisi ilegal: capture belum lengkap");
      }
      return { ...state, phase: "reviewing" };
    }

    case "RETAKE_SLOT": {
      if (state.phase !== "reviewing") {
        throw new Error(`Transisi ilegal: ${state.phase} -> retake slot`);
      }
      if (action.slot < 0 || action.slot >= slotsCount(state)) {
        throw new Error("Slot di luar rentang");
      }
      const photos = [...state.photos];
      photos[action.slot] = null;
      return { ...state, phase: "capturing", activeSlot: action.slot, photos };
    }

    case "RETAKE_ALL":
      if (state.phase !== "reviewing") {
        throw new Error(`Transisi ilegal: ${state.phase} -> retake all`);
      }
      return {
        ...state,
        phase: "capturing",
        photos: Array.from({ length: slotsCount(state) }, () => null),
        activeSlot: 0,
      };

    case "FINISH":
      if (state.phase !== "reviewing" && state.phase !== "capturing") {
        throw new Error(`Transisi ilegal: ${state.phase} -> done`);
      }
      return { ...initialSessionState, phase: "done" };

    case "RESET":
      return { ...initialSessionState };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "CLEAR_ERROR":
      return { ...state, error: null };

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
