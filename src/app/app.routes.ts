import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/tournament/tournament.component').then((m) => m.TournamentComponent),
  },
  {
    path: 'judge',
    loadComponent: () => import('./pages/judge/judge.component').then((m) => m.JudgeComponent),
  },
  {
    path: 'life-points',
    loadComponent: () => import('./pages/life-points/life-points.component').then((m) => m.LifePointsComponent),
  },
  {
    path: 'angelechy',
    loadComponent: () => import('./pages/angelechy/angelechy.component').then((m) => m.AngelechyComponent),
  },
  {
    path: 'amigo-seteado',
    loadComponent: () => import('./pages/amigo-seteado/amigo-seteado.component').then((m) => m.AmigoSeteadoComponent),
  },
  { path: '**', redirectTo: '' },
];
