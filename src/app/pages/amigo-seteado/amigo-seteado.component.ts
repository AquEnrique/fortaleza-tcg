import { Component, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonDirective } from '../../ui/button/button.directive';
import { InputDirective } from '../../ui/input/input.directive';
import { LucideIcons } from '../../core/icons';

const BASE_URL = 'https://fortaleza-tcg-default-rtdb.firebaseio.com/amigo-secreto';
const CODE_LENGTH = 8;

interface Assignment {
  persona: string;
  destinatario: string;
}

interface FloatingName {
  name: string;
  left: number;
  top: number;
  delay: number;
  duration: number;
}

type Phase = 'idle' | 'loading' | 'leaving' | 'revealed';

// Codes are stored uppercase; input is normalized so lookup is case-insensitive.
export function normalizeCode(raw: string): string {
  return raw.replace(/[^a-z0-9]/gi, '').toUpperCase();
}

@Component({
  selector: 'app-amigo-seteado',
  standalone: true,
  imports: [FormsModule, ButtonDirective, InputDirective, LucideIcons],
  templateUrl: './amigo-seteado.component.html',
  styles: `
    @keyframes float {
      0%, 100% { transform: translate(-50%, -50%) translateY(0) rotate(-3deg); }
      50% { transform: translate(-50%, -50%) translateY(-18px) rotate(3deg); }
    }
    @keyframes vanish {
      to { opacity: 0; transform: translate(-50%, -50%) scale(0.2) rotate(20deg); filter: blur(6px); }
    }
    @keyframes pop {
      0% { opacity: 0; transform: scale(0.6) translateY(20px); }
      70% { opacity: 1; transform: scale(1.08) translateY(0); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-6px); }
      75% { transform: translateX(6px); }
    }
    .floating { animation: float var(--dur) ease-in-out var(--delay) infinite; }
    .floating.leaving { animation: vanish 0.6s ease-in var(--leave-delay) forwards; }
    .pop { animation: pop 0.6s ease-out both; }
    .shake { animation: shake 0.3s ease-in-out 2; }
    .xmas-green { color: #1f9d4a; text-shadow: 0 0 18px rgb(31 157 74 / 0.45); }
    .xmas-red { color: #d62839; text-shadow: 0 0 18px rgb(214 40 57 / 0.45); }
  `,
})
export class AmigoSeteadoComponent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly codeLength = CODE_LENGTH;
  protected readonly names = signal<FloatingName[]>([]);
  protected readonly phase = signal<Phase>('idle');
  protected readonly result = signal<Assignment | null>(null);
  protected readonly error = signal<string | null>(null);
  protected code = '';

  constructor() {
    if (this.isBrowser) this.loadParticipants();
  }

  private async loadParticipants(): Promise<void> {
    try {
      const response = await fetch(`${BASE_URL}/participantes.json`, { signal: AbortSignal.timeout(10000) });
      const list: unknown = response.ok ? await response.json() : null;
      if (!Array.isArray(list)) return;
      this.names.set(
        list.map((name: string, i) => {
          // Spread names on a loose grid with jitter so they don't pile up.
          const cols = 3;
          const rows = Math.ceil(list.length / cols);
          return {
            name,
            left: ((i % cols) + 0.5) * (100 / cols) + (Math.random() * 12 - 6),
            top: (Math.floor(i / cols) + 0.5) * (100 / rows) + (Math.random() * 6 - 3),
            delay: -Math.random() * 4,
            duration: 3 + Math.random() * 3,
          };
        }),
      );
    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  }

  protected async reveal(): Promise<void> {
    const code = normalizeCode(this.code);
    this.error.set(null);
    if (code.length !== CODE_LENGTH) {
      this.error.set(`El código debe tener ${CODE_LENGTH} caracteres.`);
      return;
    }

    this.phase.set('loading');
    try {
      const response = await fetch(`${BASE_URL}/codigos/${code}.json`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      });
      const data = (response.ok ? await response.json() : null) as Assignment | null;
      if (!data?.persona || !data?.destinatario) {
        this.phase.set('idle');
        this.error.set('Código no válido.');
        return;
      }
      this.result.set(data);
      this.phase.set('leaving');
      // Wait for the floating names to vanish before showing the pairing.
      setTimeout(() => this.phase.set('revealed'), 600 + this.names().length * 40);
    } catch (error) {
      console.error('Failed to look up code:', error);
      this.phase.set('idle');
      this.error.set('No se pudo conectar. Intenta de nuevo.');
    }
  }

  protected reset(): void {
    this.code = '';
    this.result.set(null);
    this.error.set(null);
    this.phase.set('idle');
  }
}
