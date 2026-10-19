import { Component, computed, inject, input } from '@angular/core';
import { Dialog } from '@angular/cdk/dialog';
import { type GenesysCard } from '../../../core/models/genesys';
import { cardImageUrl, pointsTone } from '../../../core/lib/genesys-card-display';
import { GenesysCardDetailDialogComponent } from '../genesys-card-detail-dialog/genesys-card-detail-dialog.component';

/**
 * One tile in the card grid: art, name, and a points badge. Clicking it opens the full
 * detail in a modal - the tile owns that interaction itself (same pattern as
 * PlayerPanelComponent's keypad), so the grid doesn't have to wire anything per card.
 */
@Component({
  selector: 'app-genesys-card-tile',
  standalone: true,
  templateUrl: './genesys-card-tile.component.html',
})
export class GenesysCardTileComponent {
  readonly card = input.required<GenesysCard>();

  private readonly dialog = inject(Dialog);

  protected readonly imageUrl = computed(() => cardImageUrl(this.card(), 'small'));
  protected readonly pointsClass = computed(() => pointsTone(this.card().points));

  open(): void {
    this.dialog.open<void, GenesysCard>(GenesysCardDetailDialogComponent, {
      data: this.card(),
      panelClass: ['app-genesys-card-panel'],
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
    });
  }
}
