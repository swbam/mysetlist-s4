import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";

expect.extend(toHaveNoViolations);

export async function testAccessibility(component: React.ReactElement) {
  const { container } = render(component);
  const results = await axe(container);

  expect(results).toHaveNoViolations();

  return results;
}

export function assertKeyboardNavigable(element: HTMLElement) {
  // Check if element is focusable
  const focusableElements = element.querySelectorAll(
    'a[href], button, textarea, input[type="text"], input[type="radio"], input[type="checkbox"], select',
  );

  focusableElements.forEach((el) => {
    expect(el).toHaveAttribute("tabindex", expect.stringMatching(/^-?\d+$/));
  });
}

export function assertARIACompliant(element: HTMLElement) {
  // Check for proper ARIA labels
  const interactiveElements = element.querySelectorAll(
    "button, a, input, select, textarea",
  );

  interactiveElements.forEach((el) => {
    const hasLabel =
      el.hasAttribute("aria-label") ||
      el.hasAttribute("aria-labelledby") ||
      el.textContent?.trim() ||
      (el as HTMLInputElement).labels?.length > 0;

    expect(hasLabel).toBeTruthy();
  });

  // Check for proper heading hierarchy
  const headings = Array.from(
    element.querySelectorAll("h1, h2, h3, h4, h5, h6"),
  );
  let previousLevel = 0;

  headings.forEach((heading) => {
    const level = Number.parseInt(heading.tagName[1]);
    expect(level - previousLevel).toBeLessThanOrEqual(1);
    previousLevel = level;
  });
}

export function assertColorContrast(element: HTMLElement) {
  // This is a simplified check - in real implementation, use axe-core
  const elementsWithText = element.querySelectorAll("*");

  elementsWithText.forEach((el) => {
    if (el.textContent?.trim()) {
      const styles = window.getComputedStyle(el);
      const color = styles.color;
      const backgroundColor = styles.backgroundColor;

      // Basic check - ensure text and background colors are defined
      expect(color).toBeTruthy();
      expect(backgroundColor).toBeTruthy();
    }
  });
}
