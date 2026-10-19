import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideIcons } from '../../core/icons';
import { TournamentService } from '../../core/services/tournament.service';
import { BreakpointService } from '../../core/services/breakpoint.service';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  requiresRunning: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Torneo', icon: 'Home', requiresRunning: false },
  { href: '/judge', label: 'Vista de Juez', icon: 'Gavel', requiresRunning: true },
  { href: '/genesys-list', label: 'Lista Genesys', icon: 'Coins', requiresRunning: false },
  { href: '/life-points', label: 'Puntos de Vida', icon: 'Heart', requiresRunning: false },
  { href: '/angelechy', label: 'Angelechy', icon: 'Crown', requiresRunning: false },
];

/**
 * Overlay side menu. Rendered fixed above the page on its own layer, so
 * opening/closing it never resizes or shifts the rest of the layout.
 * Closes on outside click (via the backdrop) and after any navigation.
 */
@Component({
  selector: 'app-nav-menu',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, LucideIcons],
  template: `
    <div class="pointer-events-none fixed inset-0 z-40">
      @if (open()) {
        <div class="pointer-events-auto absolute inset-0 bg-black/40 transition-opacity" (click)="close()"></div>
      }

      <aside
        class="pointer-events-auto absolute inset-y-0 left-0 flex h-full w-64 flex-col border-r bg-background shadow-lg transition-transform duration-300 ease-in-out"
        [class.translate-x-0]="open()"
        [class.-translate-x-full]="!open()"
      >
        <div class="border-b p-4">
          <h2 class="text-lg font-semibold text-foreground">Menú</h2>
        </div>
        <nav class="flex flex-col gap-1 p-2">
          @for (item of items(); track item.href) {
            <a
              [routerLink]="item.href"
              routerLinkActive="bg-primary text-primary-foreground"
              [routerLinkActiveOptions]="{ exact: item.href === '/' }"
              (click)="onNavigate()"
              class="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <lucide-icon [name]="item.icon" [size]="20" class="shrink-0" />
              {{ item.label }}
            </a>
          }
        </nav>
      </aside>

      <button
        type="button"
        class="pointer-events-auto absolute top-4 flex h-10 w-6 items-center justify-center rounded-r-md border border-l-0 bg-background shadow-md transition-[left] duration-300 ease-in-out hover:bg-accent"
        [class.left-64]="open()"
        [class.left-0]="!open()"
        [attr.aria-label]="open() ? 'Cerrar menú' : 'Abrir menú'"
        (click)="toggle()"
      >
        <lucide-icon [name]="open() ? 'ChevronsLeft' : 'ChevronsRight'" [size]="16" />
      </button>
    </div>
  `,
})
export class NavMenuComponent {
  private readonly tournament = inject(TournamentService);
  private readonly breakpoint = inject(BreakpointService);

  // Starts closed on both server and first client paint so hydration never has to
  // reconcile a mismatched open/backdrop state (the server can't know the real
  // viewport). Desktop auto-open happens right after, once we're in the browser.
  protected readonly open = signal(false);

  protected readonly items = computed<NavItem[]>(() => {
    const isRunning = this.tournament.tournament()?.status === 'running';
    return NAV_ITEMS.filter((item) => !item.requiresRunning || isRunning);
  });

  constructor() {
    afterNextRender(() => {
      if (!this.breakpoint.isMobile()) {
        this.open.set(true);
      }
    });
  }

  toggle(): void {
    this.open.update((value) => !value);
  }

  close(): void {
    this.open.set(false);
  }

  onNavigate(): void {
    this.close();
  }
}
