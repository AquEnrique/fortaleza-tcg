import { Directive, HostBinding } from '@angular/core';

// Native <select> styled to match InputDirective. The app has no custom listbox
// primitive, and for plain single-choice dropdowns the native control is the better
// default anyway: it gets mobile's native picker and keyboard behaviour for free.
@Directive({ selector: 'select[appSelect]', standalone: true })
export class SelectDirective {
  @HostBinding('class') readonly hostClass =
    'flex h-10 w-full cursor-pointer appearance-none [color-scheme:dark] rounded-md border border-input bg-background bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat px-3 py-2 pr-8 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm';

  // Chevron drawn as a background image: the only way to replace the native arrow
  // (which `appearance: none` removes) without wrapping the control in an extra element.
  @HostBinding('style.backgroundImage') readonly backgroundImage =
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";
}
