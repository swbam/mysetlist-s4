// React Event Types
import type { ChangeEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";

// Button click events
export type ButtonClickEvent = MouseEvent<HTMLButtonElement>;
export type DivClickEvent = MouseEvent<HTMLDivElement>;
export type AnchorClickEvent = MouseEvent<HTMLAnchorElement>;

// Form events
export type InputChangeEvent = ChangeEvent<HTMLInputElement>;
export type TextAreaChangeEvent = ChangeEvent<HTMLTextAreaElement>;
export type SelectChangeEvent = ChangeEvent<HTMLSelectElement>;
export type FormSubmitEvent = FormEvent<HTMLFormElement>;

// Keyboard events
export type InputKeyboardEvent = KeyboardEvent<HTMLInputElement>;
export type TextAreaKeyboardEvent = KeyboardEvent<HTMLTextAreaElement>;

// Generic handlers
export type ClickHandler<T = HTMLElement> = (event: MouseEvent<T>) => void;
export type ChangeHandler<T = HTMLInputElement> = (
  event: ChangeEvent<T>,
) => void;
export type SubmitHandler = (event: FormSubmitEvent) => void;
export type KeyboardHandler<T = HTMLElement> = (
  event: KeyboardEvent<T>,
) => void;
