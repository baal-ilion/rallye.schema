import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <header class="app-header">
      <div>
        <strong>Rallye Schéma</strong>
        <span>Concepteur de formulaires</span>
      </div>
      <small>Service indépendant – prototype</small>
    </header>
    <app-form-designer></app-form-designer>
  `,
  styles: [`
    .app-header { display:flex; justify-content:space-between; align-items:center; padding:.8rem 1.5rem; background:#263238; color:white; }
    .app-header strong { margin-right:1rem; }
    .app-header span { opacity:.85; }
  `]
})
export class AppComponent {}
