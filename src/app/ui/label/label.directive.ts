import { Directive, HostBinding } from '@angular/core';

// Also matches <legend>, which is the label of a <fieldset> - filter groups use it
// so a group of chips is announced with its own name.
@Directive({ selector: 'label[appLabel], legend[appLabel]', standalone: true })
export class LabelDirective {
  @HostBinding('class') readonly hostClass = 'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70';
}
