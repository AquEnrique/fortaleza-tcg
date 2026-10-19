import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import type { GenesysCard, GenesysCardList } from '../models/genesys';
import { collectFacets, indexCards, type GenesysFacets, type IndexedCard } from '../lib/genesys-filter';

/** Served straight out of public/, so it isn't part of any JS bundle. */
const CARDS_URL = 'genesys-cards.json';

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Loads the Genesys point list once per session and keeps it in memory, alongside the
 * derived pieces the list view needs on every keystroke (search index) or render
 * (facets). Browser-only: the file is fetched over HTTP, and the route is prerendered,
 * so on the server this stays in `idle` and the view shows its loading state.
 */
@Injectable({ providedIn: 'root' })
export class GenesysCardsService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private loadStarted = false;

  readonly state = signal<LoadState>('idle');
  readonly cards = signal<GenesysCard[]>([]);
  /** YYYY-MM-DD the list was generated, shown so a stale copy is visible. */
  readonly generatedAt = signal<string | null>(null);

  readonly indexed = computed<IndexedCard[]>(() => indexCards(this.cards()));
  readonly facets = computed<GenesysFacets>(() => collectFacets(this.cards()));
  readonly totalPoints = computed(() => this.cards().reduce((sum, card) => sum + card.points, 0));

  /** Called by the view; safe to call repeatedly, only the first call fetches. */
  async load(): Promise<void> {
    if (!this.isBrowser || this.loadStarted) return;
    this.loadStarted = true;
    await this.fetchCards();
  }

  /** Retry after a failed load (the view offers a button for it). */
  async reload(): Promise<void> {
    if (!this.isBrowser || this.state() === 'loading') return;
    await this.fetchCards();
  }

  private async fetchCards(): Promise<void> {
    this.state.set('loading');
    try {
      const response = await fetch(CARDS_URL, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = (await response.json()) as GenesysCardList;
      if (!Array.isArray(payload?.cards) || payload.cards.length === 0) throw new Error('Respuesta sin cartas');

      this.cards.set(payload.cards);
      this.generatedAt.set(payload.generatedAt ?? null);
      this.state.set('ready');
    } catch (error) {
      console.error('Failed to load the Genesys card list:', error);
      this.state.set('error');
    }
  }
}
