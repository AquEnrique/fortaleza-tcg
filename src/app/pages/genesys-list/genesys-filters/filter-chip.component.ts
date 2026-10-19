import { Component, input, output } from '@angular/core';

/**
 * One toggleable value inside a filter group. There are dozens of these on the panel,
 * so they're deliberately smaller and denser than a real button; `aria-pressed` is what
 * conveys the on/off state, since the styling alone can't.
 */
@Component({
  selector: 'app-filter-chip',
  standalone: true,
  template: `
    <button
      type="button"
      [attr.aria-pressed]="selected()"
      class="rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
      [class]="
        selected()
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
      "
      (click)="toggled.emit()"
    >
      <ng-content />
    </button>
  `,
})
export class FilterChipComponent {
  readonly selected = input(false);
  readonly toggled = output<void>();
}
