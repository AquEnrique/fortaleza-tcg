import { Component, inject } from '@angular/core';
import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { BadgeDirective } from '../../../ui/badge/badge.directive';
import { ButtonDirective } from '../../../ui/button/button.directive';
import { LucideIcons } from '../../../core/icons';
import {
  DialogCloseButtonComponent,
  DialogDescriptionDirective,
  DialogFooterDirective,
  DialogHeaderDirective,
  DialogTitleDirective,
} from '../../../ui/dialog/dialog-parts';
import { BAN_LABELS, type GenesysCard } from '../../../core/models/genesys';
import {
  cardAtkLabel,
  cardAttributeLabel,
  cardDefLabel,
  cardImageUrl,
  cardLevelLabel,
  cardSubtitle,
  cardTraits,
  cardYgoprodeckUrl,
  pointsTone,
} from '../../../core/lib/genesys-card-display';

/**
 * Full detail for one card, opened from a grid tile. Shown as a CDK dialog rather than
 * an in-place expansion so the grid stays dense and every card gets the same amount of
 * room for its text regardless of what its neighbors are.
 *
 * `card` is injected once and never changes for the dialog's lifetime, so everything
 * derived from it is computed once as a plain field instead of an Angular `computed()`.
 */
@Component({
  selector: 'app-genesys-card-detail-dialog',
  standalone: true,
  imports: [
    BadgeDirective,
    ButtonDirective,
    LucideIcons,
    DialogCloseButtonComponent,
    DialogHeaderDirective,
    DialogTitleDirective,
    DialogDescriptionDirective,
    DialogFooterDirective,
  ],
  templateUrl: './genesys-card-detail-dialog.component.html',
})
export class GenesysCardDetailDialogComponent {
  protected readonly card = inject<GenesysCard>(DIALOG_DATA);
  protected readonly dialogRef = inject(DialogRef);

  protected readonly banLabels = BAN_LABELS;
  protected readonly imageUrl = cardImageUrl(this.card, 'full');
  protected readonly subtitle = cardSubtitle(this.card);
  protected readonly attributeLabel = cardAttributeLabel(this.card);
  protected readonly levelLabel = cardLevelLabel(this.card);
  protected readonly atk = cardAtkLabel(this.card);
  protected readonly def = cardDefLabel(this.card);
  protected readonly traits = cardTraits(this.card);
  protected readonly ygoprodeckUrl = cardYgoprodeckUrl(this.card);
  protected readonly pointsClass = pointsTone(this.card.points);
}
